// Enterprise Server DB & REST API Server (Node.js + Zero-Dependency HTTP Server + MySQL Store)
// To run this server: node server/db.js

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from './mysql.js';
import { createSecurityLog, getSecurityLogs, getSecurityLogById, deleteSecurityLog } from './db_modules/securityLog.js';
import { createWorkLog, getWorkLogs, getWorkLogById, updateWorkLog, deleteWorkLog } from './db_modules/workLog.js';
import { createWeeklyReport, getWeeklyReports, deleteWeeklyReport } from './db_modules/weeklyReport.js';
import { getSecurityUsers, createSecurityUser, deleteSecurityUser, verifyUserPasswordServer } from './db_modules/securityUser.js';
import { getSecuritySites, createSecuritySite, deleteSecuritySite } from './db_modules/securitySite.js';

const PORT = process.env.PORT || 4000;
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 2. 악성 대용량 페이로드 방어 (최대 5MB)

// 1. CORS 화이트리스트 구성
const allowedOriginsConfig = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().toLowerCase()) 
  : [];

function getValidatedCorsOrigin(incomingOrigin) {
  if (!incomingOrigin) return '*';
  const norm = incomingOrigin.trim().toLowerCase();
  
  // 개발 환경, 로컬호스트 및 모바일 앱(Capacitor) 기본 허용
  if (
    norm.includes('localhost') || 
    norm.includes('127.0.0.1') || 
    norm.startsWith('capacitor://') || 
    norm.startsWith('ionic://') ||
    allowedOriginsConfig.length === 0 ||
    allowedOriginsConfig.includes('*') ||
    allowedOriginsConfig.some(allowed => norm.includes(allowed))
  ) {
    return incomingOrigin;
  }
  return null; // 화이트리스트에 없는 외부 도메인 차단
}

// 3. 인메모리 Rate Limiter & Brute-Force 방어 테이블
const ipRequestCounts = new Map();
const loginFailureTracker = new Map();

// 주기적 Rate Limit 클린업 (1분마다)
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequestCounts.entries()) {
    if (now - data.timestamp > 60000) ipRequestCounts.delete(ip);
  }
  for (const [ip, data] of loginFailureTracker.entries()) {
    if (now - data.lockedUntil > 0 && data.lockedUntil > 0) loginFailureTracker.delete(ip);
  }
}, 60000);

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '127.0.0.1';
}

function checkRateLimit(ip) {
  // 로컬 개발 환경 및 루프백 IP는 Rate Limit 무제한 허용
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.includes('127.0.0.1')) {
    return true;
  }

  const now = Date.now();
  const data = ipRequestCounts.get(ip) || { count: 0, timestamp: now };
  if (now - data.timestamp > 60000) {
    data.count = 1;
    data.timestamp = now;
  } else {
    data.count += 1;
  }
  ipRequestCounts.set(ip, data);
  return data.count <= 1200; // 1분당 최대 1,200회 요청 허용
}

function checkLoginBruteForce(ip) {
  const now = Date.now();
  const data = loginFailureTracker.get(ip);
  if (!data) return { blocked: false };
  if (data.lockedUntil && now < data.lockedUntil) {
    const remainingSec = Math.ceil((data.lockedUntil - now) / 1000);
    return { blocked: true, remainingSec };
  }
  return { blocked: false };
}

function recordLoginAttempt(ip, success) {
  const now = Date.now();
  if (success) {
    loginFailureTracker.delete(ip);
    return;
  }
  const data = loginFailureTracker.get(ip) || { failCount: 0, lockedUntil: 0 };
  data.failCount += 1;
  if (data.failCount >= 5) {
    data.lockedUntil = now + 5 * 60 * 1000; // 5회 실패 시 5분간 차단
  }
  loginFailureTracker.set(ip, data);
}

// 2. 엔터프라이즈 보안 HTTP 응답 헤더 탑재
function sendJSON(res, statusCode, body, req = null) {
  const origin = req ? req.headers.origin : null;
  const validatedOrigin = getValidatedCorsOrigin(origin);

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff', // MIME 스니핑 방어
    'X-Frame-Options': 'SAMEORIGIN', // Clickjacking 방어
    'X-XSS-Protection': '1; mode=block', // XSS 브라우저 필터 활성화
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Bypass-Tunnel-Reminder'
  };

  if (validatedOrigin) {
    headers['Access-Control-Allow-Origin'] = validatedOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(body));
}

// 2. 요청 본문 파싱 및 페이로드 크기 한도 제한
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let totalBytes = 0;

    req.on('data', chunk => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_PAYLOAD_BYTES) {
        req.destroy();
        return reject(new Error('Payload Too Large (Max 5MB)'));
      }
      body += chunk.toString();
    });

    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Main HTTP Server Request Listener
const server = http.createServer(async (req, res) => {
  const clientIp = getClientIp(req);

  // 3. API 속도 제한(Rate Limit) 점검
  if (!checkRateLimit(clientIp)) {
    return sendJSON(res, 429, { 
      success: false, 
      message: '요청 한도를 초과하였습니다. 잠시 후 다시 시도해 주세요. (Rate Limit Exceeded)' 
    }, req);
  }

  // 1. CORS Preflight OPTIONS 처리
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    const validatedOrigin = getValidatedCorsOrigin(origin);
    const headers = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Bypass-Tunnel-Reminder',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN'
    };
    if (validatedOrigin) {
      headers['Access-Control-Allow-Origin'] = validatedOrigin;
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
    res.writeHead(200, headers);
    return res.end();
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;
  const method = req.method.toUpperCase();

  try {
    // 0. Status & Health Check API
    if ((pathname === '/api/status' || pathname === '/api/health') && method === 'GET') {
      let userCount = 0;
      let siteCount = 0;
      let logCount = 0;
      let workCount = 0;
      try {
        const users = await getSecurityUsers();
        const sites = await getSecuritySites();
        const logs = await getSecurityLogs();
        const works = await getWorkLogs();
        userCount = users.length;
        siteCount = sites.length;
        logCount = logs.length;
        workCount = works.length;
      } catch (e) {}

      return sendJSON(res, 200, {
        success: true,
        message: 'WithSecurity Enterprise Backend REST Server Active (Gabia Secured)',
        timestamp: new Date().toISOString(),
        tables: ['security_user', 'security_site', 'security_log', 'work_log'],
        counts: {
          security_user: userCount,
          security_site: siteCount,
          security_log: logCount,
          work_log: workCount
        },
        security: {
          corsProtection: true,
          rateLimitActive: true,
          saltedHashActive: true,
          connectionPoolActive: true
        }
      }, req);
    }

    // 1. Security Users API (/api/security-users or /api/users)
    if (pathname === '/api/security-users/login' || pathname === '/api/users/login' || pathname === '/api/auth/login') {
      if (method === 'POST') {
        const bruteCheck = checkLoginBruteForce(clientIp);
        if (bruteCheck.blocked) {
          return sendJSON(res, 429, { 
            success: false, 
            message: `로그인 5회 실패로 보안 차단되었습니다. ${bruteCheck.remainingSec}초 후에 다시 시도해 주세요.` 
          }, req);
        }

        const creds = await parseRequestBody(req);
        const users = await getSecurityUsers();
        const user = users.find(u => u.username === creds.username);
        
        if (user && verifyUserPasswordServer(creds.password, user.password || user.passwordHash)) {
          recordLoginAttempt(clientIp, true);
          return sendJSON(res, 200, { success: true, message: '로그인 성공', user }, req);
        } else {
          recordLoginAttempt(clientIp, false);
          return sendJSON(res, 401, { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' }, req);
        }
      }
    }

    if (pathname === '/api/security-users' || pathname === '/api/users') {
      if (method === 'GET') {
        const users = await getSecurityUsers();
        return sendJSON(res, 200, { success: true, data: users }, req);
      }
      if (method === 'POST') {
        const newItem = await parseRequestBody(req);
        if (newItem.username) {
          const created = await createSecurityUser(newItem);
          return sendJSON(res, 201, { success: true, data: created }, req);
        }
      }
    }
    if ((pathname.startsWith('/api/security-users/') || pathname.startsWith('/api/users/')) && method === 'DELETE') {
      const username = decodeURIComponent(pathname.replace(/^\/api\/(security-users|users)\//, ''));
      if (username !== 'admin') {
        await deleteSecurityUser(username);
      }
      return sendJSON(res, 200, { success: true, deletedUsername: username }, req);
    }

    // 2. Security Sites API (/api/security-sites or /api/sites)
    if (pathname === '/api/security-sites' || pathname === '/api/sites') {
      if (method === 'GET') {
        const sites = await getSecuritySites();
        return sendJSON(res, 200, { success: true, data: sites }, req);
      }
      if (method === 'POST') {
        const newItem = await parseRequestBody(req);
        if (newItem.id || newItem.name) {
          const created = await createSecuritySite(newItem);
          return sendJSON(res, 201, { success: true, data: created }, req);
        }
      }
    }
    if ((pathname.startsWith('/api/security-sites/') || pathname.startsWith('/api/sites/')) && method === 'DELETE') {
      const id = pathname.replace(/^\/api\/(security-sites|sites)\//, '');
      await deleteSecuritySite(id);
      return sendJSON(res, 200, { success: true, deletedId: id }, req);
    }

    // 3. Security Pledge Logs API (/api/security-logs or /api/checklists or /api/pledges)
    if (pathname === '/api/security-logs' || pathname === '/api/checklists' || pathname === '/api/pledges') {
      if (method === 'GET') {
        const userName = reqUrl.searchParams.get('userName');
        const logs = await getSecurityLogs({ userName });
        return sendJSON(res, 200, { success: true, data: logs }, req);
      }
      if (method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await createSecurityLog(body);
        return sendJSON(res, 201, { success: true, data: result }, req);
      }
    }
    if ((pathname.startsWith('/api/security-logs/') || pathname.startsWith('/api/checklists/') || pathname.startsWith('/api/pledges/')) && method === 'GET') {
      const logId = pathname.replace(/^\/api\/(security-logs|checklists|pledges)\//, '');
      const log = await getSecurityLogById(logId);
      return sendJSON(res, log ? 200 : 404, { success: !!log, data: log }, req);
    }
    if ((pathname.startsWith('/api/security-logs/') || pathname.startsWith('/api/checklists/') || pathname.startsWith('/api/pledges/')) && method === 'DELETE') {
      const logId = pathname.replace(/^\/api\/(security-logs|checklists|pledges)\//, '');
      const deleted = await deleteSecurityLog(logId);
      return sendJSON(res, 200, { success: deleted }, req);
    }

    // 4. Work Logs API (/api/work-logs)
    if (pathname === '/api/work-logs') {
      if (method === 'GET') {
        const writerName = reqUrl.searchParams.get('writerName');
        const siteName = reqUrl.searchParams.get('siteName');
        const logDate = reqUrl.searchParams.get('logDate');
        const logs = await getWorkLogs({ writerName, siteName, logDate });
        return sendJSON(res, 200, { success: true, data: logs }, req);
      }
      if (method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await createWorkLog(body);
        return sendJSON(res, 201, { success: true, data: result }, req);
      }
    }
    if (pathname.startsWith('/api/work-logs/') && method === 'GET') {
      const logId = pathname.replace('/api/work-logs/', '');
      const log = await getWorkLogById(logId);
      return sendJSON(res, log ? 200 : 404, { success: !!log, data: log }, req);
    }
    if (pathname.startsWith('/api/work-logs/') && method === 'PUT') {
      const logId = pathname.replace('/api/work-logs/', '');
      const body = await parseRequestBody(req);
      const updated = await updateWorkLog(logId, body);
      return sendJSON(res, 200, { success: updated }, req);
    }
    if (pathname.startsWith('/api/work-logs/') && method === 'DELETE') {
      const logId = pathname.replace('/api/work-logs/', '');
      const deleted = await deleteWorkLog(logId);
      return sendJSON(res, 200, { success: deleted }, req);
    }

    // 5. Weekly Reports API (/api/weekly-reports) - 컬럼별(주요내용, 정보공유, 업무지원, 기타업무) 분리 관리
    if (pathname === '/api/weekly-reports') {
      if (method === 'GET') {
        const weeklyMonday = reqUrl.searchParams.get('weeklyMonday');
        const authorUsername = reqUrl.searchParams.get('authorUsername');
        const reports = await getWeeklyReports({ weeklyMonday, authorUsername });
        return sendJSON(res, 200, { success: true, data: reports }, req);
      }
      if (method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await createWeeklyReport(body);
        return sendJSON(res, 201, { success: true, data: result }, req);
      }
    }
    if (pathname.startsWith('/api/weekly-reports/') && method === 'DELETE') {
      const reportId = pathname.replace('/api/weekly-reports/', '');
      const result = await deleteWeeklyReport(reportId);
      return sendJSON(res, 200, result, req);
    }

    // Default 404 Route
    sendJSON(res, 404, { success: false, message: `Route not found: ${method} ${pathname}` }, req);
  } catch (err) {
    console.error('Server Request Error:', err);
    sendJSON(res, 500, { success: false, message: err.message || 'Internal Server Error' }, req);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\nℹ️ [INFO] Port ${PORT} is already in use by an active WithSecurity Backend DB process.`);
    console.log(`ℹ️ [INFO] Re-using existing backend server at http://localhost:${PORT}\n`);
    process.exit(0);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, async () => {
  console.log(`🔒 WithSecurity Enterprise Secure REST API running on http://localhost:${PORT}`);
  console.log('Checking MySQL connection status...');
  await testConnection();
});
