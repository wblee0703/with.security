import { dbService } from './dbService';

/**
 * Migration & DB Converter Utility Service
 * Provides structured JSON Dump export and 1-Click MySQL DDL/DML SQL Conversion Script Generator.
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
      const vault = await dbService.getVaultItems();
      const incidents = await dbService.getIncidents();

      const dump = {
        _metadata: {
          app_name: 'WithSecurity',
          exported_at: new Date().toISOString(),
          version: '1.0.0',
          target_compatibility: ['MySQL 8.0+', 'MariaDB 10.5+', 'PostgreSQL 14+']
        },
        users,
        sites,
        checklists,
        vault,
        incidents
      };

      return JSON.stringify(dump, null, 2);
    } catch (err) {
      console.error('Failed to export full database as JSON:', err);
      throw err;
    }
  },

  /**
   * Convert live JSON data directly into executable MySQL .sql DDL/DML file script
   */
  async generateMySQLDumpSQL() {
    try {
      const users = await dbService.getRegisteredUsers();
      const checklists = await dbService.getChecklists();
      const sites = await dbService.getSites();

      let sql = `-- ==========================================================\n`;
      sql += `-- WithSecurity Application - MySQL Database Auto Migration Script\n`;
      sql += `-- Generated At: ${new Date().toISOString()}\n`;
      sql += `-- Target Engine: MySQL 8.0+ / MariaDB\n`;
      sql += `-- ==========================================================\n\n`;

      sql += `CREATE DATABASE IF NOT EXISTS \`with_security_db\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
      sql += `USE \`with_security_db\`;\n\n`;

      // 1. Users Table DDL
      sql += `-- 1. Table Structure for \`users\`\n`;
      sql += `DROP TABLE IF EXISTS \`users\`;\n`;
      sql += `CREATE TABLE \`users\` (\n`;
      sql += `  \`username\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
      sql += `  \`password_hash\` VARCHAR(255) NOT NULL,\n`;
      sql += `  \`role\` VARCHAR(20) NOT NULL DEFAULT '일반',\n`;
      sql += `  \`division\` VARCHAR(100) DEFAULT NULL,\n`;
      sql += `  \`team\` VARCHAR(100) DEFAULT NULL,\n`;
      sql += `  \`rank\` VARCHAR(50) DEFAULT NULL,\n`;
      sql += `  \`name\` VARCHAR(50) NOT NULL,\n`;
      sql += `  \`phone\` VARCHAR(30) DEFAULT NULL,\n`;
      sql += `  \`email\` VARCHAR(100) DEFAULT NULL,\n`;
      sql += `  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP\n`;
      sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

      if (users && users.length > 0) {
        sql += `-- Data for \`users\`\n`;
        users.forEach(u => {
          const pass = (u.passwordHash || u.password || '').replace(/'/g, "\\'");
          const role = (u.role || '일반').replace(/'/g, "\\'");
          const division = (u.division || '').replace(/'/g, "\\'");
          const team = (u.team || '').replace(/'/g, "\\'");
          const rank = (u.rank || '').replace(/'/g, "\\'");
          const name = (u.name || '').replace(/'/g, "\\'");
          const phone = (u.phone || '').replace(/'/g, "\\'");
          const email = (u.email || '').replace(/'/g, "\\'");
          sql += `INSERT INTO \`users\` (\`username\`, \`password_hash\`, \`role\`, \`division\`, \`team\`, \`rank\`, \`name\`, \`phone\`, \`email\`) VALUES ('${u.username}', '${pass}', '${role}', '${division}', '${team}', '${rank}', '${name}', '${phone}', '${email}');\n`;
        });
        sql += `\n`;
      }

      // 2. Sites Table DDL
      sql += `-- 2. Table Structure for \`sites\`\n`;
      sql += `DROP TABLE IF EXISTS \`sites\`;\n`;
      sql += `CREATE TABLE \`sites\` (\n`;
      sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
      sql += `  \`name\` VARCHAR(100) NOT NULL,\n`;
      sql += `  \`category\` VARCHAR(50) DEFAULT NULL,\n`;
      sql += `  \`security_level\` VARCHAR(20) DEFAULT NULL\n`;
      sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

      if (sites && sites.length > 0) {
        sql += `-- Data for \`sites\`\n`;
        sites.forEach(s => {
          sql += `INSERT INTO \`sites\` (\`id\`, \`name\`, \`category\`, \`security_level\`) VALUES ('${s.id}', '${s.name.replace(/'/g, "\\'")}', '${(s.category || '').replace(/'/g, "\\'")}', '${(s.securityLevel || 'Level-3').replace(/'/g, "\\'")}');\n`;
        });
        sql += `\n`;
      }

      // 3. Security Pledges Table DDL
      sql += `-- 3. Table Structure for \`security_pledges\`\n`;
      sql += `DROP TABLE IF EXISTS \`security_pledges\`;\n`;
      sql += `CREATE TABLE \`security_pledges\` (\n`;
      sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
      sql += `  \`site\` VARCHAR(100) NOT NULL,\n`;
      sql += `  \`visitor_name\` VARCHAR(50) NOT NULL,\n`;
      sql += `  \`team\` VARCHAR(100) NOT NULL,\n`;
      sql += `  \`rank\` VARCHAR(50) DEFAULT NULL,\n`;
      sql += `  \`phone\` VARCHAR(30) DEFAULT NULL,\n`;
      sql += `  \`purpose\` VARCHAR(255) DEFAULT NULL,\n`;
      sql += `  \`visit_date\` VARCHAR(100) DEFAULT NULL,\n`;
      sql += `  \`status\` VARCHAR(20) DEFAULT '승인완료',\n`;
      sql += `  \`created_at\` VARCHAR(50) DEFAULT NULL\n`;
      sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

      // 4. Pledge Companions Table DDL
      sql += `-- 4. Table Structure for \`pledge_companions\`\n`;
      sql += `DROP TABLE IF EXISTS \`pledge_companions\`;\n`;
      sql += `CREATE TABLE \`pledge_companions\` (\n`;
      sql += `  \`id\` VARCHAR(50) NOT NULL PRIMARY KEY,\n`;
      sql += `  \`pledge_id\` VARCHAR(50) NOT NULL,\n`;
      sql += `  \`visitor_name\` VARCHAR(50) NOT NULL,\n`;
      sql += `  \`team\` VARCHAR(100) NOT NULL,\n`;
      sql += `  \`rank\` VARCHAR(50) DEFAULT NULL,\n`;
      sql += `  \`phone\` VARCHAR(30) DEFAULT NULL,\n`;
      sql += `  \`created_at\` VARCHAR(50) DEFAULT NULL,\n`;
      sql += `  FOREIGN KEY (\`pledge_id\`) REFERENCES \`security_pledges\`(\`id\`) ON DELETE CASCADE\n`;
      sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

      if (checklists && checklists.length > 0) {
        sql += `-- Data for \`security_pledges\` & \`pledge_companions\`\n`;
        checklists.forEach(c => {
          const site = (c.site || '').replace(/'/g, "\\'");
          const vName = (c.visitorName || '').replace(/'/g, "\\'");
          const team = (c.team || c.department || '').replace(/'/g, "\\'");
          const rank = (c.rank || '').replace(/'/g, "\\'");
          const phone = (c.phone || '').replace(/'/g, "\\'");
          const purpose = (c.purpose || '').replace(/'/g, "\\'");
          const visitDate = (c.visitDate || '').replace(/'/g, "\\'");
          const status = (c.status || '승인완료').replace(/'/g, "\\'");
          const createdAt = (c.createdAt || '').replace(/'/g, "\\'");

          sql += `INSERT INTO \`security_pledges\` (\`id\`, \`site\`, \`visitor_name\`, \`team\`, \`rank\`, \`phone\`, \`purpose\`, \`visit_date\`, \`status\`, \`created_at\`) VALUES ('${c.id}', '${site}', '${vName}', '${team}', '${rank}', '${phone}', '${purpose}', '${visitDate}', '${status}', '${createdAt}');\n`;

          if (c.companions && c.companions.length > 0) {
            c.companions.forEach(comp => {
              const compId = comp.id || `COMP-${Math.random().toString(36).substr(2, 9)}`;
              const compName = (comp.visitorName || '').replace(/'/g, "\\'");
              const compTeam = (comp.team || comp.department || '').replace(/'/g, "\\'");
              const compRank = (comp.rank || '').replace(/'/g, "\\'");
              const compPhone = (comp.phone || '').replace(/'/g, "\\'");
              const compCreatedAt = (comp.createdAt || createdAt).replace(/'/g, "\\'");

              sql += `INSERT INTO \`pledge_companions\` (\`id\`, \`pledge_id\`, \`visitor_name\`, \`team\`, \`rank\`, \`phone\`, \`created_at\`) VALUES ('${compId}', '${c.id}', '${compName}', '${compTeam}', '${compRank}', '${compPhone}', '${compCreatedAt}');\n`;
            });
          }
        });
      }

      return sql;
    } catch (err) {
      console.error('Failed to generate MySQL dump SQL:', err);
      throw err;
    }
  },

  /**
   * Helper to trigger browser file download for exported JSON / SQL files
   */
  downloadFile(content, fileName, mimeType = 'text/plain') {
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
