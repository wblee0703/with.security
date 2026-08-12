// Enterprise Server DB & REST API Server (Node.js + Zero-Dependency HTTP Server + MySQL Store)
// To run this server: node server/db.js

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection, query } from './mysql.js';
import { createSecurityLog, getSecurityLogs, getSecurityLogById, deleteSecurityLog } from './db_modules/securityLog.js';
import { createWorkLog, getWorkLogs, getWorkLogById, updateWorkLog, deleteWorkLog } from './db_modules/workLog.js';
import { getSecurityUsers, createSecurityUser, deleteSecurityUser } from './db_modules/securityUser.js';
import { getSecuritySites, createSecuritySite, deleteSecuritySite } from './db_modules/securitySite.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const DB_FILE = path.join(__dirname, 'security_database.json');

// In-Memory Fallback Data Store
let dbData = {
  sites: [],
  users: []
};

// Initialize / Load Database
function initDB() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      dbData = {
        sites: Array.isArray(fileData.sites) ? fileData.sites : [],
        users: Array.isArray(fileData.users) ? fileData.users : []
      };
    } catch (err) {
      console.error('Error reading local DB file:', err);
    }
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save DB file:', err);
  }
}

// Perform initial DB setup
initDB();

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
      let userCount = dbData.users.length;
      let siteCount = dbData.sites.length;
      try {
        const users = await getSecurityUsers();
        const sites = await getSecuritySites();
        userCount = users.length;
        siteCount = sites.length;
      } catch (e) {
        // Fallback to in-memory count if MySQL is offline
      }

      return sendJSON(res, 200, {
        success: true,
        message: 'WithSecurity Enterprise Backend REST Server Active',
        timestamp: new Date().toISOString(),
        tables: ['security_user', 'security_site', 'security_log', 'work_log'],
        counts: {
          security_user: userCount,
          security_site: siteCount
        }
      });
    }

    // 1. Security Users API (/api/security-users or /api/users)
    if (pathname === '/api/security-users' || pathname === '/api/users') {
      if (method === 'GET') {
        try {
          const users = await getSecurityUsers();
          return sendJSON(res, 200, { success: true, data: users });
        } catch (e) {
          return sendJSON(res, 200, { success: true, data: dbData.users });
        }
      }
      if (method === 'POST') {
        const newItem = await parseRequestBody(req);
        if (newItem.username) {
          try {
            await createSecurityUser(newItem);
          } catch (e) {
            console.warn('MySQL User Sync Warning:', e.message);
          }
          const idx = dbData.users.findIndex(u => u.username === newItem.username);
          if (idx >= 0) dbData.users[idx] = newItem;
          else dbData.users.push(newItem);
          saveDB();
          return sendJSON(res, 201, { success: true, data: newItem });
        }
      }
    }
    if ((pathname.startsWith('/api/security-users/') || pathname.startsWith('/api/users/')) && method === 'DELETE') {
      const username = decodeURIComponent(pathname.replace(/^\/api\/(security-users|users)\//, ''));
      if (username !== 'admin') {
        try {
          await deleteSecurityUser(username);
        } catch (e) {
          console.warn('MySQL User Delete Warning:', e.message);
        }
        dbData.users = dbData.users.filter(u => u.username !== username);
        saveDB();
      }
      return sendJSON(res, 200, { success: true, deletedUsername: username });
    }

    // 2. Security Sites API (/api/security-sites or /api/sites)
    if (pathname === '/api/security-sites' || pathname === '/api/sites') {
      if (method === 'GET') {
        try {
          const sites = await getSecuritySites();
          return sendJSON(res, 200, { success: true, data: sites });
        } catch (e) {
          return sendJSON(res, 200, { success: true, data: dbData.sites });
        }
      }
      if (method === 'POST') {
        const newItem = await parseRequestBody(req);
        if (newItem.id) {
          try {
            await createSecuritySite(newItem);
          } catch (e) {
            console.warn('MySQL Site Sync Warning:', e.message);
          }
          const idx = dbData.sites.findIndex(s => s.id === newItem.id);
          if (idx >= 0) dbData.sites[idx] = newItem;
          else dbData.sites.push(newItem);
          saveDB();
          return sendJSON(res, 201, { success: true, data: newItem });
        }
      }
    }
    if ((pathname.startsWith('/api/security-sites/') || pathname.startsWith('/api/sites/')) && method === 'DELETE') {
      const id = pathname.replace(/^\/api\/(security-sites|sites)\//, '');
      try {
        await deleteSecuritySite(id);
      } catch (e) {
        console.warn('MySQL Site Delete Warning:', e.message);
      }
      dbData.sites = dbData.sites.filter(s => s.id !== id);
      saveDB();
      return sendJSON(res, 200, { success: true, deletedId: id });
    }

    // 3. Security Pledge Logs API (/api/security-logs)
    if (pathname === '/api/security-logs') {
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
    if (pathname.startsWith('/api/security-logs/') && method === 'GET') {
      const logId = pathname.replace('/api/security-logs/', '');
      const log = await getSecurityLogById(logId);
      return sendJSON(res, log ? 200 : 404, { success: !!log, data: log });
    }
    if (pathname.startsWith('/api/security-logs/') && method === 'DELETE') {
      const logId = pathname.replace('/api/security-logs/', '');
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
