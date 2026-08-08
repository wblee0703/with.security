// W3C IndexedDB Persistent Database Engine for WithSecurity Application
const DB_NAME = 'WithSecurity_DB';
const DB_VERSION = 2;

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
  async getChecklists() {
    try {
      const items = await this.getAll('checklists');
      if (items && items.length > 0) {
        localStorage.setItem('with_security_checklists_backup', JSON.stringify(items));
        return items;
      }
    } catch (e) {
      console.warn('IndexedDB getChecklists error, reading from localStorage:', e);
    }
    const backup = localStorage.getItem('with_security_checklists_backup');
    return backup ? JSON.parse(backup) : [];
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
    } catch (err) {
      console.error('Failed to update localStorage backup for checklist:', err);
    }
    return checklist;
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

  // Entrance Sites (Admin Managed with dual IndexedDB + LocalStorage fallback)
  async getSites() {
    try {
      const sites = await this.getAll('sites');
      if (sites && sites.length > 0) {
        localStorage.setItem('with_security_sites_backup', JSON.stringify(sites));
        return sites;
      }
    } catch (e) {
      console.warn('IndexedDB getSites fallback:', e);
    }
    const backup = localStorage.getItem('with_security_sites_backup');
    if (backup) {
      try { return JSON.parse(backup); } catch (err) {}
    }
    return [];
  }

  async saveSite(site) {
    let success = false;
    try {
      await this.putItem('sites', site);
      success = true;
    } catch (e) {
      console.warn('IndexedDB saveSite fallback:', e);
    }
    const current = await this.getSites();
    const existingIndex = current.findIndex(s => s.id === site.id);
    let updated;
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = site;
    } else {
      updated = [site, ...current];
    }
    localStorage.setItem('with_security_sites_backup', JSON.stringify(updated));
    return site;
  }

  async deleteSite(id) {
    try {
      await this.deleteItem('sites', id);
    } catch (e) {
      console.warn('IndexedDB deleteSite fallback:', e);
    }
    const current = await this.getSites();
    const updated = current.filter(s => s.id !== id);
    localStorage.setItem('with_security_sites_backup', JSON.stringify(updated));
    return id;
  }

  async initDefaultSites() {
    return this.getSites();
  }
}

export const dbService = new SecurityDatabase();
