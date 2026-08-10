// Enterprise Server DB & REST API Server (Node.js + Zero-Dependency HTTP Server + SQLite/JSON Store Emulation)
// To run this server: node server/db.js

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const DB_FILE = path.join(__dirname, 'security_database.json');
const SRC_DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// Ground-truth Default Seed Data Helper
function loadSeedJson(fileName) {
  try {
    const filePath = path.join(SRC_DATA_DIR, fileName);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.warn(`[Seed Data] Could not load ${fileName}:`, err.message);
  }
  return [];
}

// In-Memory & File Persistent Data Store
let dbData = {
  checklists: [],
  sites: [],
  users: [],
  vault: [],
  otp: [],
  incidents: []
};

// Initialize / Load Database
function initDB() {
  let loaded = false;
  if (fs.existsSync(DB_FILE)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      dbData = {
        checklists: Array.isArray(fileData.checklists) ? fileData.checklists : [],
        sites: Array.isArray(fileData.sites) ? fileData.sites : [],
        users: Array.isArray(fileData.users) ? fileData.users : [],
        vault: Array.isArray(fileData.vault) ? fileData.vault : [],
        otp: Array.isArray(fileData.otp) ? fileData.otp : [],
        incidents: Array.isArray(fileData.incidents) ? fileData.incidents : []
      };
      loaded = true;
      console.log('Database loaded successfully from:', DB_FILE);
    } catch (err) {
      console.error('Error reading database file, re-initializing:', err);
    }
  }

  // Seed default data if stores are empty
  const defaultPledges = loadSeedJson('pledges.json');
  const defaultSites = loadSeedJson('sites.json');
  const defaultUsers = loadSeedJson('users.json');

  if (dbData.checklists.length === 0 && defaultPledges.length > 0) {
    dbData.checklists = defaultPledges;
  }
  if (dbData.sites.length === 0 && defaultSites.length > 0) {
    dbData.sites = defaultSites;
  }
  if (dbData.users.length === 0 && defaultUsers.length > 0) {
    dbData.users = defaultUsers;
  }

  saveDB();
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
      return sendJSON(res, 200, {
        success: true,
        message: 'WithSecurity Enterprise Backend REST Server Active',
        timestamp: new Date().toISOString(),
        counts: {
          checklists: dbData.checklists.length,
          sites: dbData.sites.length,
          users: dbData.users.length,
          vault: dbData.vault.length,
          otp: dbData.otp.length,
          incidents: dbData.incidents.length
        }
      });
    }

    // 0.1 Full Database Sync API
    if (pathname === '/api/sync-all') {
      if (method === 'GET') {
        return sendJSON(res, 200, { success: true, data: dbData });
      }
      if (method === 'POST') {
        const body = await parseRequestBody(req);
        if (body.data || body.checklists || body.sites || body.users) {
          const incoming = body.data || body;

          const mergeStore = (existing, incomingArr, key = 'id') => {
            if (!Array.isArray(incomingArr) || incomingArr.length === 0) return existing;
            const map = new Map();
            (existing || []).forEach(item => { if (item && item[key]) map.set(item[key], item); });
            (incomingArr || []).forEach(item => { if (item && item[key]) map.set(item[key], { ...(map.get(item[key]) || {}), ...item }); });
            return Array.from(map.values());
          };

          dbData.checklists = mergeStore(dbData.checklists, incoming.checklists, 'id');
          dbData.sites = mergeStore(dbData.sites, incoming.sites, 'id');
          dbData.users = mergeStore(dbData.users, incoming.users, 'username');
          dbData.vault = mergeStore(dbData.vault, incoming.vault, 'id');
          dbData.otp = mergeStore(dbData.otp, incoming.otp, 'id');
          dbData.incidents = mergeStore(dbData.incidents, incoming.incidents, 'id');

          saveDB();
        }
        return sendJSON(res, 200, {
          success: true,
          message: 'Synced successfully',
          data: dbData
        });
      }
    }

    // 0.2 Real-time Disk Sync API
    if (pathname === '/api/sync-json' && method === 'POST') {
      const body = await parseRequestBody(req);
      const { filename, data } = body;
      if (['sites.json', 'users.json', 'pledges.json'].includes(filename) && Array.isArray(data)) {
        const targetPath = path.join(SRC_DATA_DIR, filename);
        fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf8');

        // Update in-memory DB as well
        if (filename === 'pledges.json') dbData.checklists = data;
        if (filename === 'sites.json') dbData.sites = data;
        if (filename === 'users.json') dbData.users = data;
        saveDB();

        return sendJSON(res, 200, { success: true, file: filename });
      }
      return sendJSON(res, 400, { success: false, message: 'Invalid file parameter' });
    }

    // 1. Checklists API (/api/checklists)
    if (pathname === '/api/checklists') {
      if (method === 'GET') {
        return sendJSON(res, 200, { success: true, data: dbData.checklists });
      }
      if (method === 'POST') {
        const newItem = await parseRequestBody(req);
        if (newItem.id) {
          const idx = dbData.checklists.findIndex(i => i.id === newItem.id);
          if (idx >= 0) dbData.checklists[idx] = newItem;
          else dbData.checklists.unshift(newItem);
          saveDB();
          return sendJSON(res, 201, { success: true, data: newItem });
        }
      }
    }
    if (pathname.startsWith('/api/checklists/') && method === 'DELETE') {
      const id = pathname.replace('/api/checklists/', '');
      dbData.checklists = dbData.checklists.filter(i => i.id !== id);
      saveDB();
      return sendJSON(res, 200, { success: true, deletedId: id });
    }

    // 2. Sites API (/api/sites)
    if (pathname === '/api/sites') {
      if (method === 'GET') {
        return sendJSON(res, 200, { success: true, data: dbData.sites });
      }
      if (method === 'POST') {
        const newItem = await parseRequestBody(req);
        if (newItem.id) {
          const idx = dbData.sites.findIndex(i => i.id === newItem.id);
          if (idx >= 0) dbData.sites[idx] = newItem;
          else dbData.sites.push(newItem);
          saveDB();
          return sendJSON(res, 201, { success: true, data: newItem });
        }
      }
    }
    if (pathname.startsWith('/api/sites/') && method === 'DELETE') {
      const id = pathname.replace('/api/sites/', '');
      dbData.sites = dbData.sites.filter(i => i.id !== id);
      saveDB();
      return sendJSON(res, 200, { success: true, deletedId: id });
    }

    // 3. Users API (/api/users)
    if (pathname === '/api/users') {
      if (method === 'GET') {
        return sendJSON(res, 200, { success: true, data: dbData.users });
      }
      if (method === 'POST') {
        const newItem = await parseRequestBody(req);
        if (newItem.username) {
          const idx = dbData.users.findIndex(i => i.username === newItem.username);
          if (idx >= 0) dbData.users[idx] = newItem;
          else dbData.users.push(newItem);
          saveDB();
          return sendJSON(res, 201, { success: true, data: newItem });
        }
      }
    }
    if (pathname.startsWith('/api/users/') && method === 'DELETE') {
      const username = decodeURIComponent(pathname.replace('/api/users/', ''));
      if (username !== 'admin') {
        dbData.users = dbData.users.filter(u => u.username !== username);
        saveDB();
      }
      return sendJSON(res, 200, { success: true, deletedUsername: username });
    }

    // 4. Vault API (/api/vault)
    if (pathname === '/api/vault') {
      if (method === 'GET') {
        return sendJSON(res, 200, { success: true, data: dbData.vault });
      }
      if (method === 'POST') {
        const newItem = await parseRequestBody(req);
        if (newItem.id) {
          const idx = dbData.vault.findIndex(i => i.id === newItem.id);
          if (idx >= 0) dbData.vault[idx] = newItem;
          else dbData.vault.unshift(newItem);
          saveDB();
          return sendJSON(res, 201, { success: true, data: newItem });
        }
      }
    }
    if (pathname.startsWith('/api/vault/') && method === 'DELETE') {
      const id = pathname.replace('/api/vault/', '');
      dbData.vault = dbData.vault.filter(i => i.id !== id);
      saveDB();
      return sendJSON(res, 200, { success: true, deletedId: id });
    }

    // 5. 2FA OTP API (/api/otp)
    if (pathname === '/api/otp') {
      if (method === 'GET') {
        return sendJSON(res, 200, { success: true, data: dbData.otp });
      }
      if (method === 'POST') {
        const newItem = await parseRequestBody(req);
        if (newItem.id) {
          const idx = dbData.otp.findIndex(i => i.id === newItem.id);
          if (idx >= 0) dbData.otp[idx] = newItem;
          else dbData.otp.push(newItem);
          saveDB();
          return sendJSON(res, 201, { success: true, data: newItem });
        }
      }
    }
    if (pathname.startsWith('/api/otp/') && method === 'DELETE') {
      const id = pathname.replace('/api/otp/', '');
      dbData.otp = dbData.otp.filter(i => i.id !== id);
      saveDB();
      return sendJSON(res, 200, { success: true, deletedId: id });
    }

    // 6. Incident Reports API (/api/incidents)
    if (pathname === '/api/incidents') {
      if (method === 'GET') {
        return sendJSON(res, 200, { success: true, data: dbData.incidents });
      }
      if (method === 'POST') {
        const newItem = await parseRequestBody(req);
        if (newItem.id) {
          const idx = dbData.incidents.findIndex(i => i.id === newItem.id);
          if (idx >= 0) dbData.incidents[idx] = newItem;
          else dbData.incidents.unshift(newItem);
          saveDB();
          return sendJSON(res, 201, { success: true, data: newItem });
        }
      }
    }
    if (pathname.startsWith('/api/incidents/') && method === 'DELETE') {
      const id = pathname.replace('/api/incidents/', '');
      dbData.incidents = dbData.incidents.filter(i => i.id !== id);
      saveDB();
      return sendJSON(res, 200, { success: true, deletedId: id });
    }

    // Default 404 Route
    sendJSON(res, 404, { success: false, message: `Route not found: ${method} ${pathname}` });
  } catch (err) {
    console.error('Server Request Error:', err);
    sendJSON(res, 500, { success: false, message: err.message || 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`WithSecurity Enterprise Database REST API running on http://localhost:${PORT}`);
});

