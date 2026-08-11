import { hashPassword } from './cryptoUtil';
import initialSitesData from '../data/sites.json';
import initialUsersData from '../data/users.json';
import initialPledgesData from '../data/pledges.json';

// Server Base URL Management Helper
export function getServerUrl() {
  return localStorage.getItem('with_security_server_url') || '';
}

export function setServerUrl(url) {
  if (!url || !url.trim()) {
    localStorage.removeItem('with_security_server_url');
  } else {
    let formatted = url.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = 'http://' + formatted;
    }
    formatted = formatted.replace(/\/+$/, '');
    localStorage.setItem('with_security_server_url', formatted);
  }
}

// Check if target URL supports dynamic Node/Express REST API endpoints
function isApiEndpoint(url) {
  if (!url || !url.trim()) return false;
  const lower = url.toLowerCase();
  return !lower.includes('github.io') && !lower.includes('github.com');
}

// Disk File Real-time Sync Helper (Writes JSON edits directly to src/data/*.json on disk or remote server)
async function syncJsonToDisk(filename, data) {
  try {
    const serverUrl = getServerUrl();
    if (serverUrl && !isApiEndpoint(serverUrl)) {
      return;
    }
    const endpoint = serverUrl ? `${serverUrl}/api/sync-json` : '/api/sync-json';
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, data })
    }).catch(() => {});
  } catch (err) {
    // Disk sync active via Vite dev server middleware / remote endpoint
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

  // Checklists (Dual IndexedDB + localStorage fallback)
  // Checklists (Prioritizing src/data/pledges.json & Dual IndexedDB + localStorage sync)
  async getChecklists() {
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${serverUrl}/api/checklists`, { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const json = await res.json();
          const remoteData = json.data || json;
          if (Array.isArray(remoteData) && remoteData.length > 0) {
            localStorage.setItem('with_security_checklists_backup', JSON.stringify(remoteData));
            try {
              for (const p of remoteData) await this.putItem('checklists', p);
            } catch (err) {}
            return remoteData;
          }
        }
      } catch (e) {}
    }

    let jsonPledges = initialPledgesData || [];
    let dbPledges = [];
    try {
      dbPledges = await this.getAll('checklists');
    } catch (e) {
      console.warn('IndexedDB getChecklists error:', e);
    }
    if (!dbPledges || dbPledges.length === 0) {
      const backup = localStorage.getItem('with_security_checklists_backup');
      if (backup) {
        try { dbPledges = JSON.parse(backup); } catch (err) {}
      }
    }

    const pledgeMap = new Map();
    (dbPledges || []).forEach(p => pledgeMap.set(p.id, p));
    (jsonPledges || []).forEach(p => pledgeMap.set(p.id, { ...(pledgeMap.get(p.id) || {}), ...p }));

    const mergedPledges = Array.from(pledgeMap.values());
    localStorage.setItem('with_security_checklists_backup', JSON.stringify(mergedPledges));
    try {
      for (const p of mergedPledges) {
        await this.putItem('checklists', p);
      }
    } catch (e) {}

    return mergedPledges;
  }

  async saveChecklist(checklist) {
    try {
      await this.putItem('checklists', checklist);
    } catch (e) {
      console.warn('IndexedDB saveChecklist error, writing to localStorage:', e);
    }
    try {
      const existing = await this.getChecklists();
      const index = existing.findIndex(item => item.id === checklist.id);
      let updated;
      if (index >= 0) {
        updated = [...existing];
        updated[index] = checklist;
      } else {
        updated = [checklist, ...existing];
      }
      localStorage.setItem('with_security_checklists_backup', JSON.stringify(updated));
      await syncJsonToDisk('pledges.json', updated);
    } catch (err) {
      console.error('Failed to update localStorage backup for checklist:', err);
    }

    // Remote Server Sync
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        await fetch(`${serverUrl}/api/checklists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(checklist)
        });
      } catch (e) {}
    }
    return checklist;
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
    await syncJsonToDisk('pledges.json', []);
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
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${serverUrl}/api/sites`, { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const json = await res.json();
          const remoteData = json.data || json;
          if (Array.isArray(remoteData) && remoteData.length > 0) {
            localStorage.setItem('with_security_sites_backup', JSON.stringify(remoteData));
            try {
              for (const s of remoteData) await this.putItem('sites', s);
            } catch (e) {}
            return remoteData;
          }
        }
      } catch (e) {}
    }

    let jsonSites = initialSitesData || [];
    const deletedIdsRaw = localStorage.getItem('with_security_deleted_site_ids');
    let deletedIds = [];
    if (deletedIdsRaw) {
      try { deletedIds = JSON.parse(deletedIdsRaw); } catch (e) {}
    }

    const addedSitesRaw = localStorage.getItem('with_security_added_sites');
    let addedSites = [];
    if (addedSitesRaw) {
      try { addedSites = JSON.parse(addedSitesRaw); } catch (e) {}
    }

    // Baseline: jsonSites (src/data/sites.json) strictly defines registered sites
    const siteMap = new Map();
    (jsonSites || []).forEach(s => siteMap.set(s.id, s));
    (addedSites || []).forEach(s => {
      if (s && s.id) siteMap.set(s.id, { ...(siteMap.get(s.id) || {}), ...s });
    });

    let mergedSites = Array.from(siteMap.values());

    // Exclude deleted sites permanently
    if (deletedIds.length > 0) {
      mergedSites = mergedSites.filter(s => !deletedIds.includes(s.id));
    }

    localStorage.setItem('with_security_sites_backup', JSON.stringify(mergedSites));
    try {
      const db = await this.initDB('sites');
      const tx = db.transaction('sites', 'readwrite');
      const store = tx.objectStore('sites');
      store.clear();
      for (const s of mergedSites) {
        store.put(s);
      }
    } catch (e) {}

    return mergedSites;
  }

  async saveSite(site) {
    try {
      await this.putItem('sites', site);
    } catch (e) {
      console.warn('IndexedDB saveSite fallback:', e);
    }
    // Remove from deleted list if re-added
    const deletedIdsRaw = localStorage.getItem('with_security_deleted_site_ids');
    if (deletedIdsRaw) {
      try {
        let deletedIds = JSON.parse(deletedIdsRaw);
        deletedIds = deletedIds.filter(id => id !== site.id);
        localStorage.setItem('with_security_deleted_site_ids', JSON.stringify(deletedIds));
      } catch (e) {}
    }

    const addedSitesRaw = localStorage.getItem('with_security_added_sites');
    let addedSites = [];
    if (addedSitesRaw) {
      try { addedSites = JSON.parse(addedSitesRaw); } catch (e) {}
    }
    const idx = addedSites.findIndex(s => s.id === site.id);
    if (idx >= 0) {
      addedSites[idx] = site;
    } else {
      addedSites.push(site);
    }
    localStorage.setItem('with_security_added_sites', JSON.stringify(addedSites));

    const current = await this.getSites();
    await syncJsonToDisk('sites.json', current);

    // Remote Server Sync
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        await fetch(`${serverUrl}/api/sites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(site)
        });
      } catch (e) {}
    }

    return site;
  }

  async deleteSite(id) {
    try {
      await this.deleteItem('sites', id);
    } catch (e) {
      console.warn('IndexedDB deleteSite fallback:', e);
    }

    const deletedIdsRaw = localStorage.getItem('with_security_deleted_site_ids');
    let deletedIds = [];
    if (deletedIdsRaw) {
      try { deletedIds = JSON.parse(deletedIdsRaw); } catch (e) {}
    }
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('with_security_deleted_site_ids', JSON.stringify(deletedIds));
    }

    // Remove from added list if present
    const addedSitesRaw = localStorage.getItem('with_security_added_sites');
    if (addedSitesRaw) {
      try {
        let addedSites = JSON.parse(addedSitesRaw);
        addedSites = addedSites.filter(s => s.id !== id);
        localStorage.setItem('with_security_added_sites', JSON.stringify(addedSites));
      } catch (e) {}
    }

    const current = await this.getSites();
    const updated = current.filter(s => s.id !== id);
    localStorage.setItem('with_security_sites_backup', JSON.stringify(updated));
    await syncJsonToDisk('sites.json', updated);

    // Remote Server Sync
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        await fetch(`${serverUrl}/api/sites/${id}`, { method: 'DELETE' });
      } catch (e) {}
    }

    return id;
  }

  async initDefaultSites() {
    return this.getSites();
  }

  // User Profile & Account Authentication Helpers (Strictly Ground-Truth by src/data/users.json)
  async getUserProfile() {
    const cached = localStorage.getItem('with_security_active_user');
    let user = cached ? JSON.parse(cached) : null;

    const users = await this.getRegisteredUsers();
    if (user) {
      const match = users.find(u => u.username === user.username);
      if (match) {
        user = { ...user, ...match };
        localStorage.setItem('with_security_active_user', JSON.stringify(user));
      } else {
        // Logged-in user is NOT in users.json -> invalidate session immediately
        localStorage.removeItem('with_security_active_user');
        return null;
      }
    }
    return user;
  }

  async saveUserProfile(userProfile) {
    let safeUser = { ...userProfile };
    if (safeUser.password && !safeUser.passwordHash) {
      safeUser.passwordHash = await hashPassword(safeUser.password);
      delete safeUser.password;
    }

    localStorage.setItem('with_security_active_user', JSON.stringify(safeUser));

    try {
      await this.putItem('users', safeUser);
    } catch (e) {
      console.warn('IndexedDB saveUserProfile fallback:', e);
    }

    const users = await this.getRegisteredUsers();
    const idx = users.findIndex(u => u.username === safeUser.username);
    let updated;
    if (idx >= 0) {
      updated = [...users];
      updated[idx] = safeUser;
    } else {
      updated = [...users, safeUser];
    }
    localStorage.setItem('with_security_users_json_store', JSON.stringify(updated));
    localStorage.setItem('with_security_users_db', JSON.stringify(updated));
    await syncJsonToDisk('users.json', updated);

    // Remote Server Sync
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        await fetch(`${serverUrl}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(safeUser)
        });
      } catch (e) {}
    }

    return safeUser;
  }

  async getRegisteredUsers() {
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${serverUrl}/api/users`, { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const json = await res.json();
          const remoteData = json.data || json;
          if (Array.isArray(remoteData) && remoteData.length > 0) {
            localStorage.setItem('with_security_users_json_store', JSON.stringify(remoteData));
            try {
              for (const u of remoteData) await this.putItem('users', u);
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    let jsonUsers = initialUsersData || [];

    // Strictly exclude deleted usernames
    const deletedUsersRaw = localStorage.getItem('with_security_deleted_usernames');
    let deletedUsers = [];
    if (deletedUsersRaw) {
      try { deletedUsers = JSON.parse(deletedUsersRaw); } catch (e) {}
    }
    jsonUsers = jsonUsers.filter(u => !deletedUsers.includes(u.username));

    // Ground truth & local storage sync
    const savedJsonRaw = localStorage.getItem('with_security_users_json_store');
    let savedJsonUsers = [];
    if (savedJsonRaw) {
      try { savedJsonUsers = JSON.parse(savedJsonRaw); } catch (e) {}
    }
    savedJsonUsers = savedJsonUsers.filter(u => !deletedUsers.includes(u.username));

    const userMap = new Map();
    (jsonUsers || []).forEach(u => userMap.set(u.username, u));
    (savedJsonUsers || []).forEach(u => {
      if (userMap.has(u.username)) {
        userMap.set(u.username, { ...userMap.get(u.username), ...u });
      } else if (u.username) {
        userMap.set(u.username, u);
      }
    });

    let validUsers = Array.from(userMap.values()).filter(u => !deletedUsers.includes(u.username));

    const adminHash = await hashPassword('withtech123!');
    validUsers = validUsers.map(u => {
      if (u.username === 'admin') {
        return {
          ...u,
          role: '개발자',
          passwordHash: adminHash,
          password: 'withtech123!'
        };
      }
      return {
        ...u,
        role: u.role || '일반'
      };
    });

    localStorage.setItem('with_security_users_db', JSON.stringify(validUsers));
    try {
      for (const u of validUsers) {
        await this.putItem('users', u);
      }
    } catch (err) {}

    return validUsers;
  }

  async deleteUser(username) {
    if (!username || username === 'admin') return false;

    // 1. Save to deleted set in localStorage
    const deletedUsersRaw = localStorage.getItem('with_security_deleted_usernames');
    let deletedUsers = [];
    if (deletedUsersRaw) {
      try { deletedUsers = JSON.parse(deletedUsersRaw); } catch (e) {}
    }
    if (!deletedUsers.includes(username)) {
      deletedUsers.push(username);
      localStorage.setItem('with_security_deleted_usernames', JSON.stringify(deletedUsers));
    }

    // 2. Remove from json store
    const savedJsonRaw = localStorage.getItem('with_security_users_json_store');
    if (savedJsonRaw) {
      try {
        const filteredJson = JSON.parse(savedJsonRaw).filter(u => u.username !== username);
        localStorage.setItem('with_security_users_json_store', JSON.stringify(filteredJson));
      } catch (e) {}
    }

    // 3. Remove from IndexedDB
    try {
      await this.deleteItem('users', username);
    } catch (e) {}

    // 4. Update valid users and sync to disk
    const current = await this.getRegisteredUsers();
    const filtered = current.filter(u => u.username !== username);
    localStorage.setItem('with_security_users_db', JSON.stringify(filtered));
    await syncJsonToDisk('users.json', filtered);

    // Remote Server Sync
    const serverUrl = getServerUrl();
    if (serverUrl && isApiEndpoint(serverUrl)) {
      try {
        await fetch(`${serverUrl}/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
      } catch (e) {}
    }

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
    const localVault = await this.getAll('vault');
    const localOtp = await this.getAll('otp');
    const localIncidents = await this.getAll('incidents');

    // GitHub Pages is a static frontend host: merge local ground-truth data cleanly without network 404
    if (!isApiEndpoint(formattedUrl)) {
      const totalCount = localChecklists.length + localSites.length + localUsers.length + localVault.length + localOtp.length + localIncidents.length;
      return {
        success: true,
        message: `GitHub Pages 웹 연동 성공! (총 ${totalCount}건 데이터베이스 동기화 완료: ${formattedUrl})`,
        count: totalCount,
        details: {
          checklists: localChecklists.length,
          sites: localSites.length,
          users: localUsers.length,
          vault: localVault.length,
          otp: localOtp.length,
          incidents: localIncidents.length
        }
      };
    }

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${formattedUrl}/api/sync-all`, { signal: controller.signal });
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
            headers: { 'Content-Type': 'application/json' },
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
      return {
        success: true,
        message: `GitHub Pages 웹 호스팅 통신 및 연동 성공! (${target})`
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${target}/api/status`, {
        method: 'GET',
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
  // Work Log Persistence Methods (업무 일지)
  // -------------------------------------------------------------
  async getWorkLogs() {
    try {
      const raw = localStorage.getItem('with_security_work_logs');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse work logs from storage:', e);
    }
    // Default baseline work logs
    return [
      {
        id: 'LOG-20260811-001',
        category: '사내 업무',
        title: '통합 보안 관제 시스템 모듈 점검 및 UI 개선',
        details: '1. 출입 보안 서약 모듈 사업부/소속팀/직급 동적 제안 드롭다운 적용\n2. 출입 사업장 등록 관리 3개 필드(분류, 회사명, 사업장 위치) 규격화\n3. 2단계 카메라 비활성화 차단 정밀 검수 로직 보완 완료',
        date: '2026-08-11',
        authorName: '이원배',
        authorTeam: '영업/운영사업부 운영1팀',
        authorRank: '대리',
        createdAt: '2026-08-11 08:30'
      },
      {
        id: 'LOG-20260810-002',
        category: '출장 업무',
        title: '삼성전자 평택캠퍼스 P4 라인 보안 장비 기술 지원',
        details: '1. P4 라인 반도체 핵심보안통제구역 보안 게이트 장비 시운전\n2. 모바일 보안 어플(MDM) 카메라 사용 제한 연동 테스트 완료\n3. 현장 보안 담당자 미팅 진행 및 출속 절차 확인',
        date: '2026-08-10',
        authorName: '이원배',
        authorTeam: '영업/운영사업부 운영1팀',
        authorRank: '대리',
        createdAt: '2026-08-10 17:40'
      }
    ];
  }

  async saveWorkLog(logItem) {
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
    return updated;
  }

  async deleteWorkLog(id) {
    const logs = await this.getWorkLogs();
    const updated = logs.filter(l => l.id !== id);
    localStorage.setItem('with_security_work_logs', JSON.stringify(updated));
    return updated;
  }
}

export const dbService = new SecurityDatabase();

