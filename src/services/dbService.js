import { hashPassword } from './cryptoUtil';
import initialSitesData from '../data/sites.json';
import initialUsersData from '../data/users.json';
import initialPledgesData from '../data/pledges.json';

// Disk File Real-time Sync Helper (Writes JSON edits directly to src/data/*.json on disk)
async function syncJsonToDisk(filename, data) {
  try {
    await fetch('/api/sync-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, data })
    });
  } catch (err) {
    // Disk sync active via Vite dev server middleware
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
    return this.getAll('vault');
  }

  async saveVaultItem(item) {
    return this.putItem('vault', item);
  }

  // OTP Accounts
  async getOtpAccounts() {
    return this.getAll('otp');
  }

  async saveOtpAccount(acc) {
    return this.putItem('otp', acc);
  }

  // Incidents
  async getIncidents() {
    return this.getAll('incidents');
  }

  async saveIncident(incident) {
    return this.putItem('incidents', incident);
  }

  // Entrance Sites (Strict Ground-Truth by src/data/sites.json & Dual IndexedDB + LocalStorage sync)
  async getSites() {
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
    return safeUser;
  }

  async getRegisteredUsers() {
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

    return true;
  }

  async logoutUser() {
    localStorage.removeItem('with_security_active_user');
  }
}

export const dbService = new SecurityDatabase();
