// Enterprise Server DB & Rest API Template (Node.js + Express + SQLite)
// To run this server: node server/db.js

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const DB_FILE = path.join(__dirname, 'security_database.json');

app.use(express.json());

// In-Memory / File Persistent SQLite Emulation Data Store
let dbData = {
  checklists: [],
  vault: [],
  otp: [],
  incidents: []
};

// Load DB File on startup
if (fs.existsSync(DB_FILE)) {
  try {
    dbData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    console.log('Database loaded successfully from:', DB_FILE);
  } catch (err) {
    console.error('Error reading database file:', err);
  }
} else {
  saveDB();
}

function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf8');
}

// REST API Endpoints

// 1. Checklists API
app.get('/api/checklists', (req, res) => {
  res.json({ success: true, data: dbData.checklists });
});

app.post('/api/checklists', (req, res) => {
  const newPass = req.body;
  dbData.checklists.unshift(newPass);
  saveDB();
  res.status(201).json({ success: true, data: newPass });
});

// 2. Encrypted Vault API
app.get('/api/vault', (req, res) => {
  res.json({ success: true, data: dbData.vault });
});

app.post('/api/vault', (req, res) => {
  const item = req.body;
  dbData.vault.unshift(item);
  saveDB();
  res.status(201).json({ success: true, data: item });
});

// 3. 2FA OTP API
app.get('/api/otp', (req, res) => {
  res.json({ success: true, data: dbData.otp });
});

app.post('/api/otp', (req, res) => {
  const acc = req.body;
  dbData.otp.push(acc);
  saveDB();
  res.status(201).json({ success: true, data: acc });
});

// 4. Incident Reports API
app.post('/api/incidents', (req, res) => {
  const incident = req.body;
  dbData.incidents.unshift(incident);
  saveDB();
  res.status(201).json({ success: true, data: incident });
});

app.listen(PORT, () => {
  console.log(`WithSecurity Database REST API running on http://localhost:${PORT}`);
});
