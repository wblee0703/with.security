// Enterprise Server DB & REST API Server (Node.js + Zero-Dependency HTTP Server + MySQL Store)
// To run this server: node server/db.js

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from './mysql.js';
import { createSecurityLog, getSecurityLogs, getSecurityLogById, deleteSecurityLog } from './db_modules/securityLog.js';
import { createWorkLog, getWorkLogs, getWorkLogById, updateWorkLog, deleteWorkLog } from './db_modules/workLog.js';
import { getSecurityUsers, createSecurityUser, deleteSecurityUser } from './db_modules/securityUser.js';
import { getSecuritySites, createSecuritySite, deleteSecuritySite } from './db_modules/securitySite.js';

const PORT = process.env.PORT || 4000;

// Helper to set CORS and JSON Headers
function sendJSON(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });
  res.end(JSON.stringify(body));
}

// Request Helper to parse JSON body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
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
  // Handle CORS Preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    });
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
        message: 'WithSecurity Enterprise Backend REST Server Active (MySQL Pure)',
        timestamp: new Date().toISOString(),
        tables: ['security_user', 'security_site', 'security_log', 'work_log'],
        counts: {
          security_user: userCount,
          security_site: siteCount,
          security_log: logCount,
          work_log: workCount
        }
      });
    }

    // 1. Security Users API (/api/security-users or /api/users)
    if (pathname === '/api/security-users' || pathname === '/api/users') {
      if (method === 'GET') {
        const users = await getSecurityUsers();
        return sendJSON(res, 200, { success: true, data: users });
      }
      if (method === 'POST') {
        const newItem = await parseRequestBody(req);
        if (newItem.username) {
          const created = await createSecurityUser(newItem);
          return sendJSON(res, 201, { success: true, data: created });
        }
      }
    }
    if ((pathname.startsWith('/api/security-users/') || pathname.startsWith('/api/users/')) && method === 'DELETE') {
      const username = decodeURIComponent(pathname.replace(/^\/api\/(security-users|users)\//, ''));
      if (username !== 'admin') {
        await deleteSecurityUser(username);
      }
      return sendJSON(res, 200, { success: true, deletedUsername: username });
    }

    // 2. Security Sites API (/api/security-sites or /api/sites)
    if (pathname === '/api/security-sites' || pathname === '/api/sites') {
      if (method === 'GET') {
        const sites = await getSecuritySites();
        return sendJSON(res, 200, { success: true, data: sites });
      }
      if (method === 'POST') {
        const newItem = await parseRequestBody(req);
        if (newItem.id) {
          const created = await createSecuritySite(newItem);
          return sendJSON(res, 201, { success: true, data: created });
        }
      }
    }
    if ((pathname.startsWith('/api/security-sites/') || pathname.startsWith('/api/sites/')) && method === 'DELETE') {
      const id = pathname.replace(/^\/api\/(security-sites|sites)\//, '');
      await deleteSecuritySite(id);
      return sendJSON(res, 200, { success: true, deletedId: id });
    }

    // 3. Security Pledge Logs API (/api/security-logs or /api/checklists or /api/pledges)
    if (pathname === '/api/security-logs' || pathname === '/api/checklists' || pathname === '/api/pledges') {
      if (method === 'GET') {
        const userName = reqUrl.searchParams.get('userName');
        const logs = await getSecurityLogs({ userName });
        return sendJSON(res, 200, { success: true, data: logs });
      }
      if (method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await createSecurityLog(body);
        return sendJSON(res, 201, { success: true, data: result });
      }
    }
    if ((pathname.startsWith('/api/security-logs/') || pathname.startsWith('/api/checklists/') || pathname.startsWith('/api/pledges/')) && method === 'GET') {
      const logId = pathname.replace(/^\/api\/(security-logs|checklists|pledges)\//, '');
      const log = await getSecurityLogById(logId);
      return sendJSON(res, log ? 200 : 404, { success: !!log, data: log });
    }
    if ((pathname.startsWith('/api/security-logs/') || pathname.startsWith('/api/checklists/') || pathname.startsWith('/api/pledges/')) && method === 'DELETE') {
      const logId = pathname.replace(/^\/api\/(security-logs|checklists|pledges)\//, '');
      const deleted = await deleteSecurityLog(logId);
      return sendJSON(res, 200, { success: deleted });
    }

    // 4. Work Logs API (/api/work-logs)
    if (pathname === '/api/work-logs') {
      if (method === 'GET') {
        const writerName = reqUrl.searchParams.get('writerName');
        const siteName = reqUrl.searchParams.get('siteName');
        const logDate = reqUrl.searchParams.get('logDate');
        const logs = await getWorkLogs({ writerName, siteName, logDate });
        return sendJSON(res, 200, { success: true, data: logs });
      }
      if (method === 'POST') {
        const body = await parseRequestBody(req);
        const result = await createWorkLog(body);
        return sendJSON(res, 201, { success: true, data: result });
      }
    }
    if (pathname.startsWith('/api/work-logs/') && method === 'GET') {
      const logId = pathname.replace('/api/work-logs/', '');
      const log = await getWorkLogById(logId);
      return sendJSON(res, log ? 200 : 404, { success: !!log, data: log });
    }
    if (pathname.startsWith('/api/work-logs/') && method === 'PUT') {
      const logId = pathname.replace('/api/work-logs/', '');
      const body = await parseRequestBody(req);
      const updated = await updateWorkLog(logId, body);
      return sendJSON(res, 200, { success: updated });
    }
    if (pathname.startsWith('/api/work-logs/') && method === 'DELETE') {
      const logId = pathname.replace('/api/work-logs/', '');
      const deleted = await deleteWorkLog(logId);
      return sendJSON(res, 200, { success: deleted });
    }

    // Default 404 Route
    sendJSON(res, 404, { success: false, message: `Route not found: ${method} ${pathname}` });
  } catch (err) {
    console.error('Server Request Error:', err);
    sendJSON(res, 500, { success: false, message: err.message || 'Internal Server Error' });
  }
});

server.listen(PORT, async () => {
  console.log(`WithSecurity Enterprise Database REST API running on http://localhost:${PORT}`);
  console.log('Checking MySQL connection status...');
  await testConnection();
});
