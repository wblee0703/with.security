// W3C IndexedDB Persistent Database Engine for WithSecurity Application
const DB_NAME = 'WithSecurity_DB';
const DB_VERSION = 1;

class SecurityDatabase {
  constructor() {
    this.db = null;
  }

  async initDB() {
    if (this.db) return this.db;

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
    const db = await this.initDB();
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
    const db = await this.initDB();
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
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Specific Domain Helpers ---

  // Checklists
  async getChecklists() {
    return this.getAll('checklists');
  }

  async saveChecklist(checklist) {
    return this.putItem('checklists', checklist);
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
}

export const dbService = new SecurityDatabase();
