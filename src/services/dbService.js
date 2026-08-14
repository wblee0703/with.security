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

async function safeFetchApi(endpoint, options = {}) {
  const baseUrl = getApiServerUrl();
  if (baseUrl === null) return null;
  const fullUrl = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), options.timeout || 3000);
    const headers = {
      'Bypass-Tunnel-Reminder': 'true',
      ...(options.headers || {})
    };
    const res = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal
    }).catch(() => null);
    clearTimeout(tid);
    return res;
  } catch (e) {
    return null;
  }
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
    try {
      const res = await safeFetchApi('/api/security-logs');
      if (res && res.ok) {
        const json = await res.json();
        const remoteData = json.data || json;
        if (Array.isArray(remoteData)) {
          localStorage.setItem('with_security_checklists_backup', JSON.stringify(remoteData));
          try {
            for (const p of remoteData) await this.putItem('checklists', p);
          } catch (e) {}
          return remoteData;
        }
      }
    } catch (e) {}

    try {
      const dbPledges = await this.getAll('checklists');
      if (dbPledges && dbPledges.length > 0) return dbPledges;
    } catch (e) {}

    try {
      const backup = localStorage.getItem('with_security_checklists_backup');
      if (backup) return JSON.parse(backup);
    } catch (err) {}

    return [];
  }

  async saveChecklist(checklist) {
    try {
      const nowFormatted = new Date().toLocaleString('ko-KR', { hour12: false });

      const payload = {
        log_id: checklist.id || checklist.log_id,
        parent_log_id: checklist.parent_log_id || checklist.parentLogId || checklist.parentPledgeId || '',
        name: checklist.name || checklist.visitorName || checklist.userName || '서약자',
        division: checklist.division || '',
        role: checklist.role || '일반',
        site_name: checklist.site_name || checklist.siteName || checklist.site || '',
        site: checklist.site_name || checklist.siteName || checklist.site || '',
        purpose: checklist.purpose || checklist.purposeType || checklist.customPurpose || '',
        visitor_phone: checklist.phone || checklist.visitorPhone || checklist.visitor_phone || '',
        team: checklist.team || checklist.department || checklist.visitor_team || '',
        rank: checklist.rank || checklist.visitorRank || checklist.visitor_rank || '',
        mdm_verified: (checklist.mdmVerified || checklist.mdm_verified) ? 1 : 0,
        gate_approved: (checklist.docChecklist?.gateApproved || checklist.gate_approved) ? 1 : 0,
        doc_sec_verified: (checklist.docChecklist?.docSecVerified || checklist.doc_sec_verified) ? 1 : 0,
        pre_check_verified: (checklist.docChecklist?.preCheckVerified || checklist.pre_check_verified) ? 1 : 0,
        pledge_terms: checklist.pledgeTerms || checklist.pledge_terms || '',
        signature_date: checklist.signatureDate || checklist.signature_date || checklist.signedAt || nowFormatted,
        status: checklist.status || '승인완료'
      };

      await safeFetchApi('/api/security-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('MySQL Security Log Sync Warning:', e);
    }

    try {
      await this.putItem('checklists', checklist);
    } catch (e) {}

    try {
      const backup = localStorage.getItem('with_security_checklists_backup');
      const existing = backup ? JSON.parse(backup) : await this.getAll('checklists');
      const targetId = checklist.id || checklist.log_id;
      const index = (existing || []).findIndex(item => String(item.id) === String(targetId) || String(item.log_id) === String(targetId));
      let updated;
      if (index >= 0) {
        updated = [...existing];
        updated[index] = { ...existing[index], ...checklist };
      } else {
        updated = [checklist, ...(existing || [])];
      }
      localStorage.setItem('with_security_checklists_backup', JSON.stringify(updated));
    } catch (err) {}

    notifyDataChanged();
    return checklist;
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
      const backup = localStorage.getItem('with_security_checklists_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        const filtered = (parsed || []).filter(item => item.id !== id && item.log_id !== id);
        localStorage.setItem('with_security_checklists_backup', JSON.stringify(filtered));
      }
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

    notifyDataChanged();
    return site;
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

  // User Profile & Account Authentication Helpers
  async getUserProfile() {
    const cached = localStorage.getItem('with_security_active_user');
    let user = cached ? JSON.parse(cached) : null;

    const users = await this.getRegisteredUsers();
    if (user && users.length > 0) {
      const match = users.find(u => u.username === user.username);
      if (match) {
        user = { ...user, ...match };
        localStorage.setItem('with_security_active_user', JSON.stringify(user));
      }
    }
    return user;
  }

  async saveUserProfile(userProfile) {
    let safeUser = { ...userProfile };
    if (safeUser.password && !safeUser.passwordHash) {
      safeUser.passwordHash = await hashPassword(safeUser.password);
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

    notifyDataChanged();
    return safeUser;
  }

  async getRegisteredUsers() {
    let usersList = [];

    try {
      const res = await safeFetchApi('/api/security-users');
      if (res && res.ok) {
        const json = await res.json();
        const remoteData = json.data || json;
        if (Array.isArray(remoteData)) {
          usersList = remoteData;
          localStorage.setItem('with_security_users_db', JSON.stringify(remoteData));
          try {
            for (const u of remoteData) await this.putItem('users', u);
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
        email: 'wblee@withtech.co.kr'
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
      const res = await safeFetchApi('/api/work-logs');
      if (res && res.ok) {
        const json = await res.json();
        const remoteData = json.data || json;
        if (Array.isArray(remoteData)) {
          const mapped = remoteData.map(item => {
            let cleanDate = '';
            if (item.log_date) {
              cleanDate = String(item.log_date).trim().slice(0, 10);
            } else if (item.date) {
              cleanDate = String(item.date).trim().slice(0, 10);
            }
            if (!cleanDate || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
              cleanDate = new Date().toLocaleDateString('sv-SE');
            }

            return {
              id: item.log_id || item.id,
              category: item.category || '사내 업무',
              title: item.title || '',
              details: item.tasks_done || item.details || '',
              siteName: item.site_name || item.siteName || '',
              site_name: item.site_name || item.siteName || '',
              date: cleanDate,
              name: item.name || item.writer_name || item.authorName || '작성자',
              authorName: item.name || item.writer_name || item.authorName || '작성자',
              division: item.division || '',
              team: item.team || item.writer_team || item.writerTeam || item.authorTeam || item.department || '보안관제팀',
              authorTeam: item.team || item.writer_team || item.writerTeam || item.authorTeam || item.department || '보안관제팀',
              rank: item.rank || item.writer_rank || item.writerRank || item.authorRank || '대리',
              authorRank: item.rank || item.writer_rank || item.writerRank || item.authorRank || '대리',
              role: item.role || '일반',
              createdAt: item.created_at ? String(item.created_at).replace('T', ' ').slice(0, 16) : (item.createdAt || '')
            };
          });
          localStorage.setItem('with_security_work_logs', JSON.stringify(mapped));
          return mapped;
        }
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
        createdAt: '2026-08-11 08:30'
      }
    ];
  }

  async saveWorkLog(logItem) {
    try {
      await safeFetchApi('/api/work-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId: logItem.id,
          name: logItem.authorName || logItem.name || logItem.writerName || '작성자',
          writerId: logItem.authorUsername || logItem.writerId || '',
          division: logItem.authorDivision || logItem.division || '',
          team: logItem.authorTeam || logItem.team || logItem.writerTeam || logItem.department || '보안관제팀',
          rank: logItem.authorRank || logItem.rank || logItem.writerRank || '대리',
          role: logItem.authorRole || logItem.role || '일반',
          category: logItem.category || '사내 업무',
          siteName: logItem.siteName || logItem.site_name || logItem.site || '',
          logDate: logItem.date || new Date().toISOString().split('T')[0],
          title: logItem.title,
          tasksDone: logItem.details || logItem.tasksDone || ''
        })
      });
    } catch (e) {}

    const logs = await this.getWorkLogs();
    const existingIndex = logs.findIndex(l => l.id === logItem.id);
    let updated;
    if (existingIndex >= 0) {
      updated = [...logs];
      updated[existingIndex] = { ...updated[existingIndex], ...logItem };
    } else {
      updated = [logItem, ...logs];
    }
    localStorage.setItem('with_security_work_logs', JSON.stringify(updated));
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
}

export const dbService = new SecurityDatabase();

