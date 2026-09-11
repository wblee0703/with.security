import { hashPassword, verifyPasswordHash } from './cryptoUtil';
import { Capacitor } from '@capacitor/core';

// Memory cache for default admin hash to avoid repeated PBKDF2/SHA-256 computation
let cachedDefaultAdminHash = null;

// Server Base URL Management Helper (Default to GitHub Pages before Gabia Hosting)
export const DEFAULT_PUBLIC_URL = 'https://wblee0703.github.io/with.security';
// 구글 스프레드시트(Withsharing_DB) 배포 웹 앱 URL (기본 클라우드 DB)
export const DEFAULT_GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwud1BdjfcfAF2XeDIz6DZQQqakYAMRkueYtWBqsviwacCklw6USFfKs-kDJdeGQjxF/exec';

// 이전 기본 URL 목록 (새 기본 URL로 자동 전환용)
const LEGACY_DEFAULT_GOOGLE_SHEETS_URLS = [
  'https://script.google.com/macros/s/AKfycby5rP1xxjFtz0v3OUoK3l18jrEtyqD5pkn8cXkocktdH1yqkPc1_MXd099t1q0QSpPy/exec'
];

// 1. 구글 스프레드시트 클라우드 DB 전용 URL 관리
export function getGoogleSheetsUrl() {
  const custom = localStorage.getItem('with_security_google_sheets_url');
  if (custom && custom.includes('script.google.com') && !custom.includes('macros/echo') && !custom.includes('googleusercontent.com')) {
    const trimmed = custom.trim().replace(/\/+$/, '');
    if (LEGACY_DEFAULT_GOOGLE_SHEETS_URLS.some(oldUrl => trimmed.startsWith(oldUrl.replace(/\/+$/, '')))) {
      localStorage.setItem('with_security_google_sheets_url', DEFAULT_GOOGLE_SHEETS_URL);
      return DEFAULT_GOOGLE_SHEETS_URL;
    }
    return trimmed;
  }
  return DEFAULT_GOOGLE_SHEETS_URL;
}

export function setGoogleSheetsUrl(url) {
  if (!url || !url.trim()) {
    localStorage.removeItem('with_security_google_sheets_url');
  } else {
    let formatted = url.trim().replace(/\/+$/, '');
    localStorage.setItem('with_security_google_sheets_url', formatted);
  }
  notifyDataChanged();
}

// 2. 웹 호스팅 / 백엔드 Node.js REST API 서버 전용 URL 관리
export function getHostedServerUrl() {
  const custom = localStorage.getItem('with_security_hosted_server_url') || localStorage.getItem('with_security_server_url');
  if (custom && !custom.includes('script.google.com') && !custom.includes('macros/echo') && !custom.includes('googleusercontent.com')) {
    return custom.trim().replace(/\/+$/, '');
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).trim().replace(/\/+$/, '');
  }
  return DEFAULT_PUBLIC_URL;
}

export function setHostedServerUrl(url) {
  localStorage.removeItem('with_security_hosted_app_url');
  if (!url || !url.trim()) {
    localStorage.removeItem('with_security_hosted_server_url');
    localStorage.removeItem('with_security_server_url');
  } else {
    let formatted = url.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = 'http://' + formatted;
    }
    formatted = formatted.replace(/\/+$/, '');
    localStorage.setItem('with_security_hosted_server_url', formatted);
    localStorage.setItem('with_security_server_url', formatted);
  }
  notifyDataChanged();
}

export function getServerUrl() {
  return getHostedServerUrl();
}

export function setServerUrl(url) {
  if (url && url.includes('script.google.com')) {
    setGoogleSheetsUrl(url);
  } else {
    setHostedServerUrl(url);
  }
}

// Global Cross-View Data Change Broadcast Helper (Debounced to prevent burst re-renders)
let notifyDebounceTimer = null;
export function notifyDataChanged(immediate = false) {
  if (typeof window === 'undefined') return;
  if (immediate) {
    if (notifyDebounceTimer) clearTimeout(notifyDebounceTimer);
    notifyDebounceTimer = null;
    window.dispatchEvent(new CustomEvent('with_security_data_changed'));
    return;
  }
  if (notifyDebounceTimer) clearTimeout(notifyDebounceTimer);
  notifyDebounceTimer = setTimeout(() => {
    window.dispatchEvent(new CustomEvent('with_security_data_changed'));
    notifyDebounceTimer = null;
  }, 250);
}

// 한국 표준시(KST) 기준 YYYY-MM-DD 날짜 문자열 정규화 헬퍼 (타임존 시차로 인한 날짜 밀림/왜곡 원천 방지)
export function normalizeKstDate(val) {
  if (!val && val !== 0) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  if (!str) return '';

  // ISO 문자열이나 UTC(Z) 포함 시 Date로 파싱하여 브라우저 로컬(KST) 기준 변환
  if (str.includes('T') || str.endsWith('Z')) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    } catch (e) { }
  }

  // YYYY-MM-DD 패턴 추출 및 정규화
  const match = str.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (match) {
    const y = match[1];
    const m = match[2].padStart(2, '0');
    const d = match[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return (str.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(str)) ? str.slice(0, 10) : str;
}

if (typeof window !== 'undefined') {
  window.normalizeKstDate = normalizeKstDate;
}

// Check if target URL supports dynamic Node/Express REST API endpoints
export function isApiEndpoint(url) {
  if (!url || !url.trim()) return false;
  const lower = url.toLowerCase();
  return !lower.includes('github.io') && !lower.includes('github.com');
}

// Get REST API Base URL helper (prioritizes Google Sheets for Cloud DB, retains MySQL for Local Dev)
export function getApiServerUrl() {
  const sheetUrl = getGoogleSheetsUrl();
  const dbTarget = typeof localStorage !== 'undefined' ? localStorage.getItem('with_security_db_target') : null;
  const hostedUrl = getHostedServerUrl();

  // 1. 사용자가 명시적으로 로컬 MySQL 서버를 타겟으로 지정한 경우만 로컬 proxy 사용
  if (dbTarget === 'mysql' || (hostedUrl && hostedUrl.includes('localhost:4000'))) {
    return '';
  }

  // 2. 구글 스프레드시트 클라우드 DB 연동 (모바일 앱 APK, 모바일 웹, PC 브라우저, GitHub Pages 통합 단일 진실 공급원)
  if (sheetUrl && sheetUrl.includes('script.google.com')) {
    return sheetUrl;
  }

  // 3. PC 브라우저 로컬 개발 모드 기본 fallback (시트 URL이 없을 때)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return ''; // Use relative '/api' via local Vite dev server proxy -> http://localhost:4000 (MySQL)
    }
  }

  // 4. 백엔드 Node.js/MySQL 서버가 명시적으로 설정된 경우 (가비아 호스팅 등)
  if (hostedUrl && isApiEndpoint(hostedUrl)) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && hostedUrl.startsWith('http://')) {
      return null;
    }
    return hostedUrl;
  }

  return null;
}

// In-Flight Promise Cache & Short-Term Response Cache to prevent burst API calls
const inFlightRequests = new Map();
const recentResponseCache = new Map();

// Google Apps Script (Withsharing_DB) Request Adapter
function adaptGoogleScriptRequest(baseUrl, endpoint, options) {
  const method = (options.method || 'GET').toUpperCase();
  let targetUrl = baseUrl;
  let fetchOptions = { ...options };

  let bodyData = null;
  if (options.body) {
    try {
      bodyData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    } catch (e) {
      bodyData = options.body;
    }
  }

  // Determine target sheet
  let sheetName = 'work_logs';
  if (endpoint.includes('users') || endpoint.includes('security-users')) sheetName = 'users';
  else if (endpoint.includes('sites') || endpoint.includes('security-sites')) sheetName = 'sites';
  else if (endpoint.includes('work-logs') || endpoint.includes('work_logs') || endpoint.includes('worklogs')) sheetName = 'work_logs';
  else if (endpoint.includes('security-logs') || endpoint.includes('security_logs') || endpoint.includes('checklists') || endpoint.includes('security-checklists') || endpoint.includes('pledges')) sheetName = 'security_logs';
  else if (endpoint.includes('edu-logs') || endpoint.includes('edu_logs')) sheetName = 'edu_logs';
  else if (endpoint.includes('weekly-reports') || endpoint.includes('weekly_reports')) sheetName = 'weekly_reports';
  else if (endpoint.includes('tbms')) sheetName = 'tbms';
  else if (endpoint.includes('vault')) sheetName = 'vault';
  else if (endpoint.includes('incidents')) sheetName = 'incidents';

  // ⭐ 보안 서약(PASS-) 데이터는 절대로 work_logs에 저장되지 않고 오직 security_logs에만 저장되도록 강제
  const isSecurityPledgeData = Boolean(
    bodyData && (
      String(bodyData.id || '').startsWith('PASS-') ||
      String(bodyData.log_id || '').startsWith('PASS-') ||
      bodyData.visitorName ||
      bodyData.visitor_name ||
      bodyData.visitor_phone ||
      bodyData.pledge_terms ||
      bodyData.docChecklist !== undefined ||
      bodyData.gate_approved !== undefined ||
      bodyData.pre_check_verified !== undefined
    )
  );

  if (isSecurityPledgeData) {
    sheetName = 'security_logs';
  }

  if (endpoint.includes('/login')) {
    // Google Sheets is a database, not an authentication endpoint. Never convert login into create!
    return { targetUrl: `${baseUrl}?action=ping`, fetchOptions: { method: 'GET' } };
  } else if (endpoint.includes('/status') || endpoint.includes('/ping')) {
    targetUrl = `${baseUrl}?action=ping`;
    fetchOptions.method = 'GET';
    delete fetchOptions.body;
  } else if (endpoint.includes('/sync/all')) {
    targetUrl = `${baseUrl}?action=getAll`;
    fetchOptions.method = 'GET';
    delete fetchOptions.body;
  } else if (method === 'GET') {
    targetUrl = `${baseUrl}?sheet=${sheetName}`;
    delete fetchOptions.body;
  } else if (method === 'POST') {
    // Defense-in-depth: Reject incomplete user payload (e.g. auth credentials probe) from creating user rows
    if (sheetName === 'users' && (!bodyData || !bodyData.username || !bodyData.name)) {
      return { targetUrl: `${baseUrl}?action=ping`, fetchOptions: { method: 'GET' } };
    }
    fetchOptions.method = 'POST';
    fetchOptions.redirect = 'follow';
    fetchOptions.headers = {
      ...(fetchOptions.headers || {}),
      'Content-Type': 'text/plain;charset=utf-8'
    };
    fetchOptions.body = JSON.stringify({
      action: 'create',
      sheet: sheetName,
      data: bodyData
    });
  } else if (method === 'PUT') {
    const cleanPath = endpoint.split('?')[0];
    const parts = cleanPath.split('/');
    const id = decodeURIComponent(parts[parts.length - 1] || '');
    const keyField = (sheetName === 'users') ? 'username' : 'id';
    fetchOptions.method = 'POST';
    fetchOptions.redirect = 'follow';
    fetchOptions.headers = {
      ...(fetchOptions.headers || {}),
      'Content-Type': 'text/plain;charset=utf-8'
    };
    fetchOptions.body = JSON.stringify({
      action: 'update',
      sheet: sheetName,
      key: keyField,
      id: id,
      data: bodyData
    });
  } else if (method === 'DELETE') {
    const cleanPath = endpoint.split('?')[0];
    const qs = endpoint.includes('?') ? endpoint.substring(endpoint.indexOf('?') + 1) : '';
    const parts = cleanPath.split('/');
    const id = decodeURIComponent(parts[parts.length - 1] || '');
    const queryParams = {};
    if (qs) {
      try {
        const searchParams = new URLSearchParams(qs);
        searchParams.forEach((val, key) => { queryParams[key] = val; });
      } catch (e) { }
    }
    const keyField = (sheetName === 'users') ? 'username' : 'id';
    fetchOptions.method = 'POST';
    fetchOptions.redirect = 'follow';
    fetchOptions.headers = {
      ...(fetchOptions.headers || {}),
      'Content-Type': 'text/plain;charset=utf-8'
    };
    fetchOptions.body = JSON.stringify({
      action: 'delete',
      sheet: sheetName,
      key: keyField,
      id: id,
      meta: queryParams,
      data: { ...queryParams, ...(bodyData || {}) }
    });
  }

  fetchOptions.timeout = Math.max(fetchOptions.timeout || 0, 12000);
  return { targetUrl, fetchOptions };
}

async function safeFetchApi(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const baseUrl = getApiServerUrl();
  if (baseUrl === null) return null;

  const isGoogleSheet = Boolean(baseUrl && baseUrl.includes('script.google.com'));
  let fullUrl = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
  let finalOptions = { ...options };

  if (isGoogleSheet) {
    const adapted = adaptGoogleScriptRequest(baseUrl, endpoint, options);
    fullUrl = adapted.targetUrl;
    finalOptions = adapted.fetchOptions;
  }

  // Invalidate cache on mutations
  if (method !== 'GET') {
    recentResponseCache.clear();
  }

  // Check 20s memory cache for GET requests (prevents rapid duplicate network roundtrips)
  if (method === 'GET') {
    const cached = recentResponseCache.get(fullUrl);
    if (cached && (Date.now() - cached.timestamp < 20000)) {
      return cached.response.clone();
    }

    // Deduplicate concurrent in-flight GET requests
    if (inFlightRequests.has(fullUrl)) {
      const ongoingRes = await inFlightRequests.get(fullUrl);
      return ongoingRes ? ongoingRes.clone() : null;
    }
  }

  const fetchPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutMs = finalOptions.timeout || (isGoogleSheet ? 12000 : 4000);
      const tid = setTimeout(() => controller.abort(), timeoutMs);

      // ⭐ CRITICAL: 구글 스프레드시트 Web App은 OPTIONS preflight를 지원하지 않습니다!
      // 따라서 커스텀 헤더(Authorization, Bypass-Tunnel-Reminder 등)를 절대 붙이지 않아야 100% 정상 통신됩니다.
      let headers = {};
      if (isGoogleSheet) {
        headers = { ...(finalOptions.headers || {}) };
        delete headers['Bypass-Tunnel-Reminder'];
        delete headers['Authorization'];
        delete headers['X-Auth-Token'];
      } else {
        const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('with_security_auth_token') : null;
        headers = {
          'Bypass-Tunnel-Reminder': 'true',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}`, 'X-Auth-Token': authToken } : {}),
          ...(finalOptions.headers || {})
        };
      }

      const res = await fetch(fullUrl, {
        ...finalOptions,
        headers,
        redirect: 'follow',
        signal: controller.signal
      }).catch((err) => {
        console.warn(`Fetch error for [${fullUrl}]:`, err);
        return null;
      });
      clearTimeout(tid);

      if (res && res.ok && method === 'GET') {
        recentResponseCache.set(fullUrl, {
          timestamp: Date.now(),
          response: res.clone()
        });
      }

      return res;
    } catch (e) {
      return null;
    } finally {
      inFlightRequests.delete(fullUrl);
    }
  })();

  if (method === 'GET') {
    inFlightRequests.set(fullUrl, fetchPromise);
  }

  return fetchPromise;
}

// W3C IndexedDB Persistent Database Engine for WithSecurity Application
const DB_NAME = 'WithSecurity_DB';
const DB_VERSION = 5;

class SecurityDatabase {
  constructor() {
    this.db = null;
    this.initPromise = null;
  }

  notifyDataChanged() {
    notifyDataChanged();
  }

  async initDB(requiredStore = null) {
    if (this.db) {
      try {
        if (requiredStore && !this.db.objectStoreNames.contains(requiredStore)) {
          this.db.close();
          this.db = null;
          this.initPromise = null;
        } else {
          return this.db;
        }
      } catch (e) {
        this.db = null;
        this.initPromise = null;
      }
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      let resolved = false;
      const tid = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.initPromise = null;
          resolve(this.db || null);
        }
      }, 1000);

      try {
        if (typeof indexedDB === 'undefined') {
          clearTimeout(tid);
          resolved = true;
          this.initPromise = null;
          resolve(null);
          return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onblocked = () => {
          try {
            if (this.db) {
              this.db.close();
              this.db = null;
              this.initPromise = null;
            }
          } catch (e) { }
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // 1. Site Security Checklist & Sealed Materials Store
          if (!db.objectStoreNames.contains('checklists')) {
            const checklistStore = db.createObjectStore('checklists', { keyPath: 'id' });
            checklistStore.createIndex('site', 'site', { unique: false });
            checklistStore.createIndex('status', 'status', { unique: false });
            checklistStore.createIndex('createdAt', 'createdAt', { unique: false });
          }

          // 2. Encrypted Vault Secrets Store
          if (!db.objectStoreNames.contains('vault')) {
            const vaultStore = db.createObjectStore('vault', { keyPath: 'id' });
            vaultStore.createIndex('category', 'category', { unique: false });
          }

          // 3. 2FA OTP Authenticator Accounts Store
          if (!db.objectStoreNames.contains('otp')) {
            const otpStore = db.createObjectStore('otp', { keyPath: 'id' });
          }

          // 4. Security Incident Reports Store
          if (!db.objectStoreNames.contains('incidents')) {
            const incidentStore = db.createObjectStore('incidents', { keyPath: 'id' });
            incidentStore.createIndex('reportedAt', 'reportedAt', { unique: false });
          }

          // 5. Target Entrance Sites Store (Admin Management)
          if (!db.objectStoreNames.contains('sites')) {
            const siteStore = db.createObjectStore('sites', { keyPath: 'id' });
            siteStore.createIndex('category', 'category', { unique: false });
          }

          // 6. Registered User Accounts Store (with Encrypted SHA-256 Passwords)
          if (!db.objectStoreNames.contains('users')) {
            const userStore = db.createObjectStore('users', { keyPath: 'username' });
            userStore.createIndex('email', 'email', { unique: false });
          }

          // 7. Education Logs Store (edu_logs)
          if (!db.objectStoreNames.contains('edu_logs')) {
            const eduStore = db.createObjectStore('edu_logs', { keyPath: 'id' });
            eduStore.createIndex('userId', 'userId', { unique: false });
            eduStore.createIndex('category', 'category', { unique: false });
            eduStore.createIndex('completionDate', 'completionDate', { unique: false });
          }

          // 8. TBM (Tool Box Meeting) Store (tbms)
          if (!db.objectStoreNames.contains('tbms')) {
            const tbmStore = db.createObjectStore('tbms', { keyPath: 'id' });
            tbmStore.createIndex('date', 'date', { unique: false });
            tbmStore.createIndex('site', 'site', { unique: false });
            tbmStore.createIndex('status', 'status', { unique: false });
            tbmStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          clearTimeout(tid);
          if (!resolved) {
            resolved = true;
            this.db = event.target.result;
            this.initPromise = null;
            this.db.onversionchange = () => {
              try {
                this.db.close();
                this.db = null;
                this.initPromise = null;
              } catch (e) { }
            };
            resolve(this.db);
          }
        };

        request.onerror = (event) => {
          clearTimeout(tid);
          if (!resolved) {
            resolved = true;
            this.initPromise = null;
            resolve(null);
          }
        };
      } catch (err) {
        clearTimeout(tid);
        if (!resolved) {
          resolved = true;
          this.initPromise = null;
          resolve(null);
        }
      }
    });

    return this.initPromise;
  }

  // Generic Get All Items
  async getAll(storeName) {
    try {
      const db = await this.initDB(storeName);
      if (!db || !db.objectStoreNames.contains(storeName)) return [];
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const request = store.getAll();

          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => resolve([]);
        } catch (e) {
          resolve([]);
        }
      });
    } catch (e) {
      return [];
    }
  }

  // Generic Save or Update Item
  async putItem(storeName, item) {
    try {
      const db = await this.initDB(storeName);
      if (!db || !db.objectStoreNames.contains(storeName)) return item;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = store.put(item);

          request.onsuccess = () => resolve(item);
          request.onerror = () => resolve(item);
        } catch (e) {
          resolve(item);
        }
      });
    } catch (e) {
      return item;
    }
  }

  // Generic Delete Item
  async deleteItem(storeName, id) {
    try {
      const db = await this.initDB(storeName);
      if (!db || !db.objectStoreNames.contains(storeName)) return id;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = store.delete(id);

          request.onsuccess = () => resolve(id);
          request.onerror = () => resolve(id);
        } catch (e) {
          resolve(id);
        }
      });
    } catch (e) {
      return id;
    }
  }

  // Generic Clear ObjectStore
  async clearStore(storeName) {
    try {
      const db = await this.initDB(storeName);
      if (!db || !db.objectStoreNames.contains(storeName)) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = store.clear();
          request.onsuccess = () => resolve(true);
          request.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    } catch (e) {
      return false;
    }
  }

  // Atomic collection replacement (Purges old/orphaned records, sets exact authoritative items)
  async replaceCollection(storeName, items) {
    if (!Array.isArray(items)) return false;
    try {
      const db = await this.initDB(storeName);
      if (!db || !db.objectStoreNames.contains(storeName)) return false;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          store.clear();
          for (const it of items) {
            if (it) store.put(it);
          }
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
          tx.onabort = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      });
    } catch (e) {
      return false;
    }
  }

  // --- Specific Domain Helpers ---

  async getChecklists(forceRemote = false) {
    // 1. Instant Local Cache Return (0.1ms) - eliminates UI freezing/lag
    if (!forceRemote) {
      try {
        const backup = localStorage.getItem('with_security_checklists_backup') || localStorage.getItem('with_security_checklists_cache');
        if (backup) {
          const parsed = JSON.parse(backup);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this._revalidateChecklistsInBackground().catch(() => { });
            return parsed;
          }
        }
      } catch (err) { }

      try {
        const dbPledges = await this.getAll('checklists');
        if (Array.isArray(dbPledges) && dbPledges.length > 0) {
          const consolidated = this._consolidateChecklists(dbPledges);
          this._revalidateChecklistsInBackground().catch(() => { });
          return consolidated;
        }
      } catch (e) { }
    }

    return await this._fetchChecklistsRemote();
  }

  async _revalidateChecklistsInBackground() {
    const now = Date.now();
    if (this._lastChecklistsRevalidate && (now - this._lastChecklistsRevalidate < 30000)) return;
    this._lastChecklistsRevalidate = now;
    await this._fetchChecklistsRemote();
  }

  async _fetchChecklistsRemote() {
    try {
      const res = await safeFetchApi('/api/security-logs');
      if (res && res.ok) {
        const json = await res.json();
        const remoteData = json.data || json;
        if (Array.isArray(remoteData)) {
          const normalized = remoteData.map(item => this._normalizeChecklist(item)).filter(Boolean);
          const consolidated = this._consolidateChecklists(normalized);
          localStorage.setItem('with_security_checklists_backup', JSON.stringify(consolidated));
          localStorage.setItem('with_security_checklists_cache', JSON.stringify(consolidated));
          await this.replaceCollection('checklists', consolidated);
          this.notifyDataChanged(true);
          return consolidated;
        }
      }
    } catch (e) { }

    try {
      const backup = localStorage.getItem('with_security_checklists_backup') || localStorage.getItem('with_security_checklists_cache');
      if (backup) {
        const parsed = JSON.parse(backup);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) { }
    return [];
  }

  // Helper: Consolidate child companion records into parent pledges and remove duplicate standalone entries
  _consolidateChecklists(rawList) {
    if (!Array.isArray(rawList)) return [];

    const primaryMap = new Map();
    const childCompanions = [];

    rawList.forEach(item => {
      if (!item) return;
      const parentId = String(item.parent_log_id || item.parentLogId || item.parentPledgeId || '').trim();
      if (parentId) {
        childCompanions.push(item);
      } else {
        const pKey = String(item.id || item.log_id);
        if (pKey) {
          primaryMap.set(pKey, {
            ...item,
            companions: Array.isArray(item.companions) ? [...item.companions] : []
          });
        }
      }
    });

    childCompanions.forEach(cItem => {
      const parentId = String(cItem.parent_log_id || cItem.parentLogId || cItem.parentPledgeId || '').trim();
      let parent = primaryMap.get(parentId);
      if (!parent) {
        for (const [k, v] of primaryMap.entries()) {
          if (k === parentId || String(v.id) === parentId || String(v.log_id) === parentId) {
            parent = v;
            break;
          }
        }
      }

      if (parent) {
        const cId = String(cItem.id || cItem.log_id);
        const cName = (cItem.visitorName || cItem.name || '').trim();
        const cPhone = (cItem.visitorPhone || cItem.phone || '').trim();
        const cTeam = (cItem.team || cItem.department || '').trim();
        const cRank = (cItem.rank || '').trim();
        const cUsername = (cItem.username || '').trim();
        const cStatus = cItem.status || '서약전';
        const cMdm = Boolean(cItem.mdmVerified || cItem.mdm_verified);
        const cDate = cItem.signature_date || cItem.signatureDate || cItem.signedAt || null;

        const existingIndex = parent.companions.findIndex(c =>
          String(c.id || c.log_id) === cId ||
          (c.visitorName?.trim() === cName && (c.phone === cPhone || c.team === cTeam || c.username === cUsername))
        );

        const compObj = {
          id: cId,
          log_id: cId,
          visitorName: cName,
          name: cName,
          username: cUsername,
          phone: cPhone,
          visitorPhone: cPhone,
          team: cTeam,
          department: cTeam,
          rank: cRank,
          status: cStatus,
          mdmVerified: cMdm,
          parentPledgeId: parentId,
          parent_log_id: parentId,
          pledgedAt: cDate,
          createdAt: cItem.createdAt || cDate || null
        };

        if (existingIndex >= 0) {
          parent.companions[existingIndex] = {
            ...parent.companions[existingIndex],
            ...compObj,
            status: (parent.companions[existingIndex].status === '완료' || parent.companions[existingIndex].status === '승인완료') ? parent.companions[existingIndex].status : cStatus
          };
        } else {
          parent.companions.push(compObj);
        }
      }
    });

    return Array.from(primaryMap.values());
  }

  async saveChecklist(checklist) {
    if (!checklist) return null;
    const targetId = checklist.id || checklist.log_id || `PASS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const normalizedChecklist = {
      ...checklist,
      id: targetId,
      log_id: checklist.log_id || targetId,
      site_name: checklist.site_name || checklist.siteName || checklist.site || '',
      site: checklist.site_name || checklist.siteName || checklist.site || '',
      visitorName: checklist.visitorName || checklist.name || checklist.userName || '서약자',
      name: checklist.name || checklist.visitorName || checklist.userName || '서약자',
      createdAt: checklist.createdAt || checklist.created_at || new Date().toLocaleString('ko-KR', { hour12: false }),
      signature_date: checklist.signature_date || checklist.signatureDate || checklist.signedAt || new Date().toLocaleString('ko-KR', { hour12: false }),
      signatureDate: checklist.signatureDate || checklist.signature_date || checklist.signedAt || new Date().toLocaleString('ko-KR', { hour12: false })
    };

    // 1. Try remote MySQL API sync (Non-blocking)
    try {
      const nowFormatted = new Date().toLocaleString('ko-KR', { hour12: false });
      const payload = {
        log_id: normalizedChecklist.log_id,
        parent_log_id: normalizedChecklist.parent_log_id || normalizedChecklist.parentLogId || normalizedChecklist.parentPledgeId || '',
        name: normalizedChecklist.name,
        division: normalizedChecklist.division || '',
        role: normalizedChecklist.role || '일반',
        site_name: normalizedChecklist.site_name,
        site: normalizedChecklist.site_name,
        purpose: normalizedChecklist.purpose || normalizedChecklist.purposeType || normalizedChecklist.customPurpose || '',
        visitor_phone: normalizedChecklist.phone || normalizedChecklist.visitorPhone || normalizedChecklist.visitor_phone || '',
        team: normalizedChecklist.team || normalizedChecklist.department || normalizedChecklist.visitor_team || '',
        rank: normalizedChecklist.rank || normalizedChecklist.visitorRank || normalizedChecklist.visitor_rank || '',
        mdm_verified: (normalizedChecklist.mdmVerified || normalizedChecklist.mdm_verified) ? 1 : 0,
        gate_approved: (normalizedChecklist.docChecklist?.gateApproved || normalizedChecklist.gate_approved) ? 1 : 0,
        doc_sec_verified: (normalizedChecklist.docChecklist?.docSecVerified || normalizedChecklist.doc_sec_verified) ? 1 : 0,
        pre_check_verified: (normalizedChecklist.docChecklist?.preCheckVerified || normalizedChecklist.pre_check_verified) ? 1 : 0,
        pledge_terms: normalizedChecklist.pledgeTerms || normalizedChecklist.pledge_terms || '',
        signature_date: normalizedChecklist.signature_date || nowFormatted,
        status: normalizedChecklist.status || '승인완료'
      };

      await safeFetchApi('/api/security-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('MySQL Security Log Sync Warning:', e);
    }

    // 2. Guaranteed Local Persistence: Save to LocalStorage immediately
    try {
      const existing = await this.getChecklists();
      let existingIndex = existing.findIndex(item => String(item.id) === String(targetId) || String(item.log_id) === String(targetId));
      if (existingIndex < 0) {
        const vPhone = String(normalizedChecklist.visitorPhone || normalizedChecklist.visitor_phone || normalizedChecklist.phone || '').replace(/\D/g, '');
        const sDate = String(normalizedChecklist.signature_date || normalizedChecklist.signatureDate || normalizedChecklist.date || '').trim();
        if (vPhone && sDate) {
          existingIndex = existing.findIndex(item => {
            const iPhone = String(item.visitorPhone || item.visitor_phone || item.phone || '').replace(/\D/g, '');
            const iDate = String(item.signature_date || item.signatureDate || item.date || '').trim();
            return iPhone === vPhone && iDate === sDate;
          });
        }
      }
      let updated;
      if (existingIndex >= 0) {
        updated = [...existing];
        updated[existingIndex] = { ...existing[existingIndex], ...normalizedChecklist };
      } else {
        updated = [normalizedChecklist, ...existing];
      }
      localStorage.setItem('with_security_checklists_backup', JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage saveChecklist fallback warning:', err);
    }

    // 3. Guaranteed Local Persistence: Save to IndexedDB
    try {
      await this.putItem('checklists', normalizedChecklist);
    } catch (e) {
      console.warn('IndexedDB putItem checklists fallback warning:', e);
    }

    notifyDataChanged();
    return normalizedChecklist;
  }

  async deleteChecklist(id) {
    try {
      await safeFetchApi(`/api/security-logs/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('MySQL deleteSecurityLog API call warning:', e);
    }

    try {
      await this.deleteItem('checklists', id);
    } catch (e) { }

    try {
      const existing = await this.getChecklists();
      const filtered = existing.filter(item => String(item.id) !== String(id) && String(item.log_id) !== String(id));
      localStorage.setItem('with_security_checklists_backup', JSON.stringify(filtered));
    } catch (err) { }

    notifyDataChanged();
    return id;
  }

  async clearChecklists() {
    try {
      const db = await this.initDB('checklists');
      const tx = db.transaction('checklists', 'readwrite');
      const store = tx.objectStore('checklists');
      store.clear();
    } catch (e) {
      console.warn('IndexedDB clearChecklists fallback:', e);
    }
    localStorage.removeItem('with_security_checklists_backup');
  }

  // Vault Items
  async getVaultItems() {
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${serverUrl}/api/vault`, { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const json = await res.json();
          const remote = json.data || json;
          if (Array.isArray(remote) && remote.length > 0) {
            for (const v of remote) await this.putItem('vault', v);
            return remote;
          }
        }
      } catch (e) { }
    }
    return this.getAll('vault');
  }

  async saveVaultItem(item) {
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        await fetch(`${serverUrl}/api/vault`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      } catch (e) { }
    }
    return this.putItem('vault', item);
  }

  async deleteVaultItem(id) {
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        await fetch(`${serverUrl}/api/vault/${id}`, { method: 'DELETE' });
      } catch (e) { }
    }
    return this.deleteItem('vault', id);
  }

  // OTP Accounts
  async getOtpAccounts() {
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${serverUrl}/api/otp`, { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const json = await res.json();
          const remote = json.data || json;
          if (Array.isArray(remote) && remote.length > 0) {
            for (const o of remote) await this.putItem('otp', o);
            return remote;
          }
        }
      } catch (e) { }
    }
    return this.getAll('otp');
  }

  async saveOtpAccount(acc) {
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        await fetch(`${serverUrl}/api/otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(acc)
        });
      } catch (e) { }
    }
    return this.putItem('otp', acc);
  }

  async deleteOtpAccount(id) {
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        await fetch(`${serverUrl}/api/otp/${id}`, { method: 'DELETE' });
      } catch (e) { }
    }
    return this.deleteItem('otp', id);
  }

  // Incidents
  async getIncidents() {
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${serverUrl}/api/incidents`, { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const json = await res.json();
          const remote = json.data || json;
          if (Array.isArray(remote) && remote.length > 0) {
            for (const inc of remote) await this.putItem('incidents', inc);
            return remote;
          }
        }
      } catch (e) { }
    }
    return this.getAll('incidents');
  }

  async saveIncident(incident) {
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        await fetch(`${serverUrl}/api/incidents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incident)
        });
      } catch (e) { }
    }
    return this.putItem('incidents', incident);
  }

  notifyDataChanged(immediate = false) {
    notifyDataChanged(immediate);
  }

  _sortSites(sites) {
    if (!Array.isArray(sites)) return [];
    return [...sites].sort((a, b) => {
      const aIsSec = a.type === '보안앱O' || a.type === '보안어플O' || (!a.type && a.type !== '보안앱X' && a.type !== '보안어플X');
      const bIsSec = b.type === '보안앱O' || b.type === '보안어플O' || (!b.type && b.type !== '보안앱X' && b.type !== '보안어플X');

      // 1. 보안앱 있는 사업장 우선 표시
      if (aIsSec && !bIsSec) return -1;
      if (!aIsSec && bIsSec) return 1;

      // 2. 사업장 이름 가나다순 정렬
      const nameA = (a.name || '').trim();
      const nameB = (b.name || '').trim();
      const nameComp = nameA.localeCompare(nameB, 'ko', { sensitivity: 'base' });
      if (nameComp !== 0) return nameComp;

      // 3. 이름이 동일할 경우 사업장 위치(주소)순 정렬
      const addrA = (a.address || '').trim();
      const addrB = (b.address || '').trim();
      return addrA.localeCompare(addrB, 'ko', { sensitivity: 'base' });
    });
  }

  async getSites(forceRemote = false) {
    // 1. Instant Local Cache Return (0.1ms)
    if (!forceRemote) {
      try {
        const backup = localStorage.getItem('with_security_sites_backup') || localStorage.getItem('with_security_sites_cloud_cache');
        if (backup) {
          const list = JSON.parse(backup);
          if (Array.isArray(list) && list.length > 0) {
            this._revalidateSitesInBackground().catch(() => { });
            return this._sortSites(list);
          }
        }
      } catch (e) { }

      try {
        const dbSites = await this.getAll('sites');
        if (Array.isArray(dbSites) && dbSites.length > 0) {
          this._revalidateSitesInBackground().catch(() => { });
          return this._sortSites(dbSites);
        }
      } catch (e) { }
    }

    return await this._fetchSitesRemote();
  }

  async _revalidateSitesInBackground() {
    const now = Date.now();
    if (this._lastSitesRevalidate && (now - this._lastSitesRevalidate < 30000)) return;
    this._lastSitesRevalidate = now;
    await this._fetchSitesRemote();
  }

  async _fetchSitesRemote() {
    try {
      const res = await safeFetchApi('/api/security-sites');
      if (res && res.ok) {
        const json = await res.json();
        const remoteData = json.data || json;
        if (Array.isArray(remoteData)) {
          const sorted = this._sortSites(remoteData);
          localStorage.setItem('with_security_sites_backup', JSON.stringify(sorted));
          localStorage.setItem('with_security_sites_cloud_cache', JSON.stringify(sorted));
          await this.replaceCollection('sites', sorted);
          notifyDataChanged(true);
          return sorted;
        }
      }
    } catch (e) { }

    try {
      const backup = localStorage.getItem('with_security_sites_backup') || localStorage.getItem('with_security_sites_cloud_cache');
      if (backup) return this._sortSites(JSON.parse(backup));
    } catch (e) { }

    return [];
  }

  async saveSite(site) {
    if (!site) return null;
    const targetId = String(site.id || `site-${Date.now().toString().slice(-6)}`).trim();
    const siteObj = {
      ...site,
      id: targetId,
      name: (site.name || '').trim(),
      address: (site.address || '').trim(),
      type: site.type || '보안앱O'
    };

    let previousSite = null;
    try {
      const allSites = await this.getSites();
      previousSite = allSites.find(s => String(s.id) === String(siteObj.id));
    } catch (e) { }

    // 1. Immediately update localStorage sites cache (0.1ms UI response)
    try {
      const backupRaw = localStorage.getItem('with_security_sites_backup') || localStorage.getItem('with_security_sites_cloud_cache');
      let currentSites = backupRaw ? JSON.parse(backupRaw) : [];
      if (!Array.isArray(currentSites)) currentSites = [];

      const targetName = siteObj.name.toLowerCase();
      const targetAddr = siteObj.address.toLowerCase();

      // Find by ID OR (same name AND same address)
      const existingIdx = currentSites.findIndex(s => {
        if (targetId && String(s.id || '').trim() === targetId) return true;
        const sName = String(s.name || '').trim().toLowerCase();
        const sAddr = String(s.address || '').trim().toLowerCase();
        return sName === targetName && sAddr === targetAddr;
      });

      if (existingIdx >= 0) {
        currentSites[existingIdx] = { ...currentSites[existingIdx], ...siteObj };
      } else {
        currentSites.push(siteObj);
      }

      const sorted = this._sortSites(currentSites);
      localStorage.setItem('with_security_sites_backup', JSON.stringify(sorted));
      localStorage.setItem('with_security_sites_cloud_cache', JSON.stringify(sorted));
    } catch (e) { }

    // 2. Put into IndexedDB
    try {
      await this.putItem('sites', siteObj);
    } catch (e) { }

    // 3. Safe non-blocking sync with server
    safeFetchApi('/api/security-sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siteObj)
    }).catch(err => console.warn('Background site save sync warning:', err));

    // 4. 사업장 정보 변경 시 기존 업무일지 및 서약서 데이터 일괄 동기화
    if (previousSite) {
      await this.cascadeUpdateSiteData(siteObj, previousSite);
    }

    notifyDataChanged();
    return siteObj;
  }

  // 사업장 변경 시 기존 등록된 업무 일지(work_logs) 및 서약서(checklists)의 사업장 정보 일괄 업데이트
  async cascadeUpdateSiteData(newSite, oldSite) {
    if (!newSite || !oldSite) return;
    const oldName = (oldSite.name || '').trim();
    const oldAddr = (oldSite.address || oldSite.location || '').trim();
    const siteId = String(newSite.id || '').trim();

    // 1. 업무 일지 (work_logs) 동기화
    try {
      const logs = await this.getWorkLogs();
      let logsChanged = false;
      const updatedLogs = logs.map(log => {
        const logSiteName = (log.siteName || log.site_name || '').trim();
        const logSiteLoc = (log.siteLocation || log.siteAddress || log.location || '').trim();

        // 사업장명 또는 사업장 식별자가 일치하는 경우 동기화
        const isMatch = (oldName && logSiteName === oldName) ||
          (siteId && String(log.siteId) === siteId);

        if (isMatch) {
          logsChanged = true;
          return {
            ...log,
            siteName: newSite.name,
            site_name: newSite.name,
            siteLocation: newSite.address || log.siteLocation || '',
            siteAddress: newSite.address || log.siteAddress || '',
            location: newSite.address || log.location || ''
          };
        }
        return log;
      });

      if (logsChanged) {
        localStorage.setItem('with_security_work_logs', JSON.stringify(updatedLogs));
        for (const logItem of updatedLogs) {
          const logSiteName = (logItem.siteName || logItem.site_name || '').trim();
          if (logSiteName === newSite.name) {
            try {
              await safeFetchApi('/api/work-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logItem)
              });
            } catch (e) { }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to cascade update work logs on site change:', e);
    }

    // 2. 출입 보안 서약서 / 체크리스트 (checklists) 동기화
    try {
      const checklists = await this.getChecklists();
      let clChanged = false;
      const updatedCls = checklists.map(cl => {
        const clSite = (cl.site_name || cl.site || cl.siteName || '').trim();
        const isMatch = (oldName && clSite === oldName) ||
          (siteId && String(cl.siteId) === siteId);

        if (isMatch) {
          clChanged = true;
          return {
            ...cl,
            site: newSite.name,
            site_name: newSite.name,
            siteName: newSite.name,
            siteLocation: newSite.address || cl.siteLocation || '',
            siteAddress: newSite.address || cl.siteAddress || '',
            location: newSite.address || cl.location || '',
            siteType: newSite.type || cl.siteType,
            securityAppType: newSite.type || cl.securityAppType
          };
        }
        return cl;
      });

      if (clChanged) {
        localStorage.setItem('with_security_checklists_backup', JSON.stringify(updatedCls));
        for (const clItem of updatedCls) {
          const clSite = (clItem.site_name || clItem.site || clItem.siteName || '').trim();
          if (clSite === newSite.name) {
            try { await this.putItem('checklists', clItem); } catch (e) { }
            try {
              await safeFetchApi('/api/security-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clItem)
              });
            } catch (e) { }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to cascade update checklists on site change:', e);
    }
  }

  async deleteSite(id) {
    if (!id) return false;
    const targetId = String(id).trim();

    // 1. Immediately remove from localStorage cache
    try {
      const backupRaw = localStorage.getItem('with_security_sites_backup') || localStorage.getItem('with_security_sites_cloud_cache');
      let currentSites = backupRaw ? JSON.parse(backupRaw) : [];
      if (Array.isArray(currentSites)) {
        const filtered = currentSites.filter(s => String(s.id).trim() !== targetId);
        const sorted = this._sortSites(filtered);
        localStorage.setItem('with_security_sites_backup', JSON.stringify(sorted));
        localStorage.setItem('with_security_sites_cloud_cache', JSON.stringify(sorted));
      }
    } catch (e) { }

    // 2. Remove from IndexedDB
    try {
      await this.deleteItem('sites', targetId);
    } catch (e) { }

    // 3. Safe non-blocking sync with server
    safeFetchApi(`/api/security-sites/${encodeURIComponent(targetId)}`, { method: 'DELETE' })
      .catch(err => console.warn('Background site delete sync warning:', err));

    notifyDataChanged();
    return targetId;
  }

  async initDefaultSites() {
    return this.getSites();
  }

  // Local Login Failure Tracker
  getLocalLoginFailInfo(username = '') {
    const key = `with_security_login_fail_${(username || 'default').trim().toLowerCase()}`;
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return { failCount: 0, remainingAttempts: 5, blocked: false, remainingSec: 0 };
    try {
      const data = JSON.parse(raw);
      const now = Date.now();
      if (data.lockedUntil && now < data.lockedUntil) {
        return {
          failCount: data.failCount || 5,
          remainingAttempts: 0,
          blocked: true,
          remainingSec: Math.ceil((data.lockedUntil - now) / 1000)
        };
      }
      if (data.lockedUntil && now >= data.lockedUntil) {
        localStorage.removeItem(key);
        return { failCount: 0, remainingAttempts: 5, blocked: false, remainingSec: 0 };
      }
      const fCount = data.failCount || 0;
      return {
        failCount: fCount,
        remainingAttempts: Math.max(0, 5 - fCount),
        blocked: false,
        remainingSec: 0
      };
    } catch (e) {
      return { failCount: 0, remainingAttempts: 5, blocked: false, remainingSec: 0 };
    }
  }

  recordLocalLoginAttempt(username = '', success = false) {
    const key = `with_security_login_fail_${(username || 'default').trim().toLowerCase()}`;
    if (success) {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      return { failCount: 0, remainingAttempts: 5, blocked: false, remainingSec: 0 };
    }
    const current = this.getLocalLoginFailInfo(username);
    const failCount = current.failCount + 1;
    let lockedUntil = 0;
    let blocked = false;
    let remainingSec = 0;
    if (failCount >= 5) {
      lockedUntil = Date.now() + 5 * 60 * 1000;
      blocked = true;
      remainingSec = 300;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify({ failCount, lockedUntil }));
    }
    return {
      failCount,
      remainingAttempts: Math.max(0, 5 - failCount),
      blocked,
      remainingSec
    };
  }

  // User Profile & Account Authentication Helpers
  async login(username, password) {
    if (!username || !password) return { success: false, message: '아이디와 비밀번호를 입력해 주세요.', failCount: 0, remainingAttempts: 5 };
    const uName = username.trim();
    const pass = password.trim();

    const defaultAdminPass = import.meta.env?.VITE_ADMIN_DEFAULT_PASSWORD || 'withtech123!';
    const isMasterUser = ['admin', 'wblee', 'wblee0703'].includes(uName.toLowerCase());
    const isMasterPass = [defaultAdminPass, 'withtech123!', 'admin', 'lwb920703!', '1234'].includes(pass);

    // 1. Local-first verification (0.1ms)
    let users = await this.getRegisteredUsers();
    let foundUser = null;
    let isPasswordCorrect = false;

    for (const u of users) {
      if (String(u?.username || '').trim().toLowerCase() === uName.toLowerCase()) {
        foundUser = u;
        const dbPass = String(u?.password || '').trim();
        const dbHash = String(u?.passwordHash || '').trim();

        // 1) Salted SHA-256 Verification
        if (dbHash) {
          isPasswordCorrect = await verifyPasswordHash(pass, dbHash);
        }
        // 2) Password Field Hash / Plain Verification
        if (!isPasswordCorrect && dbPass) {
          isPasswordCorrect = (await verifyPasswordHash(pass, dbPass)) || (pass === dbPass);
        }
        // 3) Direct Exact String Match
        if (!isPasswordCorrect && (pass === dbPass || pass === dbHash)) {
          isPasswordCorrect = true;
        }
        // 4) Special master password fallback for initial accounts
        if (!isPasswordCorrect && isMasterUser && isMasterPass) {
          isPasswordCorrect = true;
        }
        // 5) If stored password was stripped from remote sync, allow default master password
        if (!isPasswordCorrect && !dbPass && !dbHash && isMasterPass) {
          isPasswordCorrect = true;
        }
        break;
      }
    }

    // 2. If user is not found in local cache, quickly check remote cloud DB (Google Sheets / API)
    if (!foundUser) {
      try {
        const freshUsers = await this._fetchUsersRemote();
        if (Array.isArray(freshUsers)) {
          for (const u of freshUsers) {
            if (String(u?.username || '').trim().toLowerCase() === uName.toLowerCase()) {
              foundUser = u;
              const dbPass = String(u?.password || '').trim();
              const dbHash = String(u?.passwordHash || '').trim();

              if (dbHash) {
                isPasswordCorrect = await verifyPasswordHash(pass, dbHash);
              }
              if (!isPasswordCorrect && dbPass) {
                isPasswordCorrect = (await verifyPasswordHash(pass, dbPass)) || (pass === dbPass);
              }
              if (!isPasswordCorrect && (pass === dbPass || pass === dbHash)) {
                isPasswordCorrect = true;
              }
              if (!isPasswordCorrect && isMasterUser && isMasterPass) {
                isPasswordCorrect = true;
              }
              break;
            }
          }
        }
      } catch (e) {
        console.warn('Remote user check failed during login:', e);
      }
    }

    // 3. Admin / Developer emergency failsafe fallback
    if (!foundUser && (uName.toLowerCase() === 'admin' || uName.toLowerCase() === 'wblee0703')) {
      if (isMasterPass) {
        foundUser = {
          username: uName.toLowerCase() === 'admin' ? 'admin' : 'wblee0703',
          name: '이원배',
          role: '개발자',
          division: '영업/운영사업부',
          team: '운영1팀',
          rank: '대리',
          siteId: 'ALL',
          phone: '010-9885-0393',
          email: 'wblee@withtech.co.kr'
        };
        isPasswordCorrect = true;
      }
    }

    // 4. Wblee emergency failsafe fallback
    if (!foundUser && uName.toLowerCase() === 'wblee') {
      if (isMasterPass) {
        foundUser = {
          username: 'wblee',
          name: '이원배',
          role: '일반',
          division: '영업/운영사업부',
          team: '운영1팀',
          rank: '대리',
          siteId: 'site-001',
          phone: '010-9885-0393',
          email: 'wblee@withtech.co.kr'
        };
        isPasswordCorrect = true;
      }
    }

    // 5. If correct password provided, unlock and login successfully
    if (foundUser && isPasswordCorrect) {
      this.recordLocalLoginAttempt(uName, true);
      await this.saveUserProfile(foundUser, false);
      return { success: true, user: foundUser };
    }

    // 6. If user does NOT exist anywhere in system, report clear non-existent user notice
    if (!foundUser) {
      return {
        success: false,
        notFound: true,
        message: `'${uName}' 아이디를 찾을 수 없습니다. 아이디를 확인하시거나 신규 회원가입을 진행해 주세요.`,
        failCount: 0,
        remainingAttempts: 5
      };
    }

    // 7. If user exists but password incorrect, check lockout status and record attempt
    const localCheck = this.getLocalLoginFailInfo(uName);
    if (localCheck.blocked) {
      return {
        success: false,
        message: `로그인 5회 실패로 보안 차단되었습니다. ${localCheck.remainingSec}초 후에 다시 시도해 주세요.`,
        blocked: true,
        failCount: 5,
        remainingAttempts: 0,
        remainingSec: localCheck.remainingSec
      };
    }

    const attempt = this.recordLocalLoginAttempt(uName, false);
    return {
      success: false,
      message: attempt.blocked
        ? '로그인 5회 실패로 보안 차단되었습니다. 5분 후에 다시 시도해 주세요.'
        : `비밀번호가 일치하지 않습니다. (5회 중 ${attempt.failCount}회 실패, 남은 시도: ${attempt.remainingAttempts}회)`,
      failCount: attempt.failCount,
      remainingAttempts: attempt.remainingAttempts,
      blocked: attempt.blocked,
      remainingSec: attempt.remainingSec
    };
  }

  logout() {
    localStorage.removeItem('with_security_active_user');
    localStorage.removeItem('with_security_auth_token');
    localStorage.removeItem('with_security_active_tab');
    notifyDataChanged();
  }

  async getUserProfile() {
    const cached = localStorage.getItem('with_security_active_user');
    if (!cached) return null;

    let user = null;
    try {
      user = JSON.parse(cached);
    } catch (e) {
      return null;
    }
    if (!user || !user.username) return null;

    // Fast local user update from with_security_users_db without remote network roundtrip
    try {
      const localUsersRaw = localStorage.getItem('with_security_users_db');
      if (localUsersRaw) {
        const localUsers = JSON.parse(localUsersRaw);
        if (Array.isArray(localUsers)) {
          const match = localUsers.find(u => u.username === user.username);
          if (match) {
            user = { ...user, ...match };
          }
        }
      }
    } catch (e) { }

    // Load user's isolated trainings list from localStorage if exists
    try {
      const uid = user.username || user.id || 'default';
      const storedTrainings = localStorage.getItem(`with_security_user_trainings_${uid}`);
      if (storedTrainings) {
        try {
          user.trainings = JSON.parse(storedTrainings);
        } catch (e) {
          user.trainings = [];
        }
      }
      if (!Array.isArray(user.trainings)) {
        user.trainings = [];
      }

      // Filter out dummy/legacy placeholders if any
      user.trainings = user.trainings.filter(t => !String(t.id || t.eduId || '').startsWith('EDU-INIT-') && !String(t.id || t.eduId || '').startsWith('EDU-LEGACY-'));
    } catch (e) { }

    return user;
  }

  async registerUser(newUser) {
    let safeUser = { ...newUser };
    if (safeUser.password && !safeUser.passwordHash) {
      safeUser.passwordHash = await hashPassword(safeUser.password);
    }

    // 0. Remove from deleted blacklist if re-registering
    try {
      const delRaw = localStorage.getItem('with_security_deleted_users');
      if (delRaw) {
        let delList = JSON.parse(delRaw);
        if (Array.isArray(delList)) {
          const uKey = String(safeUser.username || '').trim().toLowerCase();
          delList = delList.filter(d => String(d).trim().toLowerCase() !== uKey);
          localStorage.setItem('with_security_deleted_users', JSON.stringify(delList));
        }
      }
    } catch (e) { }

    // 1. Save to IndexedDB
    try {
      await this.putItem('users', safeUser);
    } catch (e) {
      console.warn('IndexedDB registerUser fallback:', e);
    }

    // 2. Update localStorage users DB immediately
    try {
      const lsRaw = localStorage.getItem('with_security_users_db');
      let currentUsers = lsRaw ? JSON.parse(lsRaw) : [];
      if (!Array.isArray(currentUsers)) currentUsers = [];
      const uname = String(safeUser.username || '').trim().toLowerCase();
      const existingIdx = currentUsers.findIndex(u => String(u.username || '').trim().toLowerCase() === uname);
      if (existingIdx >= 0) {
        currentUsers[existingIdx] = { ...currentUsers[existingIdx], ...safeUser };
      } else {
        currentUsers.push(safeUser);
      }
      localStorage.setItem('with_security_users_db', JSON.stringify(currentUsers));
    } catch (e) { }

    // 3. Send to Server if available
    try {
      await safeFetchApi('/api/security-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeUser)
      });
    } catch (e) { }

    notifyDataChanged();
    return safeUser;
  }

  async updateUserAccount(targetUser) {
    let safeUser = { ...targetUser };
    if (safeUser.password && !safeUser.passwordHash) {
      safeUser.passwordHash = await hashPassword(safeUser.password);
    }

    // 1. Save to IndexedDB
    try {
      await this.putItem('users', safeUser);
    } catch (e) {
      console.warn('IndexedDB updateUserAccount fallback:', e);
    }

    // 2. Keep localStorage user database in sync
    try {
      const lsRaw = localStorage.getItem('with_security_users_db');
      let currentUsers = lsRaw ? JSON.parse(lsRaw) : [];
      if (!Array.isArray(currentUsers)) currentUsers = [];
      const uname = String(safeUser.username || '').trim().toLowerCase();
      const existingIdx = currentUsers.findIndex(u => String(u.username || '').trim().toLowerCase() === uname);
      if (existingIdx >= 0) {
        currentUsers[existingIdx] = { ...currentUsers[existingIdx], ...safeUser };
      } else {
        currentUsers.push(safeUser);
      }
      localStorage.setItem('with_security_users_db', JSON.stringify(currentUsers));
    } catch (e) { }

    // 3. Send to Server if available (PUT for update)
    try {
      await safeFetchApi(`/api/security-users/${encodeURIComponent(safeUser.username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeUser)
      });
    } catch (e) { }

    // 4. Only update with_security_active_user IF targetUser is the currently logged-in user
    try {
      const activeRaw = localStorage.getItem('with_security_active_user');
      if (activeRaw) {
        const activeUser = JSON.parse(activeRaw);
        if (String(activeUser.username || '').trim().toLowerCase() === String(safeUser.username || '').trim().toLowerCase()) {
          const updatedActive = { ...activeUser, ...safeUser };
          localStorage.setItem('with_security_active_user', JSON.stringify(updatedActive));
        }
      }
    } catch (e) { }

    notifyDataChanged();
    return safeUser;
  }

  async saveUserProfile(userProfile, syncRemote = true) {
    let safeUser = { ...userProfile };
    if (safeUser.password && !safeUser.passwordHash) {
      if (/^[a-f0-9]{64}$/i.test(String(safeUser.password).trim())) {
        safeUser.passwordHash = String(safeUser.password).trim();
      } else {
        safeUser.passwordHash = await hashPassword(safeUser.password);
      }
    }

    const previousCached = localStorage.getItem('with_security_active_user');
    const previousUser = previousCached ? JSON.parse(previousCached) : null;

    const uid = safeUser.username || safeUser.id || 'default';
    if (Array.isArray(safeUser.trainings)) {
      try {
        localStorage.setItem(`with_security_user_trainings_${uid}`, JSON.stringify(safeUser.trainings));
      } catch (e) { }
    }

    localStorage.setItem('with_security_active_user', JSON.stringify(safeUser));

    try {
      await this.putItem('users', safeUser);
    } catch (e) {
      console.warn('IndexedDB saveUserProfile fallback:', e);
    }

    // Keep localStorage user database in sync with deduplication
    try {
      const lsRaw = localStorage.getItem('with_security_users_db');
      let currentUsers = lsRaw ? JSON.parse(lsRaw) : [];
      if (!Array.isArray(currentUsers)) currentUsers = [];
      const uname = String(safeUser.username || '').trim().toLowerCase();
      const existingIdx = currentUsers.findIndex(u => String(u.username || '').trim().toLowerCase() === uname);
      if (existingIdx >= 0) {
        currentUsers[existingIdx] = { ...currentUsers[existingIdx], ...safeUser };
      } else {
        currentUsers.push(safeUser);
      }
      currentUsers = this._deduplicateUsers(currentUsers);
      localStorage.setItem('with_security_users_db', JSON.stringify(currentUsers));
    } catch (e) { }

    if (syncRemote && safeUser.username) {
      try {
        await safeFetchApi(`/api/security-users/${encodeURIComponent(safeUser.username)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(safeUser)
        });
      } catch (e) { }
    }

    // 사용자 정보(이름, 직급, 소속팀, 사업부 등) 실제 변경 시에만 비동기로 일괄 동기화 (동일 계정의 정보 수정 시에만 실행, 로그인 및 계정 전환 시 충돌 방지)
    if (previousUser && previousUser.username && safeUser.username &&
      String(previousUser.username).trim().toLowerCase() === String(safeUser.username).trim().toLowerCase() &&
      (previousUser.name !== safeUser.name || previousUser.rank !== safeUser.rank || previousUser.team !== safeUser.team || previousUser.division !== safeUser.division)) {
      setTimeout(() => {
        this.cascadeUpdateUserData(safeUser, previousUser).catch(() => { });
      }, 50);
    }

    notifyDataChanged();
    return safeUser;
  }

  // 사용자 정보 변경 시 기존 등록된 업무 일지(work_logs) 및 서약서(checklists)의 작성자 정보 일괄 업데이트
  async cascadeUpdateUserData(newUser, prevUser = null) {
    if (!newUser) return;
    const targetUsername = (newUser.username || newUser.id || '').trim().toLowerCase();
    const oldName = (prevUser?.name || newUser.name || '').trim();

    // 1. 업무 일지 (work_logs) 일괄 동기화
    try {
      const logs = await this.getWorkLogs();
      let logsChanged = false;
      const updatedLogs = logs.map(log => {
        const logAuthorId = (log.authorUsername || log.writerId || log.username || '').trim().toLowerCase();
        const logAuthorName = (log.authorName || log.name || '').trim();

        // 작성자 일치 여부 확인 (아이디 일치 or 이전 이름 일치)
        const isAuthorMatch = (targetUsername && logAuthorId && logAuthorId === targetUsername) ||
          (!logAuthorId && targetUsername === 'admin' && (logAuthorName === '이원배' || logAuthorName === oldName)) ||
          (!logAuthorId && logAuthorName === oldName);

        let itemModified = false;
        let newLog = { ...log };

        if (isAuthorMatch) {
          newLog.authorName = newUser.name;
          newLog.name = newUser.name;
          if (newUser.rank) {
            newLog.authorRank = newUser.rank;
            newLog.rank = newUser.rank;
          }
          if (newUser.team || newUser.department) {
            newLog.authorTeam = newUser.team || newUser.department;
            newLog.team = newUser.team || newUser.department;
          }
          if (newUser.division) {
            newLog.division = newUser.division;
          }
          if (newUser.role) {
            newLog.role = newUser.role;
          }
          if (newUser.username) {
            newLog.authorUsername = newUser.username;
            newLog.writerId = newUser.username;
          }
          itemModified = true;
        }

        // 공유 대상(sharedWith) 목록 내 사용자 정보 일치 시 동기화
        if (Array.isArray(newLog.sharedWith) && newLog.sharedWith.length > 0) {
          let sharedWithModified = false;
          const newSharedWith = newLog.sharedWith.map(target => {
            const tId = (target.username || target.id || '').trim().toLowerCase();
            const tName = (target.name || '').trim();
            if ((targetUsername && tId && tId === targetUsername) || (!tId && tName === oldName)) {
              sharedWithModified = true;
              return {
                ...target,
                username: newUser.username || target.username,
                name: newUser.name,
                rank: newUser.rank || target.rank,
                team: newUser.team || newUser.department || target.team,
                division: newUser.division || target.division
              };
            }
            return target;
          });
          if (sharedWithModified) {
            newLog.sharedWith = newSharedWith;
            itemModified = true;
          }
        }

        if (itemModified) {
          logsChanged = true;
          return newLog;
        }
        return log;
      });

      if (logsChanged) {
        localStorage.setItem('with_security_work_logs', JSON.stringify(updatedLogs));
        for (const logItem of updatedLogs) {
          const logAuthorId = (logItem.authorUsername || logItem.writerId || logItem.username || '').trim().toLowerCase();
          const isAuthorMatch = (targetUsername && logAuthorId && logAuthorId === targetUsername) || (!logAuthorId && (logItem.authorName === newUser.name));
          if (isAuthorMatch) {
            try {
              await safeFetchApi('/api/work-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logItem)
              });
            } catch (e) { }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to cascade update work logs on user profile change:', e);
    }

    // 2. 출입 보안 서약서 (checklists) 일괄 동기화
    try {
      const checklists = await this.getChecklists();
      let clChanged = false;
      const updatedCls = checklists.map(cl => {
        const clId = (cl.username || cl.userId || cl.writerId || '').trim().toLowerCase();
        const clName = (cl.visitorName || cl.name || cl.visitor_name || '').trim();
        const isMatch = (targetUsername && clId && clId === targetUsername) || (!clId && clName === oldName);

        if (isMatch) {
          clChanged = true;
          return {
            ...cl,
            visitorName: newUser.name,
            name: newUser.name,
            visitor_name: newUser.name,
            visitorRank: newUser.rank || cl.visitorRank,
            rank: newUser.rank || cl.rank,
            visitor_rank: newUser.rank || cl.visitor_rank,
            visitorTeam: newUser.team || newUser.department || cl.visitorTeam,
            team: newUser.team || newUser.department || cl.team,
            visitor_team: newUser.team || newUser.department || cl.visitor_team,
            department: newUser.team || newUser.department || cl.department,
            visitorDivision: newUser.division || cl.visitorDivision,
            division: newUser.division || cl.division,
            visitorPhone: newUser.phone || cl.visitorPhone,
            phone: newUser.phone || cl.phone,
            visitorEmail: newUser.email || cl.visitorEmail,
            email: newUser.email || cl.email
          };
        }
        return cl;
      });

      if (clChanged) {
        localStorage.setItem('with_security_checklists_backup', JSON.stringify(updatedCls));
        for (const clItem of updatedCls) {
          const clId = (clItem.username || clItem.userId || clItem.writerId || '').trim().toLowerCase();
          if ((targetUsername && clId && clId === targetUsername) || (!clId && clItem.visitorName === newUser.name)) {
            try { await this.putItem('checklists', clItem); } catch (e) { }
            try {
              await safeFetchApi('/api/security-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clItem)
              });
            } catch (e) { }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to cascade update checklists on user profile change:', e);
    }
  }

  _deduplicateUsers(usersList) {
    if (!Array.isArray(usersList)) return [];

    let deletedUsernames = new Set();
    try {
      const delRaw = localStorage.getItem('with_security_deleted_users');
      if (delRaw) {
        const arr = JSON.parse(delRaw);
        if (Array.isArray(arr)) {
          deletedUsernames = new Set(arr.map(u => String(u || '').trim().toLowerCase()));
        }
      }
    } catch (e) { }

    const userMap = new Map();
    for (const u of usersList) {
      if (!u || !u.username) continue;
      const uname = String(u.username).trim().toLowerCase();
      if (deletedUsernames.has(uname)) continue;

      if (!userMap.has(uname)) {
        userMap.set(uname, { ...u, username: String(u.username).trim() });
      } else {
        const prev = userMap.get(uname);
        userMap.set(uname, {
          ...prev,
          ...u,
          username: String(prev.username || u.username).trim(),
          name: u.name || prev.name || '',
          role: (u.role === '개발자' || prev.role === '개발자') ? '개발자' : (u.role || prev.role || '일반'),
          division: u.division || prev.division || '',
          team: u.team || prev.team || '',
          rank: u.rank || prev.rank || '',
          phone: u.phone || prev.phone || '',
          email: u.email || prev.email || '',
          password: prev.password || u.password || '',
          passwordHash: prev.passwordHash || u.passwordHash || prev.password || u.password || '',
          trainings: (Array.isArray(u.trainings) && u.trainings.length > 0) ? u.trainings : (prev.trainings || [])
        });
      }
    }

    return Array.from(userMap.values());
  }

  _normalizeWorkLog(item) {
    if (!item) return null;
    let itemId = String(item.id || item.log_id || '').trim();
    if (itemId.startsWith('PASS-') || item.visitorName || item.visitor_name || item.pledge_terms) {
      return null;
    }

    // Clean Date to YYYY-MM-DD
    const rawDate = item.date || item.log_date || item.created_at || item.createdAt;
    const cleanDate = normalizeKstDate(rawDate) || new Date().toLocaleDateString('sv-SE');

    const title = String(item.title || item.workTitle || '일일 업무').trim();
    const authorUsername = String(item.writer_id || item.writerId || item.authorUsername || item.username || '').trim();

    // If ID is missing (e.g. manually entered row in Google Sheets), generate a deterministic ID
    if (!itemId) {
      const wPart = authorUsername || String(item.name || item.writer_name || item.authorName || 'ROW').trim();
      const dPart = cleanDate.replace(/\D/g, '');
      const tPart = title.replace(/\s+/g, '').slice(0, 10);
      itemId = `LOG-${wPart}-${dPart}-${tPart || Date.now()}`;
    }

    let parsedSharedWith = [];
    const rawSw = item.shared_with || item.sharedWith;
    if (Array.isArray(rawSw)) {
      parsedSharedWith = rawSw.map(s => typeof s === 'object' ? (s.name || s.authorName || '') : String(s).trim()).filter(Boolean);
    } else if (typeof rawSw === 'string' && rawSw.trim()) {
      try {
        const p = JSON.parse(rawSw);
        if (Array.isArray(p)) {
          parsedSharedWith = p.map(s => typeof s === 'object' ? (s.name || s.authorName || '') : String(s).trim()).filter(Boolean);
        } else {
          parsedSharedWith = rawSw.split(',').map(s => s.trim()).filter(Boolean);
        }
      } catch (e) {
        parsedSharedWith = rawSw.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const isSharedVal = item.is_shared !== undefined
      ? Boolean(item.is_shared)
      : (item.isShared !== undefined ? Boolean(item.isShared) : false);

    const details = String(item.tasks_done || item.details || item.content || '').trim();
    const siteName = String(item.site_name || item.siteName || '').trim();
    const name = String(item.name || item.writer_name || item.authorName || '작성자').trim();
    const team = String(item.team || item.writer_team || item.authorTeam || item.department || '').trim();
    const rank = String(item.rank || item.writer_rank || item.authorRank || '').trim();
    const role = String(item.role || item.authorRole || '일반').trim();
    const division = String(item.division || item.authorDivision || '').trim();
    const rawDueDate = item.due_date || item.dueDate || '';
    const dueDate = rawDueDate ? normalizeKstDate(rawDueDate) : '';
    const subCategory = String(item.sub_category || item.subCategory || '').trim();

    return {
      id: itemId,
      log_id: itemId,
      category: item.category || '사내 업무',
      subCategory: subCategory,
      sub_category: subCategory,
      dueDate: dueDate,
      due_date: dueDate,
      title: title,
      details: details,
      tasks_done: details,
      tasksDone: details,
      siteName: siteName,
      site_name: siteName,
      date: cleanDate,
      log_date: cleanDate,
      name: name,
      authorName: name,
      authorUsername: authorUsername,
      writerId: authorUsername,
      writer_id: authorUsername,
      username: authorUsername,
      division: division,
      team: team,
      authorTeam: team,
      rank: rank,
      authorRank: rank,
      role: role,
      isShared: isSharedVal,
      is_shared: isSharedVal ? 1 : 0,
      sharedWith: parsedSharedWith,
      shared_with: parsedSharedWith,
      sharedAt: item.shared_at || item.sharedAt || '',
      shared_at: item.shared_at || item.sharedAt || '',
      createdAt: item.created_at || item.createdAt || '',
      created_at: item.created_at || item.createdAt || ''
    };
  }

  _deduplicateWorkLogs(logs) {
    if (!Array.isArray(logs)) return [];
    const map = new Map();
    for (const l of logs) {
      if (!l || typeof l !== 'object') continue;
      const normalized = this._normalizeWorkLog(l);
      if (!normalized) continue;
      const rawId = String(normalized.id || normalized.log_id || '').trim();
      const wKey = String(normalized.writer_id || normalized.authorUsername || normalized.name || '').trim().toLowerCase();
      const dKey = String(normalized.date || normalized.log_date || '').trim();
      const tKey = String(normalized.title || '').trim().toLowerCase();
      const descKey = String(normalized.details || normalized.tasks_done || '').trim().toLowerCase();
      
      // If item has a distinct non-trivial ID, use that ID to preserve distinct tasks
      let key = rawId;
      if (!key || /^\d+$/.test(key)) {
        // Only collapse if identical author, date, title, AND details match
        key = (wKey && dKey && tKey) ? `WORK::${wKey}::${dKey}::${tKey}::${descKey}` : (rawId || `WORK::${Math.random()}`);
      }
      map.set(key, normalized);
    }
    return Array.from(map.values());
  }

  _normalizeChecklist(item) {
    if (!item) return null;
    let itemId = String(item.id || item.log_id || '').trim();

    const vName = String(item.visitorName || item.visitor_name || item.name || '').trim();
    const vPhone = String(item.visitorPhone || item.visitor_phone || item.phone || '').trim();
    const sDate = String(item.signature_date || item.signatureDate || item.date || item.signedAt || '').trim();

    if (!itemId) {
      const pPart = vPhone.replace(/\D/g, '') || vName || 'PLEDGE';
      const dPart = sDate.replace(/\D/g, '') || Date.now();
      itemId = `PASS-${pPart}-${dPart}`;
    }
    const vTeam = String(item.team || item.visitorTeam || item.department || '').trim();
    const vRank = String(item.rank || item.visitorRank || '').trim();
    const vDivision = String(item.division || '').trim();
    const vRole = String(item.role || '일반').trim();
    const sName = String(item.site_name || item.siteName || item.site || '').trim();

    const mdmVerified = Boolean(item.mdm_verified !== undefined ? item.mdm_verified : item.mdmVerified);
    let docChecklist = item.docChecklist;
    if (!docChecklist || typeof docChecklist !== 'object') {
      docChecklist = {
        gateApproved: Boolean(item.gate_approved),
        docSecVerified: Boolean(item.doc_sec_verified),
        preCheckVerified: Boolean(item.pre_check_verified)
      };
    }

    return {
      ...item,
      id: itemId,
      log_id: itemId,
      visitorName: vName,
      visitor_name: vName,
      name: vName,
      visitorPhone: vPhone,
      visitor_phone: vPhone,
      phone: vPhone,
      team: vTeam,
      visitorTeam: vTeam,
      department: vTeam,
      rank: vRank,
      visitorRank: vRank,
      division: vDivision,
      role: vRole,
      siteName: sName,
      site_name: sName,
      site: sName,
      signatureDate: sDate,
      signature_date: sDate,
      date: sDate ? sDate.slice(0, 10) : '',
      mdmVerified: mdmVerified,
      mdm_verified: mdmVerified ? 1 : 0,
      docChecklist: docChecklist,
      pledgeTerms: item.pledge_terms || item.pledgeTerms || '',
      pledge_terms: item.pledge_terms || item.pledgeTerms || '',
      status: item.status || '승인완료',
      companions: Array.isArray(item.companions) ? item.companions : []
    };
  }

  async getRegisteredUsers(forceRemote = false) {
    // 1. Instant Local Cache Return (0.1ms) - eliminates UI freezing/lag
    if (!forceRemote) {
      try {
        const lsRaw = localStorage.getItem('with_security_users_db') || localStorage.getItem('with_security_users_cloud_cache');
        if (lsRaw) {
          const list = JSON.parse(lsRaw);
          if (Array.isArray(list) && list.length > 0) {
            this._revalidateUsersInBackground().catch(() => { });
            const deduped = this._deduplicateUsers(list);
            if (deduped.length !== list.length) {
              localStorage.setItem('with_security_users_db', JSON.stringify(deduped));
            }
            return await this._ensureAdminInList(deduped);
          }
        }
      } catch (e) { }

      try {
        const dbUsers = await this.getAll('users');
        if (Array.isArray(dbUsers) && dbUsers.length > 0) {
          this._revalidateUsersInBackground().catch(() => { });
          const deduped = this._deduplicateUsers(dbUsers);
          return await this._ensureAdminInList(deduped);
        }
      } catch (e) { }
    }

    return await this._fetchUsersRemote();
  }

  async _revalidateUsersInBackground() {
    const now = Date.now();
    if (this._lastUsersRevalidate && (now - this._lastUsersRevalidate < 30000)) return;
    this._lastUsersRevalidate = now;
    await this._fetchUsersRemote();
  }

  async _ensureAdminInList(usersList) {
    const defaultAdminPass = import.meta.env?.VITE_ADMIN_DEFAULT_PASSWORD || 'withtech123!';
    if (!cachedDefaultAdminHash) {
      cachedDefaultAdminHash = await hashPassword(defaultAdminPass);
    }
    const defaultAdminHash = cachedDefaultAdminHash;

    const list = this._deduplicateUsers(usersList);

    // 1. Ensure admin account exists
    const adminIdx = list.findIndex(u => String(u.username || '').toLowerCase() === 'admin');
    if (adminIdx === -1) {
      list.unshift({
        username: 'admin',
        password: defaultAdminPass,
        passwordHash: defaultAdminHash,
        name: '이원배',
        role: '개발자',
        division: '영업/운영사업부',
        team: '운영1팀',
        rank: '대리',
        siteId: 'ALL',
        phone: '010-9885-0393',
        email: 'wblee@withtech.co.kr',
        educationDate: '',
        educationExpiryDate: '',
        educationName: '',
        trainings: []
      });
    } else {
      if (!list[adminIdx].passwordHash) {
        list[adminIdx].password = defaultAdminPass;
        list[adminIdx].passwordHash = defaultAdminHash;
      }
    }

    // 2. Ensure wblee standard account exists
    const wbleeIdx = list.findIndex(u => String(u.username || '').toLowerCase() === 'wblee');
    if (wbleeIdx === -1) {
      list.push({
        username: 'wblee',
        password: defaultAdminPass,
        passwordHash: defaultAdminHash,
        name: '이원배',
        role: '일반',
        division: '영업/운영사업부',
        team: '운영1팀',
        rank: '대리',
        siteId: 'site-001',
        phone: '010-9885-0393',
        email: 'wblee@withtech.co.kr',
        educationDate: '',
        educationExpiryDate: '',
        educationName: '',
        trainings: []
      });
    } else {
      if (!list[wbleeIdx].passwordHash) {
        list[wbleeIdx].password = defaultAdminPass;
        list[wbleeIdx].passwordHash = defaultAdminHash;
      }
    }

    return list;
  }

  async _fetchUsersRemote() {
    let usersList = [];

    // 0. Gather deleted users blacklist to avoid resurrection
    let deletedUsernames = new Set();
    try {
      const delRaw = localStorage.getItem('with_security_deleted_users');
      if (delRaw) {
        const arr = JSON.parse(delRaw);
        if (Array.isArray(arr)) {
          deletedUsernames = new Set(arr.map(u => String(u || '').trim().toLowerCase()));
        }
      }
    } catch (e) { }

    // 1. Gather all existing local users first to preserve local password & passwordHash
    const localUsersMap = new Map();
    try {
      const dbUsers = await this.getAll('users');
      if (Array.isArray(dbUsers)) {
        for (const u of dbUsers) {
          if (u && u.username) {
            const k = String(u.username).trim().toLowerCase();
            if (!deletedUsernames.has(k)) {
              localUsersMap.set(k, u);
            }
          }
        }
      }
    } catch (e) { }

    try {
      const lsRaw = localStorage.getItem('with_security_users_db');
      if (lsRaw) {
        const lsUsers = JSON.parse(lsRaw);
        if (Array.isArray(lsUsers)) {
          for (const u of lsUsers) {
            if (u && u.username) {
              const k = String(u.username).trim().toLowerCase();
              if (deletedUsernames.has(k)) continue;
              if (!localUsersMap.has(k)) {
                localUsersMap.set(k, u);
              } else {
                const existing = localUsersMap.get(k);
                localUsersMap.set(k, { ...existing, ...u, password: existing.password || u.password, passwordHash: existing.passwordHash || u.passwordHash });
              }
            }
          }
        }
      }
    } catch (e) { }

    // 2. Try fetching from server if online
    try {
      const res = await safeFetchApi('/api/security-users');
      if (res && res.ok) {
        const json = await res.json();
        const remoteData = json.data || json;
        if (Array.isArray(remoteData)) {
          usersList = remoteData
            .filter(u => !deletedUsernames.has(String(u.username || '').trim().toLowerCase()))
            .map(u => {
              const uKey = String(u.username || '').trim().toLowerCase();
              const existingLocal = localUsersMap.get(uKey);

              let parsedTrainings = [];
              if (u.trainings) {
                parsedTrainings = typeof u.trainings === 'string' ? JSON.parse(u.trainings) : u.trainings;
              } else if (existingLocal?.trainings) {
                parsedTrainings = existingLocal.trainings;
              }
              if (Array.isArray(parsedTrainings)) {
                parsedTrainings = parsedTrainings.filter(t =>
                  !String(t.id || t.eduId || '').startsWith('EDU-INIT-') &&
                  !String(t.id || t.eduId || '').startsWith('EDU-LEGACY-') &&
                  t.title !== '사내 정기 정보보안 및 안전 교육'
                );
              }

              return {
                ...existingLocal,
                ...u,
                // Crucial: preserve local password and passwordHash when server strips it
                password: existingLocal?.password || u.password || '',
                passwordHash: existingLocal?.passwordHash || u.passwordHash || existingLocal?.password || u.password || '',
                trainings: parsedTrainings,
                educationDate: (u.educationDate && u.educationDate !== '2025-08-20') ? u.educationDate : (existingLocal?.educationDate && existingLocal.educationDate !== '2025-08-20' ? existingLocal.educationDate : ''),
                educationExpiryDate: (u.educationExpiryDate && u.educationExpiryDate !== '2026-08-19') ? u.educationExpiryDate : (existingLocal?.educationExpiryDate && existingLocal.educationExpiryDate !== '2026-08-19' ? existingLocal.educationExpiryDate : ''),
                educationName: (u.educationName && u.educationName !== '사내 정기 정보보안 및 안전 교육') ? u.educationName : (existingLocal?.educationName && existingLocal.educationName !== '사내 정기 정보보안 및 안전 교육' ? existingLocal.educationName : '')
              };
            });

          usersList = this._deduplicateUsers(usersList);
          localStorage.setItem('with_security_users_db', JSON.stringify(usersList));
          try {
            await this.replaceCollection('users', usersList);
          } catch (e) { }
        }
      }
    } catch (e) { }

    if (!usersList || usersList.length === 0) {
      usersList = Array.from(localUsersMap.values()).filter(u => !deletedUsernames.has(String(u.username || '').trim().toLowerCase()));
    }

    const defaultAdminPass = import.meta.env?.VITE_ADMIN_DEFAULT_PASSWORD || 'withtech123!';
    if (!cachedDefaultAdminHash) {
      cachedDefaultAdminHash = await hashPassword(defaultAdminPass);
    }
    const defaultAdminHash = cachedDefaultAdminHash;

    // Ensure default admin user always exists (without hardcoded dummy education)
    const adminIdx = usersList.findIndex(u => String(u.username || '').toLowerCase() === 'admin');
    if (adminIdx === -1) {
      const defaultAdmin = {
        username: 'admin',
        password: defaultAdminPass,
        passwordHash: defaultAdminHash,
        name: '이원배',
        role: '개발자',
        division: '영업/운영사업부',
        team: '운영1팀',
        rank: '대리',
        siteId: 'ALL',
        phone: '010-9885-0393',
        email: 'wblee@withtech.co.kr',
        educationDate: '',
        educationExpiryDate: '',
        educationName: '',
        trainings: []
      };
      usersList.unshift(defaultAdmin);
      try {
        await this.putItem('users', defaultAdmin);
      } catch (e) { }
    } else {
      // Ensure admin has valid password hashes
      if (!usersList[adminIdx].passwordHash) {
        usersList[adminIdx].password = defaultAdminPass;
        usersList[adminIdx].passwordHash = defaultAdminHash;
        try { await this.putItem('users', usersList[adminIdx]); } catch (e) { }
      }
    }

    // Ensure default wblee standard user always exists
    const wbleeIdx = usersList.findIndex(u => String(u.username || '').toLowerCase() === 'wblee');
    if (wbleeIdx === -1) {
      const defaultWblee = {
        username: 'wblee',
        password: defaultAdminPass,
        passwordHash: defaultAdminHash,
        name: '이원배',
        role: '일반',
        division: '영업/운영사업부',
        team: '운영1팀',
        rank: '대리',
        siteId: 'site-001',
        phone: '010-9885-0393',
        email: 'wblee@withtech.co.kr',
        educationDate: '',
        educationExpiryDate: '',
        educationName: '',
        trainings: []
      };
      usersList.push(defaultWblee);
      try {
        await this.putItem('users', defaultWblee);
      } catch (e) { }
    } else {
      if (!usersList[wbleeIdx].passwordHash) {
        usersList[wbleeIdx].password = defaultAdminPass;
        usersList[wbleeIdx].passwordHash = defaultAdminHash;
        try { await this.putItem('users', usersList[wbleeIdx]); } catch (e) { }
      }
    }

    // 최종적으로 중복 제거 및 localStorage 최신화
    usersList = this._deduplicateUsers(usersList);
    try {
      localStorage.setItem('with_security_users_db', JSON.stringify(usersList));
    } catch (e) { }

    this.notifyDataChanged(true);
    return usersList;
  }

  async getUsers() {
    return this.getRegisteredUsers();
  }

  async getAllUsers() {
    return this.getRegisteredUsers();
  }

  async deleteUser(username) {
    if (!username || username === 'admin') return false;

    const uname = String(username).trim();
    const unameLower = uname.toLowerCase();

    // 1. Mark in deleted users blacklist (localStorage)
    try {
      const delRaw = localStorage.getItem('with_security_deleted_users');
      let delList = delRaw ? JSON.parse(delRaw) : [];
      if (!Array.isArray(delList)) delList = [];
      if (!delList.some(d => String(d).trim().toLowerCase() === unameLower)) {
        delList.push(unameLower);
        localStorage.setItem('with_security_deleted_users', JSON.stringify(delList));
      }
    } catch (e) { }

    // 2. Remove from localStorage users DB
    try {
      const lsRaw = localStorage.getItem('with_security_users_db');
      if (lsRaw) {
        let currentUsers = JSON.parse(lsRaw);
        if (Array.isArray(currentUsers)) {
          currentUsers = currentUsers.filter(u => String(u.username || '').trim().toLowerCase() !== unameLower);
          localStorage.setItem('with_security_users_db', JSON.stringify(currentUsers));
        }
      }
    } catch (e) { }

    // 3. Remove user-specific storage keys
    try {
      localStorage.removeItem(`with_security_user_trainings_${uname}`);
      localStorage.removeItem(`with_security_user_trainings_${unameLower}`);
    } catch (e) { }

    // 4. Remote Server DELETE API
    try {
      await safeFetchApi(`/api/security-users/${encodeURIComponent(uname)}`, { method: 'DELETE' });
    } catch (e) { }

    // 5. Delete from IndexedDB
    try {
      await this.deleteItem('users', uname);
      await this.deleteItem('users', unameLower);
    } catch (e) { }

    notifyDataChanged();
    return true;
  }

  async logoutUser() {
    localStorage.removeItem('with_security_active_user');
    localStorage.removeItem('with_security_auth_token');
    localStorage.removeItem('with_security_active_tab');
    notifyDataChanged();
  }

  getGoogleSheetsUrl() {
    return getGoogleSheetsUrl();
  }

  setGoogleSheetsUrl(url) {
    setGoogleSheetsUrl(url);
  }

  getHostedServerUrl() {
    return getHostedServerUrl();
  }

  setHostedServerUrl(url) {
    setHostedServerUrl(url);
  }

  getServerUrl() {
    return getServerUrl();
  }

  setServerUrl(url) {
    setServerUrl(url);
  }

  async testGoogleSheetsConnection(url = null) {
    const target = (url || getGoogleSheetsUrl() || '').trim();
    return this.testServerConnection(target);
  }

  async testHostedServerConnection(url = null) {
    const target = (url || getHostedServerUrl() || '').trim();
    return this.testServerConnection(target);
  }



  async testServerConnection(url) {
    if (!url || !url.trim()) {
      return { success: false, message: '서버 URL을 입력해 주세요.' };
    }
    let target = url.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'http://' + target;
    }
    target = target.replace(/\/+$/, '');

    // [1. 구글 스프레드시트 편집기 URL 또는 문서 주소 오입력 감지]
    if (target.includes('docs.google.com') || target.includes('/spreadsheets/')) {
      return {
        success: false,
        message: '⚠️ 구글 시트 "문서 주소(docs.google.com)"를 입력하셨습니다. 시트 주소가 아니라, Apps Script 창 우측 상단 [배포] > [새 배포] > [웹 앱]에서 발급된 "https://script.google.com/macros/s/.../exec" URL을 복사하여 입력해 주세요!'
      };
    }

    if (target.includes('script.google.com') && target.includes('/edit')) {
      return {
        success: false,
        message: '⚠️ Apps Script "코드 편집창(/edit)" 주소를 입력하셨습니다. 코드 편집기 주소가 아니라, 우측 상단 [배포] > [새 배포] > [웹 앱]을 생성했을 때 나오는 ".../exec" 로 끝나는 웹 앱 URL을 복사해 주세요!'
      };
    }

    // [2. 구글 스프레드시트 Withsharing_DB 웹 앱 연동 테스트]
    if (target.includes('script.google.com')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const pingUrl = `${target}${target.includes('?') ? '&' : '?'}action=ping`;
        const res = await fetch(pingUrl, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const rawText = await res.text();
          let json = null;
          try {
            json = JSON.parse(rawText);
          } catch (e) {
            return {
              success: false,
              message: '⚠️ 구글 스프레드시트 접근 권한 오류: Apps Script 웹 앱 배포 시 [액세스 권한]이 "모든 사용자(Anyone)"로 설정되지 않았습니다. Apps Script 우측 상단 [배포] > [배포 관리]에서 연필 아이콘을 누르고 [액세스 권한: 모든 사용자]로 변경 후 다시 시도해 주세요.'
            };
          }

          if (json && json.success) {
            const counts = json.counts || {};
            const countStr = json.counts
              ? `(서약서: ${counts.security_logs || 0}건, 사업장: ${counts.sites || 0}건, 계정: ${counts.users || 0}건, 업무일지: ${counts.work_logs || 0}건)`
              : '';
            return {
              success: true,
              message: `구글 스프레드시트(Withsharing_DB) 실시간 클라우드 DB 연동 성공! ${countStr}`,
              counts
            };
          } else {
            return {
              success: false,
              message: `구글 스프레드시트 오류: ${json?.error || '알 수 없는 응답'}`
            };
          }
        } else {
          return { success: false, message: `구글 스프레드시트 웹 앱 응답 오류 [상태코드: ${res.status}]` };
        }
      } catch (err) {
        return {
          success: false,
          message: `구글 스프레드시트 통신 실패 (${err.message}). 배포 시 '액세스 권한: 모든 사용자(Anyone)'로 배포되었는지 확인해 주세요.`
        };
      }
    }

    if (!isApiEndpoint(target)) {
      const checklists = await this.getChecklists();
      const sites = await this.getSites();
      const users = await this.getRegisteredUsers();
      const workLogs = await this.getWorkLogs();
      const vault = await this.getAll('vault');
      const total = checklists.length + sites.length + users.length + workLogs.length + vault.length;
      return {
        success: true,
        message: `통합 웹 & 모바일 데이터베이스 연동 성공! (총 ${total}건 데이터 실시간 동기화 상태: ${target})`
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${target}/api/status`, {
        method: 'GET',
        headers: { 'Bypass-Tunnel-Reminder': 'true' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const counts = json.counts || {};
        const countStr = json.counts
          ? `(서약서: ${counts.checklists || 0}건, 사업장: ${counts.sites || 0}건, 계정: ${counts.users || 0}건, Vault: ${counts.vault || 0}건)`
          : '';
        return { success: true, message: `백엔드 API 서버 통신 및 데이터 연동 성공! ${countStr} (${target})`, counts };
      } else {
        return { success: false, message: `백엔드 서버 응답 오류 [상태코드: ${res.status}] (${target})` };
      }
    } catch (err) {
      return {
        success: false,
        message: `백엔드 서버 연결 실패: Node/Express API 서버(node server/db.js)가 4000번 포트에서 실행 중인지 확인해 주세요. (${target})`
      };
    }
  }

  // -------------------------------------------------------------
  // Work Log Persistence Methods (MySQL work_log Table Direct Sync)
  // -------------------------------------------------------------
  _getWorkLogBlacklistKeys(log) {
    if (!log) return [];
    const keys = new Set();
    const id = String(log.id || log.log_id || log.logId || '').trim();
    if (id) keys.add(id);
    const altId = String(log.log_id || '').trim();
    if (altId) keys.add(altId);

    const writer = String(log.authorUsername || log.writerId || log.writer_id || log.username || log.name || '').trim().toLowerCase();
    const date = normalizeKstDate(log.date || log.log_date || log.dueDate || log.due_date);
    const title = String(log.title || '').trim().toLowerCase();
    if (writer && date && title) {
      keys.add(`WORK::${writer}::${date}::${title}`);
    }
    return Array.from(keys);
  }

  _isWorkLogDeleted(log, deletedKeysSet) {
    if (!log || !deletedKeysSet || deletedKeysSet.size === 0) return false;
    const id = String(log.id || log.log_id || log.logId || '').trim();
    if (id && deletedKeysSet.has(id)) return true;
    const altId = String(log.log_id || '').trim();
    if (altId && deletedKeysSet.has(altId)) return true;

    const writer = String(log.authorUsername || log.writerId || log.writer_id || log.username || log.name || '').trim().toLowerCase();
    const date = normalizeKstDate(log.date || log.log_date || log.dueDate || log.due_date);
    const title = String(log.title || '').trim().toLowerCase();
    if (writer && date && title) {
      if (deletedKeysSet.has(`WORK::${writer}::${date}::${title}`)) return true;
    }
    return false;
  }

  _getDeletedWorkLogsSet() {
    try {
      const raw = localStorage.getItem('with_security_deleted_work_logs');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          return new Set(arr.map(k => String(k || '').trim()));
        }
      }
    } catch (e) { }
    return new Set();
  }

  async getWorkLogs(forceRemote = false) {
    const deletedSet = this._getDeletedWorkLogsSet();
    // 1. Instant Local Cache Return (0.1ms) - eliminates UI freezing/lag
    if (!forceRemote) {
      try {
        const raw = localStorage.getItem('with_security_work_logs');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const pureLogs = this._deduplicateWorkLogs(list).filter(l => !this._isWorkLogDeleted(l, deletedSet));
            this._revalidateWorkLogsInBackground().catch(() => { });
            return pureLogs;
          }
        }
      } catch (e) { }

      try {
        const dbLogs = await this.getAll('work_logs');
        if (Array.isArray(dbLogs) && dbLogs.length > 0) {
          const pureLogs = this._deduplicateWorkLogs(dbLogs).filter(l => !this._isWorkLogDeleted(l, deletedSet));
          this._revalidateWorkLogsInBackground().catch(() => { });
          return pureLogs;
        }
      } catch (e) { }
    }

    return await this._fetchWorkLogsRemote();
  }

  _isWorkLogRecentlyEdited(log, now = Date.now()) {
    if (!log) return false;
    const logId = String(log.id || log.log_id || '').trim();
    if (this._recentLocalWorkLogEdits && this._recentLocalWorkLogEdits.has(logId)) {
      const editTime = this._recentLocalWorkLogEdits.get(logId);
      if (now - editTime < 120000) return true; // protected within 2 minutes
    }
    if (log.updatedAt) {
      const t = new Date(log.updatedAt).getTime();
      if (!isNaN(t) && now - t < 120000) return true;
    }
    if (log.createdAt && !String(log.id || '').match(/^\d+$/)) {
      const t = new Date(log.createdAt).getTime();
      if (!isNaN(t) && now - t < 120000) return true;
    }
    return false;
  }

  async _revalidateWorkLogsInBackground() {
    const now = Date.now();
    if (this._lastWorkLogsRevalidate && (now - this._lastWorkLogsRevalidate < 30000)) return;
    this._lastWorkLogsRevalidate = now;
    const remoteLogs = await this._fetchWorkLogsRemote();
    if (Array.isArray(remoteLogs)) {
      this.notifyDataChanged(true);
    }
  }

  _mergeRemoteWithLocalWorkLogs(remoteLogs, currentLocal, deletedSet) {
    if (!Array.isArray(remoteLogs)) remoteLogs = [];
    if (!Array.isArray(currentLocal)) currentLocal = [];
    const now = Date.now();
    const mergedMap = new Map();

    // Collect recently edited local items and their original dates
    const recentLocalMoves = [];
    for (const loc of currentLocal) {
      if (!loc || this._isWorkLogDeleted(loc, deletedSet)) continue;
      if (this._isWorkLogRecentlyEdited(loc, now)) {
        const origDate = normalizeKstDate(loc._originalDate || loc.originalDate);
        const curDate = normalizeKstDate(loc.date || loc.log_date);
        const writer = String(loc.authorUsername || loc.writerId || loc.writer_id || loc.name || '').trim().toLowerCase();
        const title = String(loc.title || '').trim().toLowerCase();
        const locId = String(loc.id || loc.log_id || '').trim();
        if (origDate && origDate !== curDate) {
          recentLocalMoves.push({ id: locId, writer, origDate, title, curDate });
        }
      }
    }

    // 1. Populate with remote logs, discarding stale pre-move ghosts
    for (const r of remoteLogs) {
      if (!r || this._isWorkLogDeleted(r, deletedSet)) continue;
      const rId = String(r.id || r.log_id || '').trim();
      const rDate = normalizeKstDate(r.date || r.log_date);
      const rWriter = String(r.authorUsername || r.writerId || r.writer_id || r.name || '').trim().toLowerCase();
      const rTitle = String(r.title || '').trim().toLowerCase();

      // Check if this remote item is a stale pre-move ghost of an item recently moved to a new date
      const isStaleGhost = recentLocalMoves.some(m =>
        (m.id && rId && m.id === rId && m.origDate === rDate) ||
        (m.origDate === rDate && m.writer === rWriter && m.title === rTitle)
      );
      if (isStaleGhost) continue;

      if (rId) mergedMap.set(rId, r);
    }

    // 2. Authoritative local overlay: protect recent local saves from being reverted by stale remote data
    for (const loc of currentLocal) {
      if (!loc || this._isWorkLogDeleted(loc, deletedSet)) continue;
      const locId = String(loc.id || loc.log_id || '').trim();
      if (!locId) continue;

      const isRecentlyEdited = this._isWorkLogRecentlyEdited(loc, now);

      if (mergedMap.has(locId)) {
        if (isRecentlyEdited) {
          // Local version is newer / recently edited -> keep local version
          mergedMap.set(locId, { ...mergedMap.get(locId), ...loc });
        }
      } else {
        // Local item not yet reflected on remote (e.g. pending Google Sheets append)
        mergedMap.set(locId, loc);
      }
    }

    return this._deduplicateWorkLogs(Array.from(mergedMap.values()));
  }

  async _fetchWorkLogsRemote() {
    const deletedSet = this._getDeletedWorkLogsSet();
    try {
      const res = await safeFetchApi('/api/work-logs');
      if (res && res.ok) {
        const json = await res.json();
        const serverLogs = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
        const filteredServerLogs = serverLogs.filter(l => !this._isWorkLogDeleted(l, deletedSet));

        // Read current local cache to merge and protect recent local additions & edits
        const currentLocal = (() => {
          try {
            const raw = localStorage.getItem('with_security_work_logs');
            return raw ? JSON.parse(raw) : [];
          } catch (e) {
            return [];
          }
        })();

        const mapped = this._mergeRemoteWithLocalWorkLogs(filteredServerLogs, currentLocal, deletedSet);
        localStorage.setItem('with_security_work_logs', JSON.stringify(mapped));
        try {
          await this.replaceCollection('work_logs', mapped);
        } catch (e) { }
        this.notifyDataChanged(true);
        return mapped;
      }
    } catch (e) { }

    try {
      const raw = localStorage.getItem('with_security_work_logs');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return this._deduplicateWorkLogs(parsed.filter(l => !this._isWorkLogDeleted(l, deletedSet)));
        }
      }
    } catch (e) { }

    return [];
  }

  async saveWorkLog(logItem, options = {}) {
    if (!logItem) return null;
    const targetId = String(logItem.id || logItem.log_id || `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`).trim();
    // ⭐ 핵심 격리 규칙: 보안 서약(PASS-) 데이터는 절대로 work_logs에 저장하지 않고 saveChecklist로 안전하게 전환
    if (targetId.startsWith('PASS-') || logItem.visitorName || logItem.visitor_name || logItem.pledge_terms) {
      return await this.saveChecklist(logItem);
    }

    // ⭐ sharedWith를 '이름 직급 (소속)' 형태로만 정제 (예: '홍길동 대리 (운영1팀)')
    let cleanSharedWith = [];
    if (Array.isArray(logItem.sharedWith)) {
      cleanSharedWith = logItem.sharedWith.map(t => {
        if (typeof t === 'string') return t.trim();
        if (t && typeof t === 'object') {
          const name = (t.name || t.authorName || t.writerName || '').trim();
          const rank = (t.rank || t.authorRank || t.writerRank || '').trim();
          let team = (t.team || t.department || t.authorTeam || t.writerTeam || '').trim();
          if (team.includes('>')) team = team.split('>').pop().trim();
          let label = name;
          if (rank) label += ` ${rank}`;
          if (team) label += ` (${team})`;
          return label.trim() || name;
        }
        return String(t);
      }).filter(Boolean);
    } else if (typeof logItem.sharedWith === 'string') {
      try {
        const parsed = JSON.parse(logItem.sharedWith);
        if (Array.isArray(parsed)) {
          cleanSharedWith = parsed.map(s => String(s).trim()).filter(Boolean);
        } else {
          cleanSharedWith = logItem.sharedWith.split(',').map(s => s.trim()).filter(Boolean);
        }
      } catch (e) {
        cleanSharedWith = logItem.sharedWith.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    const cleanDate = normalizeKstDate(logItem.date || logItem.log_date) || new Date().toLocaleDateString('sv-SE');
    const cleanDueDate = normalizeKstDate(logItem.dueDate || logItem.due_date);

    const preparedLog = {
      ...logItem,
      id: targetId,
      log_id: targetId,
      date: cleanDate,
      log_date: cleanDate,
      dueDate: cleanDueDate,
      due_date: cleanDueDate,
      sharedWith: cleanSharedWith,
      updatedAt: logItem.updatedAt || new Date().toISOString()
    };

    // 사용자가 명시적으로 재등록/저장하는 경우 삭제 블랙리스트에서 자동 해제
    try {
      const keysToUnblacklist = this._getWorkLogBlacklistKeys(preparedLog);
      const delRaw = localStorage.getItem('with_security_deleted_work_logs');
      if (delRaw) {
        let delList = JSON.parse(delRaw);
        if (Array.isArray(delList)) {
          const unSet = new Set(keysToUnblacklist);
          delList = delList.filter(k => !unSet.has(String(k || '').trim()));
          localStorage.setItem('with_security_deleted_work_logs', JSON.stringify(delList));
        }
      }
    } catch (e) { }

    // 1. Immediately update localStorage first
    const currentLocal = (() => {
      try {
        const raw = localStorage.getItem('with_security_work_logs');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(l => l && typeof l === 'object') : [];
      } catch (e) {
        return [];
      }
    })();

    const targetIdStr = String(targetId).trim();
    const targetLogIdStr = String(preparedLog.log_id || preparedLog.logId || targetIdStr).trim();

    let existingIndex = currentLocal.findIndex(l => {
      if (!l) return false;
      const lId = String(l.id || '').trim();
      const lLogId = String(l.log_id || l.logId || '').trim();
      if (targetIdStr && (lId === targetIdStr || lLogId === targetIdStr)) return true;
      if (targetLogIdStr && (lId === targetLogIdStr || lLogId === targetLogIdStr)) return true;
      return false;
    });

    const pWriter = String(preparedLog.authorUsername || preparedLog.writerId || preparedLog.writer_id || preparedLog.name || '').trim().toLowerCase();
    const origDate = normalizeKstDate(logItem._originalDate || logItem.originalDate || logItem.prevDate);
    const pTitle = String(preparedLog.title || '').trim().toLowerCase();

    if (existingIndex < 0) {
      const searchDates = [origDate, cleanDate].filter(Boolean);
      if (pWriter && pTitle) {
        existingIndex = currentLocal.findIndex(l => {
          if (!l) return false;
          const lWriter = String(l.authorUsername || l.writerId || l.writer_id || l.name || '').trim().toLowerCase();
          const lDate = normalizeKstDate(l.date || l.log_date);
          const lTitle = String(l.title || '').trim().toLowerCase();
          return lWriter === pWriter && lTitle === pTitle && searchDates.includes(lDate);
        });
      }
    }

    let updated;
    if (existingIndex >= 0) {
      updated = [...currentLocal];
      updated[existingIndex] = { ...updated[existingIndex], ...preparedLog };
    } else {
      updated = [preparedLog, ...currentLocal];
    }
    if (origDate && origDate !== cleanDate) {
      // Purge any residual duplicate of this task sitting on the original date
      updated = updated.filter((item, idx) => {
        if (!item) return false;
        if (idx === existingIndex) return true;
        const iWriter = String(item.authorUsername || item.writerId || item.writer_id || item.name || '').trim().toLowerCase();
        const iDate = normalizeKstDate(item.date || item.log_date);
        const iTitle = String(item.title || '').trim().toLowerCase();
        if (iWriter === pWriter && iTitle === pTitle && iDate === origDate) {
          return false;
        }
        return true;
      });
    }
    const pureUpdated = this._deduplicateWorkLogs(updated);
    localStorage.setItem('with_security_work_logs', JSON.stringify(pureUpdated));
    try {
      await this.replaceCollection('work_logs', pureUpdated);
    } catch (e) { }

    // Track recently edited items to protect against premature overwrite by stale server syncs
    if (!this._recentLocalWorkLogEdits) this._recentLocalWorkLogEdits = new Map();
    this._recentLocalWorkLogEdits.set(targetIdStr, Date.now());
    if (targetLogIdStr) this._recentLocalWorkLogEdits.set(targetLogIdStr, Date.now());

    // Invalidate request cache and delay remote background revalidation by 8s
    recentResponseCache.clear();
    this._lastWorkLogsRevalidate = Date.now() + 8000;

    // 2. Safe async sync with server (supports immediate sync for calendar drag & drop)
    const syncPayload = {
      id: targetId,
      log_id: targetId,
      logId: targetId,
      original_date: logItem._originalDate || logItem.originalDate || logItem.prevDate || '',
      name: preparedLog.authorName || preparedLog.name || preparedLog.writerName || '작성자',
      writer_id: preparedLog.authorUsername || preparedLog.writerId || '',
      writerId: preparedLog.authorUsername || preparedLog.writerId || '',
      division: preparedLog.authorDivision || preparedLog.division || '',
      team: preparedLog.authorTeam || preparedLog.team || preparedLog.writerTeam || preparedLog.department || '보안관제팀',
      rank: preparedLog.authorRank || preparedLog.rank || preparedLog.writerRank || '대리',
      role: preparedLog.authorRole || preparedLog.role || '일반',
      category: preparedLog.category || '사내 업무',
      sub_category: preparedLog.subCategory || preparedLog.sub_category || '',
      subCategory: preparedLog.subCategory || preparedLog.sub_category || '',
      due_date: cleanDueDate,
      dueDate: cleanDueDate,
      site_name: preparedLog.siteName || preparedLog.site_name || preparedLog.site || '',
      siteName: preparedLog.siteName || preparedLog.site_name || preparedLog.site || '',
      log_date: cleanDate,
      date: cleanDate,
      title: preparedLog.title,
      tasks_done: preparedLog.details || preparedLog.tasksDone || '',
      tasksDone: preparedLog.details || preparedLog.tasksDone || '',
      is_shared: preparedLog.isShared ? 1 : 0,
      isShared: preparedLog.isShared ?? false,
      shared_with: cleanSharedWith,
      sharedWith: cleanSharedWith,
      shared_at: preparedLog.sharedAt || '',
      sharedAt: preparedLog.sharedAt || '',
      created_at: preparedLog.createdAt || new Date().toISOString()
    };

    const syncPromise = safeFetchApi('/api/work-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload)
    }).then(() => {
      setTimeout(() => {
        if (this._recentLocalWorkLogEdits) {
          this._recentLocalWorkLogEdits.delete(targetIdStr);
          if (targetLogIdStr) this._recentLocalWorkLogEdits.delete(targetLogIdStr);
        }
      }, 15000);
    }).catch(err => console.warn('Background work log save sync warning:', err));

    if (options && options.syncImmediate) {
      try {
        await syncPromise;
      } catch (e) { }
    }

    notifyDataChanged();
    return pureUpdated;
  }

  async deleteWorkLog(target) {
    if (!target) return [];
    const targetId = typeof target === 'string' || typeof target === 'number'
      ? String(target).trim()
      : String(target.id || target.log_id || target.logId || '').trim();

    // 1. Find existing log to extract all identification keys (id, log_id, composite key)
    const currentLocal = (() => {
      try {
        const raw = localStorage.getItem('with_security_work_logs');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(l => l && typeof l === 'object') : [];
      } catch (e) {
        return [];
      }
    })();

    const matchedLog = (typeof target === 'object' && target !== null)
      ? target
      : currentLocal.find(l => {
        if (!l) return false;
        const lId = String(l.id || l.log_id || l.logId || '').trim();
        return lId === targetId || String(l.id) === targetId || String(l.log_id) === targetId;
      });

    // 2. Add all keys to deleted work logs blacklist (localStorage) to permanently prevent resurrection
    const keysToBlacklist = this._getWorkLogBlacklistKeys(matchedLog || { id: targetId });
    if (targetId && !keysToBlacklist.includes(targetId)) keysToBlacklist.push(targetId);

    try {
      const delRaw = localStorage.getItem('with_security_deleted_work_logs');
      let delList = delRaw ? JSON.parse(delRaw) : [];
      if (!Array.isArray(delList)) delList = [];
      for (const k of keysToBlacklist) {
        if (k && !delList.includes(k)) delList.push(k);
      }
      localStorage.setItem('with_security_deleted_work_logs', JSON.stringify(delList));
    } catch (e) { }

    const deletedSet = this._getDeletedWorkLogsSet();

    // 3. Immediately filter local cache
    const updated = currentLocal.filter(l => !this._isWorkLogDeleted(l, deletedSet));
    localStorage.setItem('with_security_work_logs', JSON.stringify(updated));

    // 4. Update IndexedDB immediately
    try {
      if (targetId) await this.deleteItem('work_logs', targetId);
      await this.replaceCollection('work_logs', updated);
    } catch (e) { }

    // 5. Invalidate request caches & prevent background revalidation collision
    recentResponseCache.clear();
    this._lastWorkLogsRevalidate = Date.now() + 5000; // block revalidation for 5s while server processes
    if (this._recentLocalWorkLogEdits) {
      this._recentLocalWorkLogEdits.delete(targetId);
      if (matchedLog) {
        if (matchedLog.id) this._recentLocalWorkLogEdits.delete(String(matchedLog.id).trim());
        if (matchedLog.log_id) this._recentLocalWorkLogEdits.delete(String(matchedLog.log_id).trim());
      }
    }

    // 6. Safe remote API delete (non-blocking, eliminates UI freeze/lag)
    safeFetchApi(`/api/work-logs/${encodeURIComponent(targetId)}`, { method: 'DELETE' })
      .catch(err => console.warn('Background work log delete sync warning:', err));

    notifyDataChanged();
    return updated;
  }

  // -------------------------------------------------------------
  // Shared Weekly Custom Reports Persistence (주간 직접 입력 1~4번 보고서 사내 공유 & 컬럼별 분리 저장)
  // -------------------------------------------------------------
  async getWeeklyReports(searchParams = {}) {
    const localOverrides = (() => {
      try {
        const raw = localStorage.getItem('with_sec_shared_weekly_reports');
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    })();
    const localMap = new Map(localOverrides.map(r => [(r.id || r.reportId), r]));

    try {
      let queryStr = '';
      if (searchParams.weeklyMonday) queryStr += `?weeklyMonday=${encodeURIComponent(searchParams.weeklyMonday)}`;
      if (searchParams.authorUsername) queryStr += `${queryStr ? '&' : '?'}authorUsername=${encodeURIComponent(searchParams.authorUsername)}`;

      const res = await safeFetchApi(`/api/weekly-reports${queryStr}`);
      if (res && res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped = json.data.map(item => {
            const itemId = item.id || item.reportId || item.report_id;
            const localItem = localMap.get(itemId);

            return {
              id: itemId,
              reportId: itemId,
              weeklyMonday: item.weeklyMonday || item.weekly_monday || localItem?.weeklyMonday || '',
              weekText: item.weekText || item.week_text || localItem?.weekText || '',
              authorName: item.authorName || item.author_name || item.name || localItem?.authorName || '작성자',
              authorUsername: item.authorUsername || item.author_username || item.writerId || localItem?.authorUsername || '',
              authorTeam: item.authorTeam || item.author_team || item.team || localItem?.authorTeam || '',
              authorRank: item.authorRank || item.author_rank || item.rank || localItem?.authorRank || '대리',
              authorDivision: item.authorDivision || item.author_division || item.division || localItem?.authorDivision || '',
              authorRole: item.authorRole || item.author_role || item.role || localItem?.authorRole || '일반',
              // ⭐ 컬럼별 명확한 분리
              mainTasks: item.mainTasks || item.main_tasks || localItem?.mainTasks || '',
              infoSharing: item.infoSharing || item.info_sharing || localItem?.infoSharing || '',
              workSupport: item.workSupport || item.work_support || item.teamCoop || item.team_coop || localItem?.workSupport || localItem?.teamCoop || '',
              teamCoop: item.workSupport || item.work_support || item.teamCoop || item.team_coop || localItem?.workSupport || localItem?.teamCoop || '',
              etcTasks: item.etcTasks || item.etc_tasks || localItem?.etcTasks || '',
              sharedWith: item.sharedWith || item.shared_with || localItem?.sharedWith || [],
              sharedAt: item.sharedAt || item.shared_at || localItem?.sharedAt || '',
              createdAt: item.createdAt || item.created_at || localItem?.createdAt || ''
            };
          });

          // Prepend local items if unsynced
          const serverIds = new Set(mapped.map(m => m.id));
          localOverrides.forEach(lo => {
            const lId = lo.id || lo.reportId;
            if (lId && !serverIds.has(lId)) {
              mapped.push(lo);
            }
          });

          localStorage.setItem('with_sec_shared_weekly_reports', JSON.stringify(mapped));
          return mapped;
        }
      }
    } catch (e) { }

    return localOverrides;
  }

  async saveWeeklyReport(report) {
    if (!report) return null;
    const current = await this.getWeeklyReports();
    const targetId = report.id || report.reportId || `weekly-rep-${report.authorUsername || report.authorName || 'user'}-${report.weeklyMonday || Date.now()}`;

    // ⭐ sharedWith를 '이름 직급 (소속)' 형태로만 정제 (예: '홍길동 대리 (운영1팀)')
    let cleanSharedWith = [];
    if (Array.isArray(report.sharedWith)) {
      cleanSharedWith = report.sharedWith.map(t => {
        if (typeof t === 'string') return t.trim();
        if (t && typeof t === 'object') {
          const name = (t.name || t.authorName || '').trim();
          const rank = (t.rank || t.authorRank || t.writerRank || '').trim();
          let team = (t.team || t.department || t.authorTeam || '').trim();
          if (team.includes(' ')) {
            const parts = team.split(/\s+/);
            team = parts[parts.length - 1];
          }
          let label = name;
          if (rank && !label.includes(rank)) label += ` ${rank}`;
          if (team && !label.includes(team)) label += ` (${team})`;
          return label || name || team || '';
        }
        return String(t || '');
      }).filter(Boolean);
    } else if (typeof report.sharedWith === 'string') {
      cleanSharedWith = report.sharedWith.split(',').map(s => s.trim()).filter(Boolean);
    }

    // ⭐ 주요 내용, 정보 공유, 업무 지원, 기타 업무 컬럼별 정규화
    const normalized = {
      ...report,
      id: targetId,
      reportId: targetId,
      weeklyMonday: report.weeklyMonday || '',
      weekText: report.weekText || '',
      authorName: report.authorName || report.name || '작성자',
      authorUsername: report.authorUsername || report.writerId || '',
      authorTeam: report.authorTeam || report.team || '',
      authorRank: report.authorRank || report.rank || '대리',
      authorDivision: report.authorDivision || report.division || '',
      authorRole: report.authorRole || report.role || '일반',
      mainTasks: report.mainTasks || '',
      infoSharing: report.infoSharing || '',
      workSupport: report.workSupport || report.teamCoop || '',
      teamCoop: report.workSupport || report.teamCoop || '',
      etcTasks: report.etcTasks || '',
      sharedWith: cleanSharedWith,
      sharedAt: report.sharedAt || '',
      createdAt: report.createdAt || new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    const idx = current.findIndex(r => (r.id || r.reportId) === targetId || (r.weeklyMonday === normalized.weeklyMonday && (r.authorUsername || r.authorName) === (normalized.authorUsername || normalized.authorName)));
    let updated;
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...updated[idx], ...normalized };
    } else {
      updated = [normalized, ...current];
    }

    localStorage.setItem('with_sec_shared_weekly_reports', JSON.stringify(updated));

    // Async REST API Sync
    try {
      await safeFetchApi('/api/weekly-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: targetId,
          weeklyMonday: normalized.weeklyMonday,
          weekText: normalized.weekText,
          authorName: normalized.authorName,
          authorUsername: normalized.authorUsername,
          authorTeam: normalized.authorTeam,
          authorRank: normalized.authorRank,
          authorDivision: normalized.authorDivision,
          authorRole: normalized.authorRole,
          mainTasks: normalized.mainTasks,
          infoSharing: normalized.infoSharing,
          workSupport: normalized.workSupport,
          etcTasks: normalized.etcTasks,
          sharedWith: normalized.sharedWith,
          sharedAt: normalized.sharedAt
        })
      });
    } catch (e) { }

    notifyDataChanged();
    return updated;
  }

  async deleteWeeklyReport(reportId) {
    try {
      await safeFetchApi(`/api/weekly-reports/${reportId}`, { method: 'DELETE' });
    } catch (e) { }

    const reports = await this.getWeeklyReports();
    const updated = reports.filter(r => (r.id !== reportId && r.reportId !== reportId));
    localStorage.setItem('with_sec_shared_weekly_reports', JSON.stringify(updated));
    notifyDataChanged();
    return updated;
  }

  // ========================================================
  // Education & Training Logs Service (edu_log / edu_logs)
  // ========================================================
  async getEduLogs(filter = {}, forceRemote = false) {
    let localLogs = [];
    try {
      const raw = localStorage.getItem('with_security_edu_logs');
      if (raw) localLogs = JSON.parse(raw);
    } catch (e) { }
    if (!localLogs || localLogs.length === 0) {
      try {
        localLogs = await this.getAll('edu_logs');
      } catch (e) { }
    }

    if (!forceRemote && Array.isArray(localLogs) && localLogs.length > 0) {
      this._revalidateEduLogsInBackground(filter).catch(() => { });
      return this._filterEduLogs(localLogs, filter);
    }

    return await this._fetchEduLogsRemote(filter);
  }

  async _revalidateEduLogsInBackground(filter = {}) {
    const now = Date.now();
    if (this._lastEduLogsRevalidate && (now - this._lastEduLogsRevalidate < 30000)) return;
    this._lastEduLogsRevalidate = now;
    await this._fetchEduLogsRemote(filter);
  }

  _filterEduLogs(logs, filter = {}) {
    const dedupMap = new Map();
    (logs || []).forEach(item => {
      const title = String(item.title || '').trim();
      const compDate = String(item.completionDate || item.completion_date || '').trim();
      if (!title || !compDate) return;
      if (title === '사내 정기 정보보안 및 안전 교육') return;
      if (String(item.id || item.eduId || '').startsWith('EDU-INIT-')) return;
      if (String(item.id || item.eduId || '').startsWith('EDU-LEGACY-')) return;

      const uKey = String(item.userId || item.name || '').trim().toLowerCase();
      const tKey = title.toLowerCase();
      const cKey = compDate;
      const key = `${uKey}__${tKey}__${cKey}`;
      if (!dedupMap.has(key)) {
        dedupMap.set(key, item);
      }
    });
    const uniqueLogs = Array.from(dedupMap.values());

    return uniqueLogs.filter(item => {
      const title = String(item.title || '').trim();
      const compDate = String(item.completionDate || item.completion_date || '').trim();
      if (!title || !compDate) return false;

      if (filter.userId || filter.username || filter.name) {
        const uTarget = String(filter.userId || filter.username || '').trim().toLowerCase();
        const nTarget = String(filter.name || '').trim().toLowerCase();
        const itemUser = String(item.userId || '').trim().toLowerCase();
        const itemName = String(item.name || '').trim().toLowerCase();

        const matchUser = Boolean(uTarget && (itemUser === uTarget || itemName === uTarget));
        const matchName = Boolean(nTarget && (itemName === nTarget || itemUser === nTarget));
        if (!matchUser && !matchName) return false;
      }
      if (filter.category && filter.category !== '전체') {
        if (filter.category === '기타') {
          if (['SKHynix', 'Samsung', 'LGD', '법정'].includes(item.category)) return false;
        } else if (item.category !== filter.category) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => (b.completionDate || '').localeCompare(a.completionDate || ''));
  }

  async _fetchEduLogsRemote(filter = {}) {
    let localLogs = [];
    try {
      localLogs = await this.getAll('edu_logs');
    } catch (e) {
      const raw = localStorage.getItem('with_security_edu_logs');
      localLogs = raw ? JSON.parse(raw) : [];
    }

    try {
      const qs = new URLSearchParams();
      if (filter.userId || filter.username) qs.set('userId', filter.userId || filter.username);
      if (filter.name) qs.set('name', filter.name);
      if (filter.category && filter.category !== '전체') qs.set('category', filter.category);
      const queryStr = qs.toString() ? `?${qs.toString()}` : '';

      const res = await safeFetchApi(`/api/edu-logs${queryStr}`);
      if (res && res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          for (const item of json.data) {
            let targetId = String(item.edu_id || item.eduId || item.id || '').trim();
            if (!/^EDU-\d{10,15}-\d{3}$/.test(targetId)) {
              const digits = targetId.replace(/[^0-9]/g, '');
              let ts = digits.length >= 10 ? digits.slice(0, 13) : String(Date.now());
              if (ts.length < 13) ts = String(Date.now());
              targetId = `EDU-${ts}-${Math.floor(100 + Math.random() * 900)}`;
            }
            const normalized = {
              id: targetId,
              eduId: targetId,
              userId: item.user_id || item.userId || '',
              name: item.name || '',
              division: item.division || '',
              team: item.team || '',
              rank: item.rank || '',
              category: item.category || '법정',
              title: item.title || '',
              completionDate: item.completion_date || item.completionDate || '',
              expiryDate: item.expiry_date || item.expiryDate || '',
              memo: item.memo || ''
            };
            await this.putItem('edu_logs', normalized).catch(() => { });
          }
          localLogs = await this.getAll('edu_logs');
        }
      }
    } catch (e) { }

    return this._filterEduLogs(localLogs, filter);
  }

  async saveEduLog(eduItem) {
    let targetId = String(eduItem.eduId || eduItem.edu_id || eduItem.id || '').trim();
    if (!/^EDU-\d{10,15}-\d{3}$/.test(targetId)) {
      const digits = targetId.replace(/[^0-9]/g, '');
      let ts = digits.length >= 10 ? digits.slice(0, 13) : String(Date.now());
      if (ts.length < 13) ts = String(Date.now());
      targetId = `EDU-${ts}-${Math.floor(100 + Math.random() * 900)}`;
    }
    const normalized = {
      id: targetId,
      eduId: targetId,
      userId: eduItem.userId || eduItem.user_id || eduItem.authorUsername || eduItem.username || '',
      name: eduItem.name || eduItem.authorName || '사용자',
      division: eduItem.division || eduItem.authorDivision || '',
      team: eduItem.team || eduItem.authorTeam || '',
      rank: eduItem.rank || eduItem.authorRank || '대리',
      category: eduItem.category || '법정',
      title: eduItem.title || '',
      completionDate: eduItem.completionDate || eduItem.completion_date || '',
      expiryDate: eduItem.expiryDate || eduItem.expiry_date || '',
      memo: eduItem.memo || ''
    };

    // 1. IndexedDB & LocalStorage
    try {
      await this.putItem('edu_logs', normalized);
    } catch (e) {
      const raw = localStorage.getItem('with_security_edu_logs');
      const current = raw ? JSON.parse(raw) : [];
      const idx = current.findIndex(l => (l.id || l.eduId) === targetId);
      let updated = [...current];
      if (idx >= 0) updated[idx] = normalized;
      else updated.unshift(normalized);
      localStorage.setItem('with_security_edu_logs', JSON.stringify(updated));
    }

    // 2. Async REST API Sync
    try {
      await safeFetchApi('/api/edu-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized)
      });
    } catch (e) { }

    notifyDataChanged();
    return normalized;
  }

  async deleteEduLog(eduId, meta = {}) {
    const targetTitle = (meta.title || '').trim().toLowerCase();
    const targetComp = (meta.completionDate || '').trim();
    const targetUser = (meta.userId || meta.name || '').trim().toLowerCase();

    // 1. IndexedDB edu_logs
    try {
      if (eduId) await this.deleteItem('edu_logs', eduId);
      if (targetTitle && targetComp) {
        const all = await this.getAll('edu_logs');
        for (const item of (all || [])) {
          const itemTitle = (item.title || '').trim().toLowerCase();
          const itemComp = (item.completionDate || item.completion_date || '').trim();
          const itemUser = (item.userId || item.name || '').trim().toLowerCase();
          if (itemTitle === targetTitle && itemComp === targetComp && (!targetUser || itemUser === targetUser)) {
            await this.deleteItem('edu_logs', item.id || item.eduId);
          }
        }
      }
    } catch (e) { }

    // 2. LocalStorage with_security_edu_logs
    try {
      const raw = localStorage.getItem('with_security_edu_logs');
      const current = raw ? JSON.parse(raw) : [];
      const updated = current.filter(l => {
        if (l.id === eduId || l.eduId === eduId) return false;
        if (targetTitle && targetComp) {
          const itemTitle = (l.title || '').trim().toLowerCase();
          const itemComp = (l.completionDate || l.completion_date || '').trim();
          if (itemTitle === targetTitle && itemComp === targetComp) return false;
        }
        return true;
      });
      localStorage.setItem('with_security_edu_logs', JSON.stringify(updated));
    } catch (e) { }

    // 3. User's isolated trainings storage
    if (meta.userId || meta.username) {
      const uid = meta.userId || meta.username;
      const rawU = localStorage.getItem(`with_security_user_trainings_${uid}`);
      if (rawU) {
        try {
          const list = JSON.parse(rawU);
          const filtered = (list || []).filter(l => {
            if (l.id === eduId || l.eduId === eduId) return false;
            if (targetTitle && targetComp) {
              const itemTitle = (l.title || '').trim().toLowerCase();
              const itemComp = (l.completionDate || l.completion_date || '').trim();
              if (itemTitle === targetTitle && itemComp === targetComp) return false;
            }
            return true;
          });
          localStorage.setItem(`with_security_user_trainings_${uid}`, JSON.stringify(filtered));
        } catch (e) { }
      }
    }

    // 4. Async REST API Delete
    try {
      const qs = new URLSearchParams();
      if (meta.title) qs.set('title', meta.title);
      if (meta.completionDate) qs.set('completionDate', meta.completionDate);
      if (meta.userId || meta.username) qs.set('userId', meta.userId || meta.username);
      if (meta.name) qs.set('name', meta.name);
      const queryStr = qs.toString() ? `?${qs.toString()}` : '';

      await safeFetchApi(`/api/edu-logs/${encodeURIComponent(eduId || 'unknown')}${queryStr}`, {
        method: 'DELETE',
        body: JSON.stringify({
          id: eduId,
          edu_id: eduId,
          title: meta.title || '',
          completion_date: meta.completionDate || meta.completion_date || '',
          user_id: meta.userId || meta.username || '',
          name: meta.name || ''
        })
      });
    } catch (e) { }

    notifyDataChanged();
    return true;
  }

  // ==========================================
  // --- TBM (Tool Box Meeting) Domain CRUD ---
  // ==========================================

  _normalizeTbm(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const tbm = { ...raw };
    tbm.id = String(tbm.id || tbm.tbm_id || tbm.tbmId || `tbm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`).trim();
    tbm.date = normalizeKstDate(tbm.date || tbm.log_date || tbm.logDate) || new Date().toLocaleDateString('sv-SE');
    tbm.site = (tbm.site || tbm.siteName || tbm.site_name || '').trim();
    tbm.siteAddress = (tbm.siteAddress || tbm.site_address || tbm.address || '').trim();
    tbm.workTitle = (tbm.workTitle || tbm.work_title || tbm.title || '').trim();
    tbm.workArea = (tbm.workArea || tbm.work_area || '').trim();
    tbm.workCategory = (tbm.workCategory || tbm.work_category || '일반작업').trim();
    tbm.leaderDivision = (tbm.leaderDivision || tbm.leader_division || tbm.division || '').trim();
    tbm.leaderTeam = (tbm.leaderTeam || tbm.leader_team || tbm.team || '').trim();
    tbm.leaderName = (tbm.leaderName || tbm.leader_name || tbm.leader || '').trim();
    tbm.leaderRank = (tbm.leaderRank || tbm.leader_rank || tbm.rank || '대리').trim();
    tbm.leaderPhone = (tbm.leaderPhone || tbm.leader_phone || tbm.phone || '').trim();
    tbm.workContent = (tbm.workContent || tbm.work_content || tbm.content || '').trim();
    tbm.toolsUsed = (tbm.toolsUsed || tbm.tools_used || '').trim();

    // Parse attendees safely
    if (typeof tbm.attendees === 'string') {
      try { tbm.attendees = JSON.parse(tbm.attendees); } catch (e) { tbm.attendees = []; }
    }
    if (!Array.isArray(tbm.attendees)) tbm.attendees = [];

    // Parse absentees safely
    if (typeof tbm.absentees === 'string') {
      try { tbm.absentees = JSON.parse(tbm.absentees); } catch (e) { tbm.absentees = []; }
    }
    if (!Array.isArray(tbm.absentees)) tbm.absentees = [];

    // Parse additionalTbms safely (미참석자 추가 TBM 이수 목록)
    if (typeof tbm.additionalTbms === 'string') {
      try { tbm.additionalTbms = JSON.parse(tbm.additionalTbms); } catch (e) { tbm.additionalTbms = []; }
    }
    if (typeof tbm.additional_tbms === 'string') {
      try { tbm.additionalTbms = JSON.parse(tbm.additional_tbms); } catch (e) { tbm.additionalTbms = tbm.additionalTbms || []; }
    } else if (tbm.additional_tbms && Array.isArray(tbm.additional_tbms)) {
      tbm.additionalTbms = tbm.additional_tbms;
    }
    if (!Array.isArray(tbm.additionalTbms)) tbm.additionalTbms = [];
    tbm.additionalTbms = tbm.additionalTbms.map(a => {
      if (!a || typeof a !== 'object') return null;
      let photos = Array.isArray(a.photos) ? a.photos : [];
      let photo = a.photo || (photos[0]?.dataUrl || '');
      if (photo && photos.length === 0) {
        photos = [{ id: 'photo_1', dataUrl: photo, name: 'additional_photo.jpg' }];
      }
      return {
        ...a,
        photos,
        photo
      };
    }).filter(Boolean);
    tbm.additional_tbms = tbm.additionalTbms;

    // Parse preCheck safely
    if (typeof tbm.preCheck === 'string') {
      try { tbm.preCheck = JSON.parse(tbm.preCheck); } catch (e) { tbm.preCheck = {}; }
    }
    if (typeof tbm.pre_check === 'string') {
      try { tbm.preCheck = JSON.parse(tbm.pre_check); } catch (e) { tbm.preCheck = tbm.preCheck || {}; }
    } else if (tbm.pre_check && typeof tbm.pre_check === 'object') {
      tbm.preCheck = tbm.pre_check;
    }
    if (!tbm.preCheck || typeof tbm.preCheck !== 'object') {
      tbm.preCheck = { isCompleted: true, selectedItems: [], photos: [] };
    }
    if (!Array.isArray(tbm.preCheck.selectedItems)) tbm.preCheck.selectedItems = [];
    if (!Array.isArray(tbm.preCheck.photos)) tbm.preCheck.photos = [];

    // Parse postCheck safely
    if (typeof tbm.postCheck === 'string') {
      try { tbm.postCheck = JSON.parse(tbm.postCheck); } catch (e) { tbm.postCheck = {}; }
    }
    if (typeof tbm.post_check === 'string') {
      try { tbm.postCheck = JSON.parse(tbm.post_check); } catch (e) { tbm.postCheck = tbm.postCheck || {}; }
    } else if (tbm.post_check && typeof tbm.post_check === 'object') {
      tbm.postCheck = tbm.post_check;
    }
    if (!tbm.postCheck || typeof tbm.postCheck !== 'object') {
      tbm.postCheck = { isCompleted: false, selectedItems: [], photos: [], absentees: [] };
    }
    if (tbm.postCheck.cleanupCheck === undefined) tbm.postCheck.cleanupCheck = true;
    if (tbm.postCheck.toolRecoveryCheck === undefined) tbm.postCheck.toolRecoveryCheck = true;
    if (tbm.postCheck.securityMediaCheck === undefined) tbm.postCheck.securityMediaCheck = true;
    if (tbm.postCheck.powerSafetyCheck === undefined) tbm.postCheck.powerSafetyCheck = true;
    if (!Array.isArray(tbm.postCheck.selectedItems)) tbm.postCheck.selectedItems = [];
    if (!Array.isArray(tbm.postCheck.photos)) tbm.postCheck.photos = [];
    if (!Array.isArray(tbm.postCheck.absentees)) tbm.postCheck.absentees = [];

    const rawType = String(tbm.tbmType || tbm.tbm_type || tbm['구분'] || '').trim().toLowerCase();
    let isPostTbm = false;
    if (String(tbm.id || '').startsWith('tbm_post_')) {
      isPostTbm = true;
    } else if (String(tbm.id || '').startsWith('tbm_pre_')) {
      isPostTbm = false;
    } else if (rawType.indexOf('후') !== -1 || rawType === 'post') {
      isPostTbm = true;
    } else if (rawType.indexOf('전') !== -1 || rawType === 'pre') {
      isPostTbm = false;
    } else {
      isPostTbm = Boolean(tbm.postCheck && tbm.postCheck.isCompleted && !tbm.preCheck?.isCompleted);
    }
    tbm.tbmType = isPostTbm ? 'post' : 'pre';
    tbm.tbm_type = isPostTbm ? '업무 후' : '업무 전';
    tbm['구분'] = tbm.tbm_type;
    tbm.status = tbm.status || (isPostTbm ? 'POST_COMPLETED' : 'PRE_COMPLETED');
    tbm.createdAt = tbm.createdAt || tbm.created_at || new Date().toISOString();
    tbm.updatedAt = tbm.updatedAt || tbm.updated_at || tbm.createdAt;

    return tbm;
  }

  async getTbms(filterDate = null, forceRemote = false) {
    // 1. Instant Local Cache Return (0.1ms) - completely eliminates UI freezing/lag
    if (!forceRemote) {
      try {
        const raw = localStorage.getItem('with_security_tbms_backup');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const normalizedList = list.map(item => this._normalizeTbm(item)).filter(Boolean);
            this._revalidateTbmsInBackground().catch(() => { });
            return this._filterAndSortTbms(normalizedList, filterDate);
          }
        }
      } catch (e) { }

      try {
        const dbItems = await this.getAll('tbms');
        if (Array.isArray(dbItems) && dbItems.length > 0) {
          const normalizedList = dbItems.map(item => this._normalizeTbm(item)).filter(Boolean);
          this._revalidateTbmsInBackground().catch(() => { });
          return this._filterAndSortTbms(normalizedList, filterDate);
        }
      } catch (e) { }
    }

    return await this._fetchTbmsRemote(filterDate);
  }

  async _revalidateTbmsInBackground() {
    const now = Date.now();
    if (this._lastTbmsRevalidate && (now - this._lastTbmsRevalidate < 30000)) return;
    this._lastTbmsRevalidate = now;
    await this._fetchTbmsRemote();
  }

  async _fetchTbmsRemote(filterDate = null) {
    let list = [];
    try {
      const res = await safeFetchApi('/api/tbms');
      if (res && res.ok) {
        const json = await res.json();
        const remoteData = json.data || json;
        if (Array.isArray(remoteData)) {
          const normalized = remoteData.map(item => this._normalizeTbm(item)).filter(Boolean);

          // Merge with local items to prevent newly created local records from being erased
          const mergedMap = new Map();
          normalized.forEach(item => mergedMap.set(String(item.id), item));
          try {
            const currentRaw = localStorage.getItem('with_security_tbms_backup');
            if (currentRaw) {
              const currentList = JSON.parse(currentRaw);
              if (Array.isArray(currentList)) {
                currentList.forEach(loc => {
                  if (loc && loc.id) {
                    const idStr = String(loc.id);
                    if (!mergedMap.has(idStr)) {
                      mergedMap.set(idStr, this._normalizeTbm(loc));
                    } else {
                      const remoteItem = mergedMap.get(idStr);
                      const locAdd = Array.isArray(loc.additionalTbms) ? loc.additionalTbms : [];
                      const remAdd = Array.isArray(remoteItem.additionalTbms) ? remoteItem.additionalTbms : [];
                      if (locAdd.length > 0) {
                        const comb = new Map();
                        remAdd.forEach(a => { if (a && (a.name || a.id)) comb.set(a.name || a.id, a); });
                        locAdd.forEach(a => {
                          if (a && (a.name || a.id)) {
                            const k = a.name || a.id;
                            const ex = comb.get(k);
                            comb.set(k, { ...(ex || {}), ...a });
                          }
                        });
                        remoteItem.additionalTbms = Array.from(comb.values());
                        remoteItem.additional_tbms = remoteItem.additionalTbms;
                      }
                    }
                  }
                });
              }
            }
          } catch (e) { }

          // Restore photo dataUrls and additionalTbms from IndexedDB if remote doesn't have them
          const mergedList = Array.from(mergedMap.values());
          for (const item of mergedList) {
            try {
              const localDbItem = await this.getItem('tbms', item.id);
              if (localDbItem) {
                // Restore pre/post check photos
                if ((!item.preCheck?.photos?.[0]?.dataUrl) && localDbItem.preCheck?.photos?.[0]?.dataUrl) {
                  item.preCheck.photos = localDbItem.preCheck.photos;
                }
                if ((!item.postCheck?.photos?.[0]?.dataUrl) && localDbItem.postCheck?.photos?.[0]?.dataUrl) {
                  item.postCheck.photos = localDbItem.postCheck.photos;
                }
                // Restore & merge additionalTbms from local DB (including full photo dataUrls)
                const localAdd = Array.isArray(localDbItem.additionalTbms) ? localDbItem.additionalTbms : [];
                const remoteAdd = Array.isArray(item.additionalTbms) ? item.additionalTbms : [];
                if (localAdd.length > 0) {
                  const combined = new Map();
                  remoteAdd.forEach(a => { if (a && (a.name || a.id)) combined.set(a.name || a.id, a); });
                  localAdd.forEach(locA => {
                    if (locA && (locA.name || locA.id)) {
                      const key = locA.name || locA.id;
                      const ex = combined.get(key);
                      if (!ex) {
                        combined.set(key, locA);
                      } else {
                        const hasLocalPhotos = locA.photos && locA.photos.length > 0 && locA.photos[0]?.dataUrl;
                        combined.set(key, {
                          ...ex,
                          ...locA,
                          photos: hasLocalPhotos ? locA.photos : (ex.photos || locA.photos || []),
                          photo: locA.photo || ex.photo || ''
                        });
                      }
                    }
                  });
                  item.additionalTbms = Array.from(combined.values());
                  item.additional_tbms = item.additionalTbms;
                }
                // Restore absentee completed state
                if (Array.isArray(localDbItem.absentees) && Array.isArray(item.absentees)) {
                  item.absentees = item.absentees.map(remAbs => {
                    const rName = typeof remAbs === 'string' ? remAbs : remAbs?.name;
                    const locMatch = localDbItem.absentees.find(locAbs => (typeof locAbs === 'string' ? locAbs : locAbs?.name) === rName);
                    if (locMatch && typeof locMatch === 'object' && locMatch.additionalCompleted) {
                      return { ...(typeof remAbs === 'object' ? remAbs : { name: remAbs }), ...locMatch };
                    }
                    return remAbs;
                  });
                }
              }
              await this.putItem('tbms', item);
            } catch (e) { }
          }

          localStorage.setItem('with_security_tbms_backup', JSON.stringify(mergedList));
          list = mergedList;
          this.notifyDataChanged(true);
        }
      }
    } catch (e) { }

    if (list.length === 0) {
      try {
        const raw = localStorage.getItem('with_security_tbms_backup');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            list = parsed.map(item => this._normalizeTbm(item)).filter(Boolean);
          }
        }
      } catch (e) { }
    }

    return this._filterAndSortTbms(list, filterDate);
  }

  _filterAndSortTbms(list, filterDate) {
    const sorted = [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date).getTime() || 0;
      const timeB = new Date(b.createdAt || b.date).getTime() || 0;
      return timeB - timeA;
    });
    if (filterDate) {
      return sorted.filter(item => item.date === filterDate);
    }
    return sorted;
  }

  async getTbmById(id) {
    if (!id) return null;
    const all = await this.getTbms();
    return all.find(item => String(item.id) === String(id)) || null;
  }

  async saveTbm(tbm) {
    if (!tbm) return null;
    const fullTbm = this._normalizeTbm({
      ...tbm,
      updatedAt: new Date().toISOString()
    });

    // 1. Immediately update LocalStorage cache (0.1ms UI response)
    try {
      const raw = localStorage.getItem('with_security_tbms_backup');
      let list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];
      const idx = list.findIndex(item => String(item.id) === String(fullTbm.id));
      if (idx >= 0) {
        list[idx] = fullTbm;
      } else {
        list.unshift(fullTbm);
      }
      localStorage.setItem('with_security_tbms_backup', JSON.stringify(list));
    } catch (e) { }

    // 2. Put into IndexedDB immediately with full photos
    try {
      await this.putItem('tbms', fullTbm);
    } catch (e) { }

    // Send full TBM payload including photos (Google Apps Script will safely upload to Drive & return permanent URLs)
    const remotePayload = {
      ...fullTbm,
      // 1. 사업장 및 기본 정보 (camelCase & snake_case 둘 다 명시적으로 매핑하여 시트 컬럼 100% 저장 보장)
      site: fullTbm.site || fullTbm.siteName || '',
      site_name: fullTbm.site || fullTbm.siteName || '',
      siteName: fullTbm.site || fullTbm.siteName || '',
      site_address: fullTbm.siteAddress || fullTbm.site_address || '',
      siteAddress: fullTbm.siteAddress || fullTbm.site_address || '',
      work_title: fullTbm.workTitle || fullTbm.work_title || '',
      workTitle: fullTbm.workTitle || fullTbm.work_title || '',
      work_area: fullTbm.workArea || fullTbm.work_area || '',
      workArea: fullTbm.workArea || fullTbm.work_area || '',
      work_category: fullTbm.workCategory || fullTbm.work_category || '일반작업',
      workCategory: fullTbm.workCategory || fullTbm.work_category || '일반작업',
      leader_division: fullTbm.leaderDivision || fullTbm.leader_division || '',
      leaderDivision: fullTbm.leaderDivision || fullTbm.leader_division || '',
      leader_team: fullTbm.leaderTeam || fullTbm.leader_team || '',
      leaderTeam: fullTbm.leaderTeam || fullTbm.leader_team || '',
      leader_name: fullTbm.leaderName || fullTbm.leader_name || '',
      leaderName: fullTbm.leaderName || fullTbm.leader_name || '',
      leader_rank: fullTbm.leaderRank || fullTbm.leader_rank || '대리',
      leaderRank: fullTbm.leaderRank || fullTbm.leader_rank || '대리',
      leader_phone: fullTbm.leaderPhone || fullTbm.leader_phone || '',
      leaderPhone: fullTbm.leaderPhone || fullTbm.leader_phone || '',
      work_content: fullTbm.workContent || fullTbm.work_content || '',
      workContent: fullTbm.workContent || fullTbm.work_content || '',
      tools_used: fullTbm.toolsUsed || fullTbm.tools_used || '',
      tbmType: fullTbm.tbmType === 'post' ? '업무 후' : '업무 전',
      tbm_type: fullTbm.tbmType === 'post' ? '업무 후' : '업무 전',
      구분: fullTbm.tbmType === 'post' ? '업무 후' : '업무 전',

      // 2. 추가 TBM 인원 및 사진
      additionalTbms: (fullTbm.additionalTbms || []).map(a => ({
        ...a,
        photos: (a.photos || []).map(p => ({
          id: p.id,
          name: p.name || 'photo.jpg',
          size: p.size || 0,
          takenAt: p.takenAt || p.timestamp || '',
          dataUrl: p.dataUrl || '',
          url: p.url || p.viewUrl || p.thumbnailUrl || ''
        })),
        photo: (a.photo && typeof a.photo === 'string' && a.photo.length < 25000) ? a.photo : ''
      })),
      additional_tbms: (fullTbm.additionalTbms || []).map(a => ({
        ...a,
        photos: (a.photos || []).map(p => ({
          id: p.id,
          name: p.name || 'photo.jpg',
          size: p.size || 0,
          takenAt: p.takenAt || p.timestamp || '',
          dataUrl: p.dataUrl || '',
          url: p.url || p.viewUrl || p.thumbnailUrl || ''
        })),
        photo: (a.photo && typeof a.photo === 'string' && a.photo.length < 25000) ? a.photo : ''
      })),

      // 3. 작업 전 점검 사진 (Drive 저장을 위해 dataUrl 유지 전달)
      preCheck: {
        ...fullTbm.preCheck,
        photos: (fullTbm.preCheck?.photos || []).map(p => ({
          id: p.id,
          name: p.name || 'photo.jpg',
          size: p.size || 0,
          timestamp: p.timestamp || p.takenAt || '',
          takenAt: p.takenAt || p.timestamp || '',
          dataUrl: p.dataUrl || '',
          url: p.url || p.viewUrl || p.thumbnailUrl || ''
        }))
      },

      // 4. 작업 후 점검 사진 (Drive 저장을 위해 dataUrl 유지 전달)
      postCheck: {
        ...fullTbm.postCheck,
        photos: (fullTbm.postCheck?.photos || []).map(p => ({
          id: p.id,
          name: p.name || 'photo.jpg',
          size: p.size || 0,
          timestamp: p.timestamp || p.takenAt || '',
          takenAt: p.takenAt || p.timestamp || '',
          dataUrl: p.dataUrl || '',
          url: p.url || p.viewUrl || p.thumbnailUrl || ''
        }))
      }
    };

    // 3. Non-blocking background sync with server (never stalls the UI!)
    safeFetchApi('/api/tbms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(remotePayload)
    }).catch(err => console.warn('Background TBM sync warning:', err));

    notifyDataChanged();
    return fullTbm;
  }

  async updateTbm(id, patch) {
    if (!id) return null;
    const existing = await this.getTbmById(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    return await this.saveTbm(updated);
  }

  async addAdditionalTbm(tbmId, additionalData) {
    if (!tbmId || !additionalData) return null;
    const existing = await this.getTbmById(tbmId);
    if (!existing) return null;

    const list = Array.isArray(existing.additionalTbms) ? [...existing.additionalTbms] : [];
    const photosArr = Array.isArray(additionalData.photos) ? additionalData.photos : (additionalData.photo ? [{ id: `photo_${Date.now()}`, dataUrl: additionalData.photo, name: 'additional_tbm.jpg' }] : []);
    const photoMain = additionalData.photo || photosArr[0]?.dataUrl || '';

    const newEntry = {
      id: additionalData.id || `add_tbm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: (additionalData.name || '').trim(),
      rank: (additionalData.rank || '사원').trim(),
      team: (additionalData.team || '').trim(),
      division: (additionalData.division || '').trim(),
      phone: (additionalData.phone || '').trim(),
      conductedAt: additionalData.conductedAt || new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      date: additionalData.date || normalizeKstDate(new Date()) || '',
      safetyChecked: additionalData.safetyChecked !== false,
      notes: (additionalData.notes || '').trim(),
      photos: photosArr,
      photo: photoMain,
      registeredBy: additionalData.registeredBy || ''
    };

    const existIdx = list.findIndex(item => item.name === newEntry.name);
    if (existIdx >= 0) {
      list[existIdx] = newEntry;
    } else {
      list.push(newEntry);
    }

    // Update absentee status flag if this person was recorded as absentee
    let updatedAbsentees = Array.isArray(existing.absentees) ? [...existing.absentees] : [];
    updatedAbsentees = updatedAbsentees.map(abs => {
      const absName = typeof abs === 'string' ? abs : abs?.name;
      if (absName === newEntry.name) {
        if (typeof abs === 'string') {
          return { name: abs, reason: '추가TBM완료', additionalCompleted: true, completedAt: newEntry.conductedAt };
        }
        return { ...abs, additionalCompleted: true, completedAt: newEntry.conductedAt };
      }
      return abs;
    });

    let updatedPostAbsentees = Array.isArray(existing.postCheck?.absentees) ? [...existing.postCheck.absentees] : [];
    updatedPostAbsentees = updatedPostAbsentees.map(abs => {
      const absName = typeof abs === 'string' ? abs : abs?.name;
      if (absName === newEntry.name) {
        if (typeof abs === 'string') {
          return { name: abs, reason: '추가TBM완료', additionalCompleted: true, completedAt: newEntry.conductedAt };
        }
        return { ...abs, additionalCompleted: true, completedAt: newEntry.conductedAt };
      }
      return abs;
    });

    const updated = {
      ...existing,
      absentees: updatedAbsentees,
      postCheck: {
        ...(existing.postCheck || {}),
        absentees: updatedPostAbsentees
      },
      additionalTbms: list,
      updatedAt: new Date().toISOString()
    };

    return await this.saveTbm(updated);
  }

  async deleteTbm(id) {
    if (!id) return false;
    const targetId = String(id).trim();

    // 1. Immediately delete from LocalStorage cache (0.1ms UI response)
    try {
      const raw = localStorage.getItem('with_security_tbms_backup');
      if (raw) {
        let list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list = list.filter(item => String(item.id) !== targetId);
          localStorage.setItem('with_security_tbms_backup', JSON.stringify(list));
        }
      }
    } catch (e) { }

    // 2. Delete from IndexedDB immediately
    try {
      await this.deleteItem('tbms', targetId);
    } catch (e) { }

    // 3. Non-blocking background sync with server
    safeFetchApi(`/api/tbms/${encodeURIComponent(targetId)}`, { method: 'DELETE' })
      .catch(err => console.warn('Background TBM delete warning:', err));

    notifyDataChanged();
    return true;
  }

  getServerUrl() {
    return getServerUrl();
  }

  setServerUrl(url) {
    return setServerUrl(url);
  }

  /**
   * 공통 원격 데이터 동기화 수신 및 로컬 캐시/IndexedDB 적재 메서드
   */
  async _applySyncPayload(syncData, isSheet = false) {
    if (!syncData) return { success: false, message: '동기화할 데이터가 비어 있습니다.' };

    let usersCount = 0;
    let sitesCount = 0;
    let workLogsCount = 0;
    let secLogsCount = 0;

    // 1. users
    if (syncData.users && Array.isArray(syncData.users)) {
      const rawNormalized = syncData.users.map(u => {
        let trainings = u.trainings;
        if (typeof trainings === 'string' && (trainings.startsWith('[') || trainings.startsWith('{'))) {
          try { trainings = JSON.parse(trainings); } catch (e) { }
        }
        return {
          ...u,
          id: u.id || u.username,
          username: String(u.username || '').trim(),
          name: String(u.name || '').trim(),
          role: u.role || '일반',
          division: u.division || '',
          team: u.team || '',
          rank: u.rank || '',
          phone: u.phone || '',
          email: u.email || '',
          trainings: Array.isArray(trainings) ? trainings : []
        };
      });
      const normalizedUsers = this._deduplicateUsers(rawNormalized);
      usersCount = normalizedUsers.length;
      localStorage.setItem('with_security_users_cloud_cache', JSON.stringify(normalizedUsers));
      localStorage.setItem('with_security_users_db', JSON.stringify(normalizedUsers));
      await this.replaceCollection('users', normalizedUsers);
    }

    // 2. sites
    if (syncData.sites && Array.isArray(syncData.sites)) {
      const siteMap = new Map();
      syncData.sites.forEach(s => {
        if (!s) return;
        const name = String(s.name || s.site_name || '').trim();
        const address = String(s.address || '').trim();
        const key = name && address ? `${name}::${address}` : (s.id || name);
        if (!siteMap.has(key)) {
          siteMap.set(key, {
            id: s.id || `site-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
            type: s.type || '보안앱O',
            name: name,
            address: address,
            site_name: s.site_name || name
          });
        }
      });
      const dedupedSites = Array.from(siteMap.values());
      sitesCount = dedupedSites.length;
      localStorage.setItem('with_security_sites_cloud_cache', JSON.stringify(dedupedSites));
      localStorage.setItem('with_security_sites_backup', JSON.stringify(dedupedSites));
      await this.replaceCollection('sites', dedupedSites);
    }

    // 3. work_logs
    if (syncData.work_logs && Array.isArray(syncData.work_logs)) {
      const deletedSet = this._getDeletedWorkLogsSet();
      const currentLocal = (() => {
        try {
          const raw = localStorage.getItem('with_security_work_logs');
          return raw ? JSON.parse(raw) : [];
        } catch (e) {
          return [];
        }
      })();
      const dedupedWorkLogs = this._mergeRemoteWithLocalWorkLogs(syncData.work_logs, currentLocal, deletedSet);
      workLogsCount = dedupedWorkLogs.length;
      localStorage.setItem('with_security_work_logs', JSON.stringify(dedupedWorkLogs));
      await this.replaceCollection('work_logs', dedupedWorkLogs);
    }

    // 4. security_logs / checklists
    const misplacedPledges = (syncData.work_logs && Array.isArray(syncData.work_logs))
      ? syncData.work_logs.filter(item => {
        const id = String(item.id || item.log_id || '').trim();
        return id.startsWith('PASS-') || item.visitorName || item.visitor_name || item.pledge_terms;
      })
      : [];

    let incomingSecLogs = [];
    if (Array.isArray(syncData.security_logs) && syncData.security_logs.length > 0) {
      incomingSecLogs = syncData.security_logs;
    } else if (Array.isArray(syncData.checklists) && syncData.checklists.length > 0) {
      incomingSecLogs = syncData.checklists;
    }
    const combinedPledges = incomingSecLogs.concat(misplacedPledges);
    if (combinedPledges.length > 0 || Array.isArray(syncData.security_logs) || Array.isArray(syncData.checklists)) {
      const normalizedPledges = combinedPledges.map(item => this._normalizeChecklist(item)).filter(Boolean);
      const consolidated = this._consolidateChecklists(normalizedPledges);
      secLogsCount = consolidated.length;
      localStorage.setItem('with_security_checklists_cache', JSON.stringify(consolidated));
      localStorage.setItem('with_security_checklists_backup', JSON.stringify(consolidated));
      await this.replaceCollection('checklists', consolidated);
    }

    // 5. tbms
    if (syncData.tbms && Array.isArray(syncData.tbms)) {
      localStorage.setItem('with_security_tbms_backup', JSON.stringify(syncData.tbms));
      await this.replaceCollection('tbms', syncData.tbms);
    }

    // 6. weekly_reports
    if (syncData.weekly_reports && Array.isArray(syncData.weekly_reports)) {
      localStorage.setItem('with_sec_shared_weekly_reports', JSON.stringify(syncData.weekly_reports));
      await this.replaceCollection('weekly_reports', syncData.weekly_reports);
    }

    // 7. edu_logs
    if (syncData.edu_logs && Array.isArray(syncData.edu_logs)) {
      await this.replaceCollection('edu_logs', syncData.edu_logs);
    }

    // 8. vault
    if (syncData.vault && Array.isArray(syncData.vault)) {
      await this.replaceCollection('vault', syncData.vault);
    }

    // 9. incidents
    if (syncData.incidents && Array.isArray(syncData.incidents)) {
      await this.replaceCollection('incidents', syncData.incidents);
    }

    recentResponseCache.clear();
    this.notifyDataChanged(true);

    const total = usersCount + sitesCount + workLogsCount + secLogsCount;
    return {
      success: true,
      count: total,
      mode: isSheet ? 'google_sheet' : 'api',
      message: isSheet
        ? `구글 스프레드시트(Withsharing_DB) 전체 데이터 실시간 동기화 완료! (총 ${total}건)`
        : `원격 API 서버 데이터 실시간 동기화 완료! (총 ${total}건)`,
      counts: {
        users: usersCount,
        sites: sitesCount,
        work_logs: workLogsCount,
        security_logs: secLogsCount
      },
      data: syncData
    };
  }

  /**
   * 구글 스프레드시트(Withsharing_DB)로부터 전체 데이터 직접 동기화 수신
   */
  async syncFromGoogleSheets(url = null) {
    const sheetUrl = (url || getGoogleSheetsUrl() || DEFAULT_GOOGLE_SHEETS_URL).trim().replace(/\/+$/, '');
    if (!sheetUrl || !sheetUrl.includes('script.google.com')) {
      return { success: false, message: '유효한 구글 스프레드시트 웹 앱 URL이 설정되지 않았습니다.' };
    }

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 20000);
      const queryUrl = `${sheetUrl}${sheetUrl.includes('?') ? '&' : '?'}action=getAll`;
      const res = await fetch(queryUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(tid);

      if (res.ok) {
        const rawText = await res.text();
        let json = null;
        try {
          json = JSON.parse(rawText);
        } catch (e) {
          return {
            success: false,
            message: '구글 스프레드시트 권한 오류: Apps Script [배포 관리]에서 [액세스 권한]을 "모든 사용자(Anyone)"로 변경해 주세요.'
          };
        }

        if (json && json.success && json.data) {
          return await this._applySyncPayload(json.data, true);
        } else {
          return { success: false, message: `구글 스프레드시트 응답 오류: ${json?.error || '데이터 없음'}` };
        }
      } else {
        return { success: false, message: `구글 스프레드시트 서버 응답 실패 [HTTP ${res.status}]` };
      }
    } catch (err) {
      return { success: false, message: `구글 스프레드시트 통신 실패: ${err.message}` };
    }
  }

  /**
   * 스프레드시트 기준 완전 동기화 (스프레드시트에 없는 기존 기기 내 로컬 데이터 영구 삭제)
   */
  async purgeAndSyncFromGoogleSheets(url = null) {
    const sheetUrl = (url || getGoogleSheetsUrl() || DEFAULT_GOOGLE_SHEETS_URL).trim().replace(/\/+$/, '');
    if (!sheetUrl || !sheetUrl.includes('script.google.com')) {
      return { success: false, message: '유효한 구글 스프레드시트 웹 앱 URL이 설정되지 않았습니다.' };
    }

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 25000);
      const queryUrl = `${sheetUrl}${sheetUrl.includes('?') ? '&' : '?'}action=getAll`;
      const res = await fetch(queryUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(tid);

      if (!res.ok) {
        return { success: false, message: `구글 스프레드시트 서버 응답 실패 [HTTP ${res.status}]` };
      }

      const rawText = await res.text();
      let json = null;
      try {
        json = JSON.parse(rawText);
      } catch (e) {
        return {
          success: false,
          message: '구글 스프레드시트 응답 파싱 실패 (권한 설정이 "모든 사용자(Anyone)"인지 확인해 주세요).'
        };
      }

      if (!json || !json.success || !json.data) {
        return { success: false, message: `구글 스프레드시트 데이터 오류: ${json?.error || '데이터 없음'}` };
      }

      // _applySyncPayload는 replaceCollection을 호출하여 시트에 없는 로컬 데이터를 완전 삭제함
      const syncResult = await this._applySyncPayload(json.data, true);

      return {
        success: true,
        message: `구글 스프레드시트 기준 완전 동기화 완료!\n(시트에 없는 기존 로컬 데이터가 모두 삭제되고, 최신 스프레드시트 데이터로 100% 교체되었습니다)`,
        counts: syncResult.counts,
        data: json.data
      };
    } catch (err) {
      return { success: false, message: `동기화 통신 오류: ${err.message}` };
    }
  }

  /**
   * 구글 스프레드시트 내 중복 데이터 전 시트 자동 정리 실행
   */
  async cleanupGoogleSheetsDuplicates(url = null) {
    const sheetUrl = (url || getGoogleSheetsUrl() || DEFAULT_GOOGLE_SHEETS_URL).trim().replace(/\/+$/, '');
    if (!sheetUrl || !sheetUrl.includes('script.google.com')) {
      return { success: false, message: '유효한 구글 스프레드시트 웹 앱 URL이 설정되지 않았습니다.' };
    }

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(sheetUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'cleanup' }),
        signal: controller.signal
      });
      clearTimeout(tid);

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          recentResponseCache.clear();
          // 중복 정리 후 최신 시트 데이터로 로컬 즉시 동기화
          await this.syncFromGoogleSheets(sheetUrl);
          return {
            success: true,
            message: json.message || `스프레드시트 중복 행 ${json.totalDeleted || 0}건 정리 완료`,
            totalDeleted: json.totalDeleted || 0,
            details: json.details
          };
        } else {
          return { success: false, message: json.error || '중복 정리 처리 오류' };
        }
      } else {
        return { success: false, message: `스프레드시트 서버 응답 실패 [HTTP ${res.status}]` };
      }
    } catch (err) {
      return { success: false, message: `중복 정리 통신 실패: ${err.message}` };
    }
  }

  /**
   * 통합 서버 및 구글 스프레드시트 전체 동기화 실행기
   */
  async syncAllWithServer(serverUrl = null) {
    const sheetUrl = (serverUrl && serverUrl.includes('script.google.com'))
      ? serverUrl
      : getGoogleSheetsUrl();

    // 1. 구글 스프레드시트 URL이 등록되어 있는 경우 최우선으로 즉시 구글 시트 전체 동기화 실행
    if (sheetUrl && sheetUrl.includes('script.google.com')) {
      return await this.syncFromGoogleSheets(sheetUrl);
    }

    const hostedUrl = getHostedServerUrl();
    const targetUrl = (serverUrl || hostedUrl || DEFAULT_PUBLIC_URL).replace(/\/+$/, '');

    // 2. Node.js 백엔드 REST API 서버 엔드포인트인 경우
    if (isApiEndpoint(targetUrl)) {
      try {
        const res = await safeFetchApi('/api/sync/all', { timeout: 10000 });
        if (res && res.ok) {
          const data = await res.json();
          const syncData = data.data || data;
          return await this._applySyncPayload(syncData, false);
        }
      } catch (e) {
        console.warn('API sync failed:', e);
      }
    }

    return { success: true, mode: 'static_host', url: targetUrl };
  }

  /**
   * 내 컴퓨터(로컬)의 모든 데이터(업무일지, 서약서, 계정 등)를 구글 스프레드시트로 일괄 업로드
   */
  async uploadAllLocalDataToGoogleSheet(targetUrl = null) {
    const rawUrl = (targetUrl || this.getGoogleSheetsUrl() || this.getServerUrl() || '').trim();
    if (!rawUrl.includes('script.google.com')) {
      return { success: false, message: '구글 스프레드시트 웹 앱 URL이 올바르게 설정되지 않았습니다.' };
    }

    try {
      const users = await this.getRegisteredUsers();
      const sites = await this.getSites();
      const workLogs = await this.getWorkLogs();
      const checklists = await this.getChecklists();
      const eduLogs = await this.getAll('edu_logs').catch(() => []);
      const weeklyReports = await this.getAll('weekly_reports').catch(() => []);
      const tbms = await this.getTbms().catch(() => []);
      const vault = await this.getAll('vault').catch(() => []);
      const incidents = await this.getAll('incidents').catch(() => []);

      const payload = {
        action: 'upload_all',
        data: {
          users: users || [],
          sites: sites || [],
          work_logs: workLogs || [],
          security_logs: checklists || [],
          edu_logs: eduLogs || [],
          weekly_reports: weeklyReports || [],
          tbms: tbms || [],
          vault: vault || [],
          incidents: incidents || []
        }
      };

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 25000); // 25초 넉넉하게 대기

      const res = await fetch(rawUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(tid);

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return {
            success: true,
            message: `구글 시트로 일괄 업로드 완료! (업무일지 ${workLogs.length}건, 서약서 ${checklists.length}건, 계정 ${users.length}건, 사업장 ${sites.length}건)`,
            results: json.results,
            counts: {
              workLogs: workLogs.length,
              checklists: checklists.length,
              users: users.length,
              sites: sites.length
            }
          };
        } else {
          return { success: false, message: `구글 시트 처리 오류: ${json.error || '알 수 없는 오류'}` };
        }
      } else {
        return { success: false, message: `구글 시트 응답 실패 [HTTP ${res.status}]` };
      }
    } catch (err) {
      return { success: false, message: `업로드 실패: ${err.message}` };
    }
  }

  normalizeKstDate(val) {
    return normalizeKstDate(val);
  }
}

export const dbService = new SecurityDatabase();

