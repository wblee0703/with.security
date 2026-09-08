// Enterprise JSON File-based Database Engine for Gabia & Serverless Hosting
// File: server/jsonDb.js
// Stores all persistent application data into server/security_database.json

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE_PATH = path.join(__dirname, 'security_database.json');

const SALT_PREFIX = 'WithSecurity_SALT_2026_';

// 1. Password Hashing & Verification Helper
export function hashPasswordServer(rawPassword) {
  if (!rawPassword) return '';
  const str = String(rawPassword).trim();
  if (/^[a-f0-9]{64}$/i.test(str)) return str;
  return crypto.createHash('sha256').update(`${SALT_PREFIX}${str}`).digest('hex');
}

export function verifyUserPasswordServer(inputPassword, storedPasswordHash) {
  if (!inputPassword || !storedPasswordHash) return false;
  const inputStr = String(inputPassword).trim();
  const storedStr = String(storedPasswordHash).trim();

  // 1. Salted SHA-256 hash check
  const saltedHash = crypto.createHash('sha256').update(`${SALT_PREFIX}${inputStr}`).digest('hex');
  if (saltedHash === storedStr) return true;

  // 2. Legacy raw SHA-256 hash check
  const legacyHash = crypto.createHash('sha256').update(inputStr).digest('hex');
  if (legacyHash === storedStr) return true;

  // 3. Plaintext match fallback
  if (inputStr === storedStr) return true;

  return false;
}

export function sanitizeUserOutput(user) {
  if (!user) return null;
  const { password, passwordHash, ...safeUser } = user;
  return {
    ...safeUser,
    educationDate: (user.education_date && user.education_date !== '2025-08-20') ? user.education_date : (user.educationDate && user.educationDate !== '2025-08-20' ? user.educationDate : ''),
    educationExpiryDate: (user.education_expiry_date && user.education_expiry_date !== '2026-08-19') ? user.education_expiry_date : (user.educationExpiryDate && user.educationExpiryDate !== '2026-08-19' ? user.educationExpiryDate : ''),
    educationName: (user.education_name && user.education_name !== '사내 정기 정보보안 및 안전 교육') ? user.education_name : (user.educationName && user.educationName !== '사내 정기 정보보안 및 안전 교육' ? user.educationName : ''),
    trainings: Array.isArray(user.trainings) ? user.trainings : (typeof user.trainings === 'string' && user.trainings ? JSON.parse(user.trainings || '[]') : [])
  };
}

// 2. Default Seed Datasets
const DEFAULT_SEED_USERS = [
  {
    id: 1,
    username: 'admin',
    password: hashPasswordServer(process.env.ADMIN_DEFAULT_PASSWORD || 'withtech123!'),
    name: '이원배',
    role: '개발자',
    division: '영업/운영사업부',
    team: '운영1팀',
    rank: '대리',
    siteId: 'ALL',
    phone: '010-9885-0393',
    email: 'wblee@withtech.co.kr',
    education_date: '',
    education_expiry_date: '',
    education_name: '',
    trainings: [],
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    username: 'wblee',
    password: hashPasswordServer(process.env.ADMIN_DEFAULT_PASSWORD || 'withtech123!'),
    name: '이원배',
    role: '일반',
    division: '영업/운영사업부',
    team: '운영1팀',
    rank: '대리',
    siteId: 'site-001',
    phone: '010-9885-0393',
    email: 'wblee@withtech.co.kr',
    education_date: '',
    education_expiry_date: '',
    education_name: '',
    trainings: [],
    created_at: '2026-01-01T00:00:00.000Z'
  }
];

const DEFAULT_SEED_SITES = [
  {
    id: 'site-001',
    type: '보안앱O',
    name: '삼성전자 평택캠퍼스 P4 라인',
    address: '경기도 평택시 고덕면 삼성로 114',
    site_name: '삼성전자 평택캠퍼스 P4 라인 경기도 평택시 고덕면 삼성로 114'
  },
  {
    id: 'site-002',
    type: '보안앱O',
    name: 'SK하이닉스 이천 M16 공장',
    address: '경기도 이천시 부발읍 경충대로 2091',
    site_name: 'SK하이닉스 이천 M16 공장 경기도 이천시 부발읍 경충대로 2091'
  },
  {
    id: 'site-003',
    type: '보안앱X',
    name: '일반 협력사 물류센터 (보안앱 예외)',
    address: '경기도 용인시 처인구 백암면 원설로 123',
    site_name: '일반 협력사 물류센터 (보안앱 예외) 경기도 용인시 처인구 백암면 원설로 123'
  }
];

// 3. JSON File Database In-Memory & Persistence Manager
class JsonDatabaseManager {
  constructor() {
    this.cache = null;
    this.isSaving = false;
    this.saveQueued = false;
    this.initDatabase();
  }

  // Load database from file or initialize with seed data
  initDatabase() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
        if (raw && raw.trim() && raw.trim() !== '{}') {
          this.cache = JSON.parse(raw);
        }
      }
    } catch (e) {
      console.warn('⚠️ [JsonDB] Failed to read security_database.json, initializing fresh store:', e.message);
    }

    if (!this.cache || typeof this.cache !== 'object') {
      this.cache = {};
    }

    // Ensure all standard collections exist
    if (!Array.isArray(this.cache.users) || this.cache.users.length === 0) {
      this.cache.users = DEFAULT_SEED_USERS;
    }
    if (!Array.isArray(this.cache.sites) || this.cache.sites.length === 0) {
      this.cache.sites = DEFAULT_SEED_SITES;
    }
    if (!Array.isArray(this.cache.security_logs)) this.cache.security_logs = [];
    if (!Array.isArray(this.cache.work_logs)) this.cache.work_logs = [];
    if (!Array.isArray(this.cache.weekly_reports)) this.cache.weekly_reports = [];
    if (!Array.isArray(this.cache.edu_logs)) this.cache.edu_logs = [];
    if (!Array.isArray(this.cache.tbms)) this.cache.tbms = [];
    if (!Array.isArray(this.cache.vault)) this.cache.vault = [];
    if (!Array.isArray(this.cache.otp)) this.cache.otp = [];
    if (!Array.isArray(this.cache.incidents)) this.cache.incidents = [];

    this.persistSync();
    console.log('📦 [JsonDB] Gabia File-based JSON Database Engine Active: server/security_database.json');
  }

  // Synchronous atomic write to file
  persistSync() {
    try {
      const tempPath = `${DB_FILE_PATH}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.cache, null, 2), 'utf8');
      fs.renameSync(tempPath, DB_FILE_PATH);
    } catch (e) {
      console.error('❌ [JsonDB] Persist error:', e.message);
    }
  }

  // Asynchronous debounced save
  queueSave() {
    if (this.isSaving) {
      this.saveQueued = true;
      return;
    }
    this.isSaving = true;
    setTimeout(() => {
      this.persistSync();
      this.isSaving = false;
      if (this.saveQueued) {
        this.saveQueued = false;
        this.queueSave();
      }
    }, 100);
  }

  // ==========================================
  // Collection: Users (security_user)
  // ==========================================
  async getUsers(includePassword = false) {
    const list = this.cache.users || [];
    if (includePassword) {
      return [...list];
    }
    return list.map(sanitizeUserOutput);
  }

  async createUser(data = {}) {
    const username = String(data.username || '').trim().toLowerCase();
    if (!username) throw new Error('Username is required');

    const list = this.cache.users || [];
    const existingIndex = list.findIndex(u => String(u.username || '').trim().toLowerCase() === username);

    const now = new Date().toISOString();
    let userObj = {};

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      userObj = {
        ...existing,
        ...data,
        username,
        password: data.password ? hashPasswordServer(data.password) : (existing.password || ''),
        updated_at: now
      };
      list[existingIndex] = userObj;
    } else {
      const nextId = list.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1;
      userObj = {
        id: nextId,
        username,
        password: hashPasswordServer(data.password || process.env.ADMIN_DEFAULT_PASSWORD || 'withtech123!'),
        name: data.name || '',
        role: data.role || '일반',
        division: data.division || '',
        team: data.team || '',
        rank: data.rank || '',
        siteId: data.siteId || 'ALL',
        phone: data.phone || '',
        email: data.email || '',
        education_date: data.education_date || data.educationDate || '',
        education_expiry_date: data.education_expiry_date || data.educationExpiryDate || '',
        education_name: data.education_name || data.educationName || '',
        trainings: Array.isArray(data.trainings) ? data.trainings : [],
        created_at: now
      };
      list.push(userObj);
    }

    this.cache.users = list;
    this.queueSave();
    return sanitizeUserOutput(userObj);
  }

  async deleteUser(username) {
    const uname = String(username || '').trim().toLowerCase();
    if (uname === 'admin') return false; // admin account cannot be deleted
    const initialLen = (this.cache.users || []).length;
    this.cache.users = (this.cache.users || []).filter(u => String(u.username || '').trim().toLowerCase() !== uname);
    if (this.cache.users.length !== initialLen) {
      this.queueSave();
      return true;
    }
    return false;
  }

  // ==========================================
  // Collection: Sites (security_site)
  // ==========================================
  async getSites() {
    const list = this.cache.sites || [];
    return list.map(s => {
      const sName = String(s.name || '').trim();
      const sAddr = String(s.address || '').trim();
      const fullSiteName = s.site_name || (sAddr ? `${sName} ${sAddr}` : sName);
      return {
        id: String(s.id || '').toLowerCase(),
        type: s.type || '보안어플O',
        name: sName,
        address: sAddr,
        site_name: fullSiteName,
        siteName: fullSiteName
      };
    });
  }

  async getSiteById(id) {
    const sites = await this.getSites();
    return sites.find(s => s.id === String(id || '').toLowerCase()) || null;
  }

  async createSite(data = {}) {
    let siteId = String(data.id || '').trim().toLowerCase();
    const list = this.cache.sites || [];

    if (!siteId || siteId === 'site-new' || siteId === 'new') {
      const num = list.length + 1;
      siteId = `site-${String(num).padStart(3, '0')}`;
    }

    const name = String(data.name || '').trim();
    const address = String(data.address || '').trim();
    const siteName = String(data.site_name || data.siteName || (address ? `${name} ${address}` : name)).trim();
    const type = String(data.type || '보안어플O').trim();

    const siteObj = {
      id: siteId,
      type,
      name,
      address,
      site_name: siteName,
      siteName
    };

    const existingIdx = list.findIndex(s => String(s.id).toLowerCase() === siteId);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...siteObj };
    } else {
      list.push(siteObj);
    }

    this.cache.sites = list;
    this.queueSave();
    return siteObj;
  }

  async deleteSite(id) {
    const sId = String(id || '').trim().toLowerCase();
    const initialLen = (this.cache.sites || []).length;
    this.cache.sites = (this.cache.sites || []).filter(s => String(s.id || '').toLowerCase() !== sId);
    if (this.cache.sites.length !== initialLen) {
      this.queueSave();
      return true;
    }
    return false;
  }

  // ==========================================
  // Collection: Security Logs / Pledges (security_log)
  // ==========================================
  async getSecurityLogs(filters = {}) {
    let list = this.cache.security_logs || [];
    if (filters && filters.userName) {
      const uname = String(filters.userName).trim().toLowerCase();
      list = list.filter(item => String(item.name || item.userName || '').toLowerCase().includes(uname));
    }
    return [...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }

  async getSecurityLogById(id) {
    const list = this.cache.security_logs || [];
    return list.find(item => String(item.log_id || item.id) === String(id)) || null;
  }

  async createSecurityLog(data = {}) {
    const list = this.cache.security_logs || [];
    const logId = data.log_id || data.id || `PASS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const now = new Date().toISOString();

    const logObj = {
      ...data,
      id: logId,
      log_id: logId,
      created_at: data.created_at || now
    };

    const existingIdx = list.findIndex(item => String(item.log_id || item.id) === String(logId));
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...logObj };
    } else {
      list.unshift(logObj);
    }

    this.cache.security_logs = list;
    this.queueSave();
    return logObj;
  }

  async deleteSecurityLog(id) {
    const sId = String(id);
    const initialLen = (this.cache.security_logs || []).length;
    this.cache.security_logs = (this.cache.security_logs || []).filter(item => String(item.log_id || item.id) !== sId);
    if (this.cache.security_logs.length !== initialLen) {
      this.queueSave();
      return true;
    }
    return false;
  }

  // ==========================================
  // Collection: Work Logs (work_log)
  // ==========================================
  async getWorkLogs(filters = {}) {
    let list = this.cache.work_logs || [];
    if (filters) {
      if (filters.writerName) {
        const w = String(filters.writerName).trim().toLowerCase();
        list = list.filter(item => String(item.name || item.writer_id || '').toLowerCase().includes(w));
      }
      if (filters.siteName) {
        const s = String(filters.siteName).trim().toLowerCase();
        list = list.filter(item => String(item.site_name || '').toLowerCase().includes(s));
      }
      if (filters.logDate) {
        list = list.filter(item => String(item.log_date || '').startsWith(filters.logDate));
      }
    }
    return [...list].sort((a, b) => new Date(b.log_date || b.created_at || 0) - new Date(a.log_date || a.created_at || 0));
  }

  async getWorkLogById(id) {
    const list = this.cache.work_logs || [];
    return list.find(item => String(item.log_id || item.id) === String(id)) || null;
  }

  async createWorkLog(data = {}) {
    const list = this.cache.work_logs || [];
    const logId = data.log_id || data.id || `WORK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const logObj = {
      ...data,
      id: logId,
      log_id: logId,
      created_at: data.created_at || now,
      updated_at: now
    };

    const existingIdx = list.findIndex(item => String(item.log_id || item.id) === String(logId));
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...logObj };
    } else {
      list.unshift(logObj);
    }

    this.cache.work_logs = list;
    this.queueSave();
    return logObj;
  }

  async updateWorkLog(id, data = {}) {
    const list = this.cache.work_logs || [];
    const idx = list.findIndex(item => String(item.log_id || item.id) === String(id));
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        ...data,
        updated_at: new Date().toISOString()
      };
      this.cache.work_logs = list;
      this.queueSave();
      return true;
    }
    return false;
  }

  async deleteWorkLog(id) {
    const sId = String(id);
    const initialLen = (this.cache.work_logs || []).length;
    this.cache.work_logs = (this.cache.work_logs || []).filter(item => String(item.log_id || item.id) !== sId);
    if (this.cache.work_logs.length !== initialLen) {
      this.queueSave();
      return true;
    }
    return false;
  }

  // ==========================================
  // Collection: Weekly Reports (weekly_report)
  // ==========================================
  async getWeeklyReports(filters = {}) {
    let list = this.cache.weekly_reports || [];
    if (filters) {
      if (filters.weeklyMonday) {
        list = list.filter(r => String(r.weekly_monday || '').startsWith(filters.weeklyMonday));
      }
      if (filters.authorUsername) {
        const u = String(filters.authorUsername).trim().toLowerCase();
        list = list.filter(r => String(r.author_username || '').toLowerCase() === u);
      }
    }
    return [...list].sort((a, b) => new Date(b.weekly_monday || 0) - new Date(a.weekly_monday || 0));
  }

  async createWeeklyReport(data = {}) {
    const list = this.cache.weekly_reports || [];
    const reportId = data.report_id || data.id || `weekly-rep-${data.author_username || 'user'}-${data.weekly_monday || Date.now()}`;
    const now = new Date().toISOString();

    const reportObj = {
      ...data,
      id: reportId,
      report_id: reportId,
      created_at: data.created_at || now,
      updated_at: now
    };

    const existingIdx = list.findIndex(r => String(r.report_id || r.id) === String(reportId));
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...reportObj };
    } else {
      list.unshift(reportObj);
    }

    this.cache.weekly_reports = list;
    this.queueSave();
    return reportObj;
  }

  async deleteWeeklyReport(id) {
    const sId = String(id);
    const initialLen = (this.cache.weekly_reports || []).length;
    this.cache.weekly_reports = (this.cache.weekly_reports || []).filter(r => String(r.report_id || r.id) !== sId);
    if (this.cache.weekly_reports.length !== initialLen) {
      this.queueSave();
      return { success: true };
    }
    return { success: false };
  }

  // ==========================================
  // Collection: Education Logs (edu_log)
  // ==========================================
  async getEduLogs(filters = {}) {
    let list = this.cache.edu_logs || [];
    if (filters) {
      if (filters.userId) {
        const u = String(filters.userId).trim().toLowerCase();
        list = list.filter(e => String(e.user_id || '').toLowerCase() === u);
      }
      if (filters.name) {
        const n = String(filters.name).trim().toLowerCase();
        list = list.filter(e => String(e.name || '').toLowerCase().includes(n));
      }
      if (filters.category) {
        list = list.filter(e => e.category === filters.category);
      }
    }
    return [...list].sort((a, b) => new Date(b.completion_date || 0) - new Date(a.completion_date || 0));
  }

  async getEduLogById(id) {
    const list = this.cache.edu_logs || [];
    return list.find(e => String(e.edu_id || e.id) === String(id)) || null;
  }

  async createEduLog(data = {}) {
    const list = this.cache.edu_logs || [];
    const eduId = data.edu_id || data.id || `EDU-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();

    const eduObj = {
      ...data,
      id: eduId,
      edu_id: eduId,
      created_at: data.created_at || now,
      updated_at: now
    };

    const existingIdx = list.findIndex(e => String(e.edu_id || e.id) === String(eduId));
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...eduObj };
    } else {
      list.unshift(eduObj);
    }

    this.cache.edu_logs = list;
    this.queueSave();
    return eduObj;
  }

  async updateEduLog(id, data = {}) {
    const list = this.cache.edu_logs || [];
    const idx = list.findIndex(e => String(e.edu_id || e.id) === String(id));
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        ...data,
        updated_at: new Date().toISOString()
      };
      this.cache.edu_logs = list;
      this.queueSave();
      return list[idx];
    }
    return null;
  }

  async deleteEduLog(id) {
    const sId = String(id);
    const initialLen = (this.cache.edu_logs || []).length;
    this.cache.edu_logs = (this.cache.edu_logs || []).filter(e => String(e.edu_id || e.id) !== sId);
    if (this.cache.edu_logs.length !== initialLen) {
      this.queueSave();
      return true;
    }
    return false;
  }

  // ==========================================
  // Collection: TBMs (tbms)
  // ==========================================
  async getTbms(filters = {}) {
    let list = this.cache.tbms || [];
    if (filters) {
      if (filters.date) {
        list = list.filter(t => t.date === filters.date);
      }
      if (filters.site) {
        const s = String(filters.site).trim().toLowerCase();
        list = list.filter(t => String(t.site || t.siteName || '').toLowerCase().includes(s));
      }
    }
    return [...list].sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
  }

  async getTbmById(id) {
    const list = this.cache.tbms || [];
    return list.find(t => String(t.id) === String(id)) || null;
  }

  async createOrUpdateTbm(data = {}) {
    const list = this.cache.tbms || [];
    const now = new Date().toISOString();
    const id = data.id || `tbm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const tbmObj = {
      ...data,
      id,
      createdAt: data.createdAt || now,
      updatedAt: now
    };

    const existingIdx = list.findIndex(t => String(t.id) === String(id));
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...tbmObj };
    } else {
      list.unshift(tbmObj);
    }

    this.cache.tbms = list;
    this.queueSave();
    return tbmObj;
  }

  async deleteTbm(id) {
    const sId = String(id);
    const initialLen = (this.cache.tbms || []).length;
    this.cache.tbms = (this.cache.tbms || []).filter(t => String(t.id) !== sId);
    if (this.cache.tbms.length !== initialLen) {
      this.queueSave();
      return true;
    }
    return false;
  }

  // ==========================================
  // Unified Bulk Sync Engine (/api/sync-all & /api/sync/all)
  // ==========================================
  async getAllSyncData() {
    return {
      users: (this.cache.users || []).map(sanitizeUserOutput),
      sites: await this.getSites(),
      checklists: this.cache.security_logs || [],
      security_logs: this.cache.security_logs || [],
      work_logs: this.cache.work_logs || [],
      weekly_reports: this.cache.weekly_reports || [],
      edu_logs: this.cache.edu_logs || [],
      tbms: this.cache.tbms || [],
      vault: this.cache.vault || [],
      otp: this.cache.otp || [],
      incidents: this.cache.incidents || []
    };
  }

  async mergeSyncData(incoming = {}) {
    const mergeCollection = (current, incomingList, key = 'id') => {
      if (!Array.isArray(incomingList)) return current;
      const map = new Map();
      (current || []).forEach(item => { if (item && item[key]) map.set(String(item[key]), item); });
      incomingList.forEach(item => {
        if (item && item[key]) {
          const k = String(item[key]);
          map.set(k, { ...(map.get(k) || {}), ...item });
        }
      });
      return Array.from(map.values());
    };

    if (incoming.sites) {
      this.cache.sites = mergeCollection(this.cache.sites, incoming.sites, 'id');
    }
    if (incoming.checklists || incoming.security_logs) {
      const logs = incoming.checklists || incoming.security_logs;
      this.cache.security_logs = mergeCollection(this.cache.security_logs, logs, 'log_id');
    }
    if (incoming.work_logs) {
      this.cache.work_logs = mergeCollection(this.cache.work_logs, incoming.work_logs, 'log_id');
    }
    if (incoming.weekly_reports) {
      this.cache.weekly_reports = mergeCollection(this.cache.weekly_reports, incoming.weekly_reports, 'report_id');
    }
    if (incoming.edu_logs) {
      this.cache.edu_logs = mergeCollection(this.cache.edu_logs, incoming.edu_logs, 'edu_id');
    }
    if (incoming.tbms) {
      this.cache.tbms = mergeCollection(this.cache.tbms, incoming.tbms, 'id');
    }
    if (incoming.vault) {
      this.cache.vault = mergeCollection(this.cache.vault, incoming.vault, 'id');
    }
    if (incoming.otp) {
      this.cache.otp = mergeCollection(this.cache.otp, incoming.otp, 'id');
    }
    if (incoming.incidents) {
      this.cache.incidents = mergeCollection(this.cache.incidents, incoming.incidents, 'id');
    }
    if (incoming.users) {
      this.cache.users = mergeCollection(this.cache.users, incoming.users, 'username');
    }

    this.persistSync();
    return await this.getAllSyncData();
  }
}

export const jsonDb = new JsonDatabaseManager();
export default jsonDb;
