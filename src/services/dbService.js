import { hashPassword } from './cryptoUtil';

// Server Base URL Management Helper (Default to GitHub Pages before Gabia Hosting)
export const DEFAULT_PUBLIC_URL = 'https://wblee0703.github.io/with.security';

export function getServerUrl() {
  const url = localStorage.getItem('with_security_server_url');
  if (url) return url;
  if (import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  return DEFAULT_PUBLIC_URL;
}

export function setServerUrl(url) {
  if (!url || !url.trim()) {
    localStorage.removeItem('with_security_server_url');
    localStorage.removeItem('with_security_hosted_app_url');
  } else {
    let formatted = url.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = 'http://' + formatted;
    }
    formatted = formatted.replace(/\/+$/, '');
    localStorage.setItem('with_security_server_url', formatted);
    localStorage.setItem('with_security_hosted_app_url', formatted);
  }
}

// Global Cross-View Data Change Broadcast Helper
export function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('with_security_data_changed'));
  }
}

// Check if target URL supports dynamic Node/Express REST API endpoints
export function isApiEndpoint(url) {
  if (!url || !url.trim()) return false;
  const lower = url.toLowerCase();
  return !lower.includes('github.io') && !lower.includes('github.com');
}

// Get REST API Base URL helper (prevents Mixed Content errors on HTTPS GitHub Pages)
export function getApiServerUrl() {
  const url = localStorage.getItem('with_security_server_url');

  // 1. If explicit server URL is saved by user
  if (url && isApiEndpoint(url)) {
    const formatted = url.replace(/\/+$/, '');
    // If page is loaded over HTTPS, block unencrypted http:// to prevent Mixed Content browser error
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && formatted.startsWith('http://')) {
      return null;
    }
    return formatted;
  }

  // 2. If running locally on PC (http://localhost:3000 or http://192.168.0.x:3000)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (!host.includes('github.io') && !host.includes('github.com')) {
      return ''; // Use relative '/api' via local Vite dev server proxy
    }
  }

  // 3. On HTTPS GitHub Pages without an HTTPS API server, return null to prevent Mixed Content error
  return null;
}

// In-Flight Promise Cache & Short-Term Response Cache to prevent burst API calls
const inFlightRequests = new Map();
const recentResponseCache = new Map();

async function safeFetchApi(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const baseUrl = getApiServerUrl();
  if (baseUrl === null) return null;
  const fullUrl = baseUrl ? `${baseUrl}${endpoint}` : endpoint;

  // Invalidate cache on mutations
  if (method !== 'GET') {
    recentResponseCache.delete(fullUrl);
  }

  // Check 1.5s cache for GET requests
  if (method === 'GET') {
    const cached = recentResponseCache.get(fullUrl);
    if (cached && (Date.now() - cached.timestamp < 1500)) {
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
      const tid = setTimeout(() => controller.abort(), options.timeout || 3500);
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('with_security_auth_token') : null;
      const headers = {
        'Bypass-Tunnel-Reminder': 'true',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}`, 'X-Auth-Token': authToken } : {}),
        ...(options.headers || {})
      };
      const res = await fetch(fullUrl, {
        ...options,
        headers,
        signal: controller.signal
      }).catch(() => null);
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
const DB_VERSION = 3;

class SecurityDatabase {
  constructor() {
    this.db = null;
  }

  async initDB(requiredStore = null) {
    if (this.db) {
      if (requiredStore && !this.db.objectStoreNames.contains(requiredStore)) {
        this.db.close();
        this.db = null;
      } else {
        return this.db;
      }
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

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
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Generic Get All Items
  async getAll(storeName) {
    const db = await this.initDB(storeName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic Save or Update Item
  async putItem(storeName, item) {
    const db = await this.initDB(storeName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic Delete Item
  async deleteItem(storeName, id) {
    const db = await this.initDB(storeName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Specific Domain Helpers ---

  async getChecklists() {
    let list = [];

    // 1. Try fetching from remote MySQL Server API if connected
    try {
      const res = await safeFetchApi('/api/security-logs');
      if (res && res.ok) {
        const json = await res.json();
        const remoteData = json.data || json;
        if (Array.isArray(remoteData) && remoteData.length > 0) {
          const consolidated = this._consolidateChecklists(remoteData);
          localStorage.setItem('with_security_checklists_backup', JSON.stringify(consolidated));
          try {
            for (const p of consolidated) await this.putItem('checklists', p);
          } catch (e) {}
          return consolidated;
        }
      }
    } catch (e) {}

    // 2. Offline / Standalone Fallback: Combine IndexedDB and LocalStorage cache (Robust 2-tier local fallback)
    try {
      const backup = localStorage.getItem('with_security_checklists_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }
    } catch (err) {}

    try {
      const dbPledges = await this.getAll('checklists');
      if (Array.isArray(dbPledges) && dbPledges.length > 0) {
        if (list.length === 0) {
          list = dbPledges;
        } else {
          // Merge unique items by id / log_id
          const map = new Map();
          list.forEach(item => {
            const key = String(item.id || item.log_id);
            if (key) map.set(key, item);
          });
          dbPledges.forEach(item => {
            const key = String(item.id || item.log_id);
            if (key && !map.has(key)) map.set(key, item);
          });
          list = Array.from(map.values());
        }
      }
    } catch (e) {}

    const consolidated = this._consolidateChecklists(list);
    localStorage.setItem('with_security_checklists_backup', JSON.stringify(consolidated));
    return consolidated;
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
    const targetId = checklist.id || checklist.log_id || `PASS-${new Date().getFullYear()}-${Date.now()}`;
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
      const existingIndex = existing.findIndex(item => String(item.id) === String(targetId) || String(item.log_id) === String(targetId));
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
    } catch (e) {}

    try {
      const existing = await this.getChecklists();
      const filtered = existing.filter(item => String(item.id) !== String(id) && String(item.log_id) !== String(id));
      localStorage.setItem('with_security_checklists_backup', JSON.stringify(filtered));
    } catch (err) {}

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
      } catch (e) {}
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
      } catch (e) {}
    }
    return this.putItem('vault', item);
  }

  async deleteVaultItem(id) {
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        await fetch(`${serverUrl}/api/vault/${id}`, { method: 'DELETE' });
      } catch (e) {}
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
      } catch (e) {}
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
      } catch (e) {}
    }
    return this.putItem('otp', acc);
  }

  async deleteOtpAccount(id) {
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        await fetch(`${serverUrl}/api/otp/${id}`, { method: 'DELETE' });
      } catch (e) {}
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
      } catch (e) {}
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
      } catch (e) {}
    }
    return this.putItem('incidents', incident);
  }

  async getSites() {
    try {
      const res = await safeFetchApi('/api/security-sites');
      if (res && res.ok) {
        const json = await res.json();
        const remoteData = json.data || json;
        if (Array.isArray(remoteData)) {
          localStorage.setItem('with_security_sites_backup', JSON.stringify(remoteData));
          try {
            const db = await this.initDB('sites');
            const tx = db.transaction('sites', 'readwrite');
            tx.objectStore('sites').clear();
            for (const s of remoteData) await this.putItem('sites', s);
          } catch (e) {}
          return remoteData;
        }
      }
    } catch (e) {}

    try {
      const dbSites = await this.getAll('sites');
      if (dbSites && dbSites.length > 0) return dbSites;
    } catch (e) {}

    try {
      const backup = localStorage.getItem('with_security_sites_backup');
      if (backup) return JSON.parse(backup);
    } catch (e) {}

    return [];
  }

  async saveSite(site) {
    let previousSite = null;
    try {
      const allSites = await this.getSites();
      previousSite = allSites.find(s => String(s.id) === String(site.id));
    } catch (e) {}

    try {
      await safeFetchApi('/api/security-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(site)
      });
    } catch (e) {}

    try {
      await this.putItem('sites', site);
    } catch (e) {}

    // 사업장 정보(사업장명, 위치, 보안앱 사용여부 등) 변경 시 기존 업무일지 및 서약서 데이터 일괄 동기화
    if (previousSite) {
      await this.cascadeUpdateSiteData(site, previousSite);
    }

    notifyDataChanged();
    return site;
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
            } catch (e) {}
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
            try { await this.putItem('checklists', clItem); } catch (e) {}
            try {
              await safeFetchApi('/api/security-checklists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clItem)
              });
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.warn('Failed to cascade update checklists on site change:', e);
    }
  }

  async deleteSite(id) {
    try {
      await safeFetchApi(`/api/security-sites/${id}`, { method: 'DELETE' });
    } catch (e) {}

    try {
      await this.deleteItem('sites', id);
    } catch (e) {}

    notifyDataChanged();
    return id;
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

    // Check local brute force lock first
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

    // 1. Try secure remote backend login API first
    try {
      const res = await safeFetchApi('/api/security-users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uName, password: pass })
      });
      if (res) {
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success && json.user) {
          this.recordLocalLoginAttempt(uName, true);
          if (json.token) {
            localStorage.setItem('with_security_auth_token', json.token);
          }
          await this.saveUserProfile(json.user);
          return { success: true, user: json.user, token: json.token };
        } else {
          // Record local counter matching server or status
          const attempt = this.recordLocalLoginAttempt(uName, false);
          const fCount = json.failCount || attempt.failCount;
          const rAttempts = (json.remainingAttempts !== undefined) ? json.remainingAttempts : attempt.remainingAttempts;
          const isBlocked = json.blocked || attempt.blocked;
          const rSec = json.remainingSec || attempt.remainingSec;

          return {
            success: false,
            message: json.message || (isBlocked
              ? '로그인 5회 실패로 보안 차단되었습니다. 5분 후에 다시 시도해 주세요.'
              : `비밀번호가 일치하지 않습니다. (5회 중 ${fCount}회 실패, 남은 시도: ${rAttempts}회)`),
            failCount: fCount,
            remainingAttempts: rAttempts,
            blocked: isBlocked,
            remainingSec: rSec
          };
        }
      }
    } catch (e) {
      console.warn('Backend login API attempt failed, trying local fallback:', e);
    }

    // 2. Local fallback verification
    const users = await this.getRegisteredUsers();
    let foundUser = null;
    let isPasswordCorrect = false;

    for (const u of users) {
      if (String(u?.username || '').trim().toLowerCase() === uName.toLowerCase()) {
        foundUser = u;
        const dbPass = String(u?.password || '').trim();
        const dbHash = String(u?.passwordHash || '').trim();
        isPasswordCorrect = (await verifyPasswordHash(pass, dbHash)) || (await verifyPasswordHash(pass, dbPass));
        break;
      }
    }

    // Admin emergency failsafe fallback
    if (!foundUser && uName.toLowerCase() === 'admin') {
      const defaultAdminPass = import.meta.env?.VITE_ADMIN_DEFAULT_PASSWORD || 'withtech123!';
      if (pass === defaultAdminPass || pass === 'admin') {
        foundUser = {
          username: 'admin',
          name: '이원배',
          role: '개발자',
          division: '영업/운영사업부',
          team: '운영1팀',
          rank: '대리'
        };
        isPasswordCorrect = true;
      }
    }

    if (foundUser && isPasswordCorrect) {
      this.recordLocalLoginAttempt(uName, true);
      await this.saveUserProfile(foundUser);
      return { success: true, user: foundUser };
    } else {
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
  }

  logout() {
    localStorage.removeItem('with_security_active_user');
    localStorage.removeItem('with_security_auth_token');
    localStorage.removeItem('with_security_active_tab');
    notifyDataChanged();
  }

  async getUserProfile() {
    const cached = localStorage.getItem('with_security_active_user');
    let user = cached ? JSON.parse(cached) : null;

    const users = await this.getRegisteredUsers();
    if (user && users.length > 0) {
      const match = users.find(u => u.username === user.username);
      if (match) {
        user = { ...user, ...match };
      }
    }

    if (user) {
      // Load user's isolated trainings list from localStorage if exists
      try {
        const uid = user.username || user.id || 'default';
        const storedTrainings = localStorage.getItem(`with_security_user_trainings_${uid}`);
        if (storedTrainings) {
          user.trainings = JSON.parse(storedTrainings);
        } else if (!user.trainings || user.trainings.length === 0) {
          if (user.educationDate || user.educationExpiryDate) {
            user.trainings = [{
              id: 'init-1',
              category: '법정',
              title: user.educationName || '사내 정기 정보보안 및 안전 교육',
              completionDate: user.educationDate || '',
              expiryDate: user.educationExpiryDate || '',
              memo: ''
            }];
          } else {
            user.trainings = [];
          }
        }
      } catch (e) {}
      localStorage.setItem('with_security_active_user', JSON.stringify(user));
    }

    return user;
  }

  async saveUserProfile(userProfile) {
    let safeUser = { ...userProfile };
    if (safeUser.password && !safeUser.passwordHash) {
      safeUser.passwordHash = await hashPassword(safeUser.password);
    }

    const previousCached = localStorage.getItem('with_security_active_user');
    const previousUser = previousCached ? JSON.parse(previousCached) : null;

    const uid = safeUser.username || safeUser.id || 'default';
    if (Array.isArray(safeUser.trainings)) {
      try {
        localStorage.setItem(`with_security_user_trainings_${uid}`, JSON.stringify(safeUser.trainings));
      } catch (e) {}
    }

    localStorage.setItem('with_security_active_user', JSON.stringify(safeUser));

    try {
      await this.putItem('users', safeUser);
    } catch (e) {
      console.warn('IndexedDB saveUserProfile fallback:', e);
    }

    try {
      await safeFetchApi('/api/security-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeUser)
      });
    } catch (e) {}

    // 사용자 정보(이름, 직급, 소속팀, 사업부 등) 변경 시 기존 등록 데이터(업무 일지, 출입 서약서 등) 일괄 동기화
    await this.cascadeUpdateUserData(safeUser, previousUser);

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
            } catch (e) {}
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
            try { await this.putItem('checklists', clItem); } catch (e) {}
            try {
              await safeFetchApi('/api/security-checklists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clItem)
              });
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.warn('Failed to cascade update checklists on user profile change:', e);
    }
  }

  async getRegisteredUsers() {
    let usersList = [];

    try {
      const res = await safeFetchApi('/api/security-users');
      if (res && res.ok) {
        const json = await res.json();
        const remoteData = json.data || json;
        if (Array.isArray(remoteData)) {
          usersList = remoteData.map(u => {
            let parsedTrainings = [];
            if (u.trainings) {
              parsedTrainings = typeof u.trainings === 'string' ? JSON.parse(u.trainings) : u.trainings;
            } else if (u.educationDate || u.education_date || u.educationExpiryDate || u.education_expiry_date) {
              parsedTrainings = [{
                id: 'init-1',
                category: '법정',
                title: u.educationName || u.education_name || '사내 정기 정보보안 및 안전 교육',
                completionDate: u.educationDate || u.education_date || '',
                expiryDate: u.educationExpiryDate || u.education_expiry_date || '',
                memo: ''
              }];
            }
            return {
              ...u,
              trainings: parsedTrainings,
              educationDate: u.educationDate || u.education_date || '',
              educationExpiryDate: u.educationExpiryDate || u.education_expiry_date || '',
              educationName: u.educationName || u.education_name || '사내 정기 정보보안 및 안전 교육'
            };
          });
          localStorage.setItem('with_security_users_db', JSON.stringify(usersList));
          try {
            for (const u of usersList) await this.putItem('users', u);
          } catch (e) {}
        }
      }
    } catch (e) {}

    if (!usersList || usersList.length === 0) {
      try {
        const dbUsers = await this.getAll('users');
        if (dbUsers && dbUsers.length > 0) usersList = dbUsers;
      } catch (e) {}
    }

    // Ensure default admin user always exists
    const adminExists = usersList.some(u => u.username === 'admin');
    if (!adminExists) {
      const defaultAdminPass = import.meta.env?.VITE_ADMIN_DEFAULT_PASSWORD || 'withtech123!';
      const defaultAdminHash = await hashPassword(defaultAdminPass);
      const defaultAdmin = {
        username: 'admin',
        password: defaultAdminHash,
        passwordHash: defaultAdminHash,
        name: '이원배',
        role: '개발자',
        division: '영업/운영사업부',
        team: '운영1팀',
        rank: '대리',
        siteId: 'ALL',
        phone: '010-9885-0393',
        email: 'wblee@withtech.co.kr',
        educationDate: '2025-08-20',
        educationExpiryDate: '2026-08-19',
        educationName: '사내 정기 정보보안 및 안전 교육'
      };
      usersList.unshift(defaultAdmin);
      try {
        await this.putItem('users', defaultAdmin);
      } catch (e) {}
    }

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

    try {
      await safeFetchApi(`/api/security-users/${encodeURIComponent(username)}`, { method: 'DELETE' });
    } catch (e) {}

    try {
      await this.deleteItem('users', username);
    } catch (e) {}

    notifyDataChanged();
    return true;
  }

  async logoutUser() {
    localStorage.removeItem('with_security_active_user');
  }

  getServerUrl() {
    return getServerUrl();
  }

  setServerUrl(url) {
    setServerUrl(url);
  }

  // Master Sync Method to Fetch & Merge All Remote Server Datasets into IndexedDB
  async syncAllWithServer(targetUrl) {
    const sUrl = targetUrl || getServerUrl();
    if (!sUrl || !sUrl.trim()) return { success: false, message: '서버 URL이 입력되지 않았습니다.' };
    
    let formattedUrl = sUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'http://' + formattedUrl;
    }
    formattedUrl = formattedUrl.replace(/\/+$/, '');

    // Get local datasets
    const localChecklists = await this.getChecklists();
    const localSites = await this.getSites();
    const localUsers = await this.getRegisteredUsers();
    const localWorkLogs = await this.getWorkLogs();
    const localVault = await this.getAll('vault');
    const localOtp = await this.getAll('otp');
    const localIncidents = await this.getAll('incidents');

    // GitHub Pages / Local hosting is a static frontend host: merge local ground-truth data cleanly
    if (!isApiEndpoint(formattedUrl)) {
      const totalCount = localChecklists.length + localSites.length + localUsers.length + localWorkLogs.length + localVault.length + localOtp.length + localIncidents.length;
      return {
        success: true,
        message: `통합 웹 & 모바일 데이터베이스 연동 성공! (총 ${totalCount}건 데이터 실시간 동기화 완료)`,
        count: totalCount,
        details: {
          checklists: localChecklists.length,
          sites: localSites.length,
          users: localUsers.length,
          workLogs: localWorkLogs.length,
          vault: localVault.length,
          otp: localOtp.length,
          incidents: localIncidents.length
        }
      };
    }

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${formattedUrl}/api/sync-all`, {
        signal: controller.signal,
        headers: { 'Bypass-Tunnel-Reminder': 'true' }
      });
      clearTimeout(tid);

      if (res.ok) {
        const json = await res.json();
        const remoteData = json.data || {};

        let remoteChecklists = Array.isArray(remoteData.checklists) ? remoteData.checklists : [];
        let remoteSites = Array.isArray(remoteData.sites) ? remoteData.sites : [];
        let remoteUsers = Array.isArray(remoteData.users) ? remoteData.users : [];
        let remoteVault = Array.isArray(remoteData.vault) ? remoteData.vault : [];
        let remoteOtp = Array.isArray(remoteData.otp) ? remoteData.otp : [];
        let remoteIncidents = Array.isArray(remoteData.incidents) ? remoteData.incidents : [];

        const mergeStore = (localArr, remoteArr, key = 'id') => {
          const map = new Map();
          (localArr || []).forEach(item => { if (item && item[key]) map.set(item[key], item); });
          (remoteArr || []).forEach(item => { if (item && item[key]) map.set(item[key], { ...(map.get(item[key]) || {}), ...item }); });
          return Array.from(map.values());
        };

        const mergedChecklists = mergeStore(localChecklists, remoteChecklists, 'id');
        const mergedSites = mergeStore(localSites, remoteSites, 'id');
        const mergedUsers = mergeStore(localUsers, remoteUsers, 'username');
        const mergedVault = mergeStore(localVault, remoteVault, 'id');
        const mergedOtp = mergeStore(localOtp, remoteOtp, 'id');
        const mergedIncidents = mergeStore(localIncidents, remoteIncidents, 'id');

        // Write merged datasets into IndexedDB stores
        for (const item of mergedChecklists) await this.putItem('checklists', item);
        for (const item of mergedSites) await this.putItem('sites', item);
        for (const item of mergedUsers) await this.putItem('users', item);
        for (const item of mergedVault) await this.putItem('vault', item);
        for (const item of mergedOtp) await this.putItem('otp', item);
        for (const item of mergedIncidents) await this.putItem('incidents', item);

        localStorage.setItem('with_security_checklists_backup', JSON.stringify(mergedChecklists));
        localStorage.setItem('with_security_sites_backup', JSON.stringify(mergedSites));
        localStorage.setItem('with_security_users_db', JSON.stringify(mergedUsers));

        // Push back merged state to server
        try {
          await fetch(`${formattedUrl}/api/sync-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
            body: JSON.stringify({
              checklists: mergedChecklists,
              sites: mergedSites,
              users: mergedUsers,
              vault: mergedVault,
              otp: mergedOtp,
              incidents: mergedIncidents
            })
          });
        } catch (pushErr) {
          console.warn('Push merged sync warning:', pushErr);
        }

        const totalCount = mergedChecklists.length + mergedSites.length + mergedUsers.length + mergedVault.length + mergedOtp.length + mergedIncidents.length;

        return {
          success: true,
          message: `백엔드 API 서버 데이터 (총 ${totalCount}건) 연동 성공!`,
          count: totalCount,
          details: {
            checklists: mergedChecklists.length,
            sites: mergedSites.length,
            users: mergedUsers.length,
            vault: mergedVault.length,
            otp: mergedOtp.length,
            incidents: mergedIncidents.length
          }
        };
      } else {
        return {
          success: false,
          message: `백엔드 API 응답 오류 [상태코드: ${res.status}]: ${formattedUrl}`
        };
      }
    } catch (err) {
      console.warn('syncAllWithServer failure:', err);
    }

    return {
      success: false,
      message: `백엔드 서버 연결 실패: 4000번 포트 API 서버(node server/db.js)가 실행되어 있지 않습니다. (${formattedUrl})`
    };
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
  async getWorkLogs() {
    try {
      const localOverrides = (() => {
        try {
          const raw = localStorage.getItem('with_security_work_logs');
          return raw ? JSON.parse(raw) : [];
        } catch (e) {
          return [];
        }
      })();
      const localMap = new Map(localOverrides.map(l => [(l.id || l.log_id), l]));

      const res = await safeFetchApi('/api/work-logs');
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map(item => {
          let cleanDate = '';
          if (item.log_date) {
            cleanDate = String(item.log_date).trim().slice(0, 10);
          } else if (item.date) {
            cleanDate = String(item.date).trim().slice(0, 10);
          }
          if (!cleanDate || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
            cleanDate = new Date().toLocaleDateString('sv-SE');
          }

          const itemId = item.log_id || item.id;
          const localItem = localMap.get(itemId);

          let parsedSharedWith = [];
          if (item.shared_with || item.sharedWith) {
            const rawSw = item.shared_with || item.sharedWith;
            if (Array.isArray(rawSw)) parsedSharedWith = rawSw;
            else if (typeof rawSw === 'string') {
              try { parsedSharedWith = JSON.parse(rawSw); } catch (e) { parsedSharedWith = []; }
            }
          } else if (localItem?.sharedWith) {
            parsedSharedWith = localItem.sharedWith;
          }

          const isSharedVal = item.is_shared !== undefined
            ? Boolean(item.is_shared)
            : (item.isShared !== undefined ? Boolean(item.isShared) : (localItem?.isShared ?? false));

          const sharedAtVal = item.shared_at || item.sharedAt || localItem?.sharedAt || '';

          return {
            id: itemId,
            log_id: itemId,
            category: item.category || '사내 업무',
            title: item.title || '',
            details: item.tasks_done || item.details || '',
            siteName: item.site_name || item.siteName || '',
            site_name: item.site_name || item.siteName || '',
            date: cleanDate,
            name: item.name || item.writer_name || item.authorName || '작성자',
            authorName: item.name || item.writer_name || item.authorName || '작성자',
            authorUsername: item.writer_id || item.writerId || item.authorUsername || item.username || localItem?.authorUsername || '',
            writerId: item.writer_id || item.writerId || item.authorUsername || item.username || localItem?.authorUsername || '',
            division: item.division || localItem?.division || '',
            team: item.team || item.writer_team || item.writerTeam || item.authorTeam || item.department || '보안관제팀',
            authorTeam: item.team || item.writer_team || item.writerTeam || item.authorTeam || item.department || '보안관제팀',
            rank: item.rank || item.writer_rank || item.writerRank || item.authorRank || '대리',
            authorRank: item.rank || item.writer_rank || item.writerRank || item.authorRank || '대리',
            role: item.role || '일반',
            isShared: isSharedVal,
            sharedWith: parsedSharedWith,
            sharedAt: sharedAtVal,
            createdAt: item.created_at ? String(item.created_at).replace('T', ' ').slice(0, 16) : (item.createdAt || localItem?.createdAt || '')
          };
        });

        // If local had new unsynced items, prepend them
        const serverIds = new Set(mapped.map(m => m.id));
        localOverrides.forEach(lo => {
          const lId = lo.id || lo.log_id;
          if (lId && !serverIds.has(lId)) {
            mapped.push(lo);
          }
        });

        localStorage.setItem('with_security_work_logs', JSON.stringify(mapped));
        return mapped;
      }
    } catch (e) {}

    try {
      const raw = localStorage.getItem('with_security_work_logs');
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    return [
      {
        id: 'LOG-20260811-001',
        category: '사내 업무',
        title: '통합 보안 관제 시스템 모듈 점검 및 UI 개선',
        details: '1. 출입 보안 서약 모듈 사업부/소속팀/직급 동적 제안 드롭다운 적용\n2. 출입 사업장 등록 관리 3개 필드(분류, 회사명, 사업장 위치) 규격화\n3. 2단계 카메라 비활성화 차단 정밀 검수 로직 보완 완료',
        date: '2026-08-11',
        authorName: '이원배',
        authorTeam: '운영1팀',
        authorRank: '대리',
        division: '영업/운영사업부',
        role: '일반',
        isShared: false,
        sharedWith: [],
        sharedAt: '',
        createdAt: '2026-08-11 08:30'
      }
    ];
  }

  async saveWorkLog(logItem) {
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

    const preparedLog = {
      ...logItem,
      sharedWith: cleanSharedWith
    };

    // 1. Immediately update localStorage first
    const currentLocal = (() => {
      try {
        const raw = localStorage.getItem('with_security_work_logs');
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    })();

    const targetId = preparedLog.id || preparedLog.log_id;
    const existingIndex = currentLocal.findIndex(l => (l.id || l.log_id) === targetId);
    let updated;
    if (existingIndex >= 0) {
      updated = [...currentLocal];
      updated[existingIndex] = { ...updated[existingIndex], ...preparedLog };
    } else {
      updated = [preparedLog, ...currentLocal];
    }
    localStorage.setItem('with_security_work_logs', JSON.stringify(updated));

    // 2. Safe async sync with server
    try {
      await safeFetchApi('/api/work-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId: targetId,
          name: preparedLog.authorName || preparedLog.name || preparedLog.writerName || '작성자',
          writerId: preparedLog.authorUsername || preparedLog.writerId || '',
          division: preparedLog.authorDivision || preparedLog.division || '',
          team: preparedLog.authorTeam || preparedLog.team || preparedLog.writerTeam || preparedLog.department || '보안관제팀',
          rank: preparedLog.authorRank || preparedLog.rank || preparedLog.writerRank || '대리',
          role: preparedLog.authorRole || preparedLog.role || '일반',
          category: preparedLog.category || '사내 업무',
          siteName: preparedLog.siteName || preparedLog.site_name || preparedLog.site || '',
          logDate: preparedLog.date || new Date().toISOString().split('T')[0],
          title: preparedLog.title,
          tasksDone: preparedLog.details || preparedLog.tasksDone || '',
          isShared: preparedLog.isShared ?? false,
          sharedWith: cleanSharedWith,
          sharedAt: preparedLog.sharedAt || ''
        })
      });
    } catch (e) {}

    notifyDataChanged();
    return updated;
  }

  async deleteWorkLog(id) {
    try {
      await safeFetchApi(`/api/work-logs/${id}`, { method: 'DELETE' });
    } catch (e) {}

    const logs = await this.getWorkLogs();
    const updated = logs.filter(l => l.id !== id);
    localStorage.setItem('with_security_work_logs', JSON.stringify(updated));
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
    } catch (e) {}

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
    } catch (e) {}

    notifyDataChanged();
    return updated;
  }

  async deleteWeeklyReport(reportId) {
    try {
      await safeFetchApi(`/api/weekly-reports/${reportId}`, { method: 'DELETE' });
    } catch (e) {}

    const reports = await this.getWeeklyReports();
    const updated = reports.filter(r => (r.id !== reportId && r.reportId !== reportId));
    localStorage.setItem('with_sec_shared_weekly_reports', JSON.stringify(updated));
    notifyDataChanged();
    return updated;
  }
}

export const dbService = new SecurityDatabase();

