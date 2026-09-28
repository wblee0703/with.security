import { dbService } from './dbService';

/**
 * Migration & DB Converter Utility Service
 * Provides structured JSON Dump export/import (Serverless/File-based DB mode)
 */
export const dbMigrationService = {
  /**
   * Export all live DB collections into a single normalized JSON object
   */
  async exportFullDatabaseAsJSON() {
    try {
      const users = await dbService.getRegisteredUsers();
      const checklists = await dbService.getChecklists();
      const sites = await dbService.getSites();
      const workLogs = await dbService.getWorkLogs();
      const weeklyReports = await dbService.getAll('weekly_reports').catch(() => []);
      const eduLogs = await dbService.getAll('edu_logs').catch(() => []);
      const tbms = await dbService.getTbms().catch(() => []);
      const vault = await dbService.getAll('vault').catch(() => []);
      const otp = await dbService.getAll('otp').catch(() => []);
      const incidents = await dbService.getAll('incidents').catch(() => []);

      const dump = {
        _metadata: {
          app_name: 'WithSecurity',
          exported_at: new Date().toISOString(),
          version: '1.0.0',
          mode: 'file_json_database',
          target_compatibility: ['Static Hosting (GitHub Pages)', 'Capacitor Android APK', 'Node.js Local Server']
        },
        users: users || [],
        sites: sites || [],
        checklists: checklists || [],
        security_logs: checklists || [],
        work_logs: workLogs || [],
        weekly_reports: weeklyReports || [],
        edu_logs: eduLogs || [],
        tbms: tbms || [],
        vault: vault || [],
        otp: otp || [],
        incidents: incidents || []
      };

      return JSON.stringify(dump, null, 2);
    } catch (err) {
      console.error('Failed to export full database as JSON:', err);
      throw err;
    }
  },

  /**
   * 1-Click Download Current Database as JSON File
   */
  async downloadFullDatabaseJSON() {
    const jsonStr = await this.exportFullDatabaseAsJSON();
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '');
    const fileName = `with_security_database_${dateStr}_${timeStr}.json`;
    this.downloadFile(jsonStr, fileName, 'application/json');
    return fileName;
  },

  /**
   * Import database collections from a JSON string or parsed object and merge into local IndexedDB
   */
  async importFullDatabaseFromJSON(jsonInput) {
    try {
      let data = jsonInput;
      if (typeof jsonInput === 'string') {
        data = JSON.parse(jsonInput);
      }
      if (!data || typeof data !== 'object') {
        throw new Error('올바르지 않은 JSON 데이터 형식입니다.');
      }

      const users = Array.isArray(data.users) ? data.users : [];
      const sites = Array.isArray(data.sites) ? data.sites : [];
      const checklists = Array.isArray(data.checklists) ? data.checklists : (Array.isArray(data.security_logs) ? data.security_logs : []);
      const workLogs = Array.isArray(data.work_logs) ? data.work_logs : [];
      const weeklyReports = Array.isArray(data.weekly_reports) ? data.weekly_reports : [];
      const eduLogs = Array.isArray(data.edu_logs) ? data.edu_logs : [];
      const tbms = Array.isArray(data.tbms) ? data.tbms : [];
      const vault = Array.isArray(data.vault) ? data.vault : [];
      const otp = Array.isArray(data.otp) ? data.otp : [];
      const incidents = Array.isArray(data.incidents) ? data.incidents : [];

      // Merge and save into IndexedDB
      for (const u of users) await dbService.putItem('users', u);
      for (const s of sites) await dbService.putItem('sites', s);
      for (const c of checklists) await dbService.putItem('checklists', c);
      for (const w of workLogs) await dbService.putItem('work_logs', w);
      for (const wr of weeklyReports) await dbService.putItem('weekly_reports', wr);
      for (const e of eduLogs) await dbService.putItem('edu_logs', e);
      for (const t of tbms) await dbService.putItem('tbms', t);
      for (const v of vault) await dbService.putItem('vault', v);
      for (const o of otp) await dbService.putItem('otp', o);
      for (const i of incidents) await dbService.putItem('incidents', i);

      // Update LocalStorage backups
      if (users.length > 0) localStorage.setItem('with_security_users_db', JSON.stringify(users));
      if (sites.length > 0) localStorage.setItem('with_security_sites_backup', JSON.stringify(sites));
      if (checklists.length > 0) localStorage.setItem('with_security_checklists_backup', JSON.stringify(checklists));
      if (workLogs.length > 0) localStorage.setItem('with_security_work_logs', JSON.stringify(workLogs));
      if (tbms.length > 0) localStorage.setItem('with_security_tbms_backup', JSON.stringify(tbms));

      // Trigger UI updates
      dbService.notifyDataChanged();

      const totalCount = users.length + sites.length + checklists.length + workLogs.length + eduLogs.length + tbms.length;

      return {
        success: true,
        message: `JSON 데이터베이스 불러오기 성공! (총 ${totalCount}건 반영됨)`,
        totalCount,
        details: {
          users: users.length,
          sites: sites.length,
          checklists: checklists.length,
          workLogs: workLogs.length,
          eduLogs: eduLogs.length,
          tbms: tbms.length
        }
      };
    } catch (err) {
      console.error('Failed to import database from JSON:', err);
      return {
        success: false,
        message: `JSON 불러오기 오류: ${err.message}`
      };
    }
  },

  /**
   * Load static public/database.json as initial baseline
   */
  async loadBaselineJSON() {
    try {
      // Check multiple relative paths for both Vite dev and GitHub Pages
      const paths = ['./database.json', 'database.json', '/with.security/database.json'];
      let res = null;
      for (const p of paths) {
        try {
          const r = await fetch(p);
          if (r && r.ok) {
            res = r;
            break;
          }
        } catch (e) {}
      }
      if (!res) throw new Error('database.json 파일을 찾을 수 없습니다.');
      const data = await res.json();
      return await this.importFullDatabaseFromJSON(data);
    } catch (err) {
      return {
        success: false,
        message: `기본 데이터 로드 실패: ${err.message}`
      };
    }
  },

  /**
   * Helper to trigger browser file download for exported JSON files
   */
  downloadFile(content, fileName, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

export default dbMigrationService;
