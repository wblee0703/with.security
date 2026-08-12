import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const envFile = fs.existsSync(path.join(rootDir, '.env')) 
  ? path.join(rootDir, '.env') 
  : (fs.existsSync(path.join(rootDir, '.env.example')) ? path.join(rootDir, '.env.example') : null);

if (envFile) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config();
}

async function initDatabase() {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
  const port = (process.env.DB_PORT || process.env.MYSQL_PORT) ? Number(process.env.DB_PORT || process.env.MYSQL_PORT) : 3306;
  const user = process.env.DB_USER || process.env.MYSQL_USER || 'root';
  const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD : '');
  const dbName = process.env.DB_NAME || process.env.MYSQL_DB || 'dbwithtech002';

  console.log(`🔌 Connecting to MySQL Server at ${host}:${port} as ${user}...`);

  try {
    // 1. Connect without database to ensure DB existence
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });

    console.log('✅ Connected to MySQL server!');

    // 2. Create Database
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Database '${dbName}' created or confirmed.`);

    await connection.query(`USE \`${dbName}\`;`);

    // 3. Execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(sql);
      console.log('✅ Applied schema.sql tables successfully!');
    }

    // 4. Ensure security_user has division, team, rank, email columns
    try {
      await connection.query(`
        ALTER TABLE security_user
        ADD COLUMN IF NOT EXISTS division VARCHAR(100) DEFAULT '' COMMENT '사업부',
        ADD COLUMN IF NOT EXISTS team VARCHAR(100) DEFAULT '' COMMENT '소속팀',
        ADD COLUMN IF NOT EXISTS \`rank\` VARCHAR(50) DEFAULT '' COMMENT '직급',
        ADD COLUMN IF NOT EXISTS email VARCHAR(100) DEFAULT '' COMMENT '이메일 주소';
      `);
    } catch (e) {
      try { await connection.query(`ALTER TABLE security_user ADD COLUMN division VARCHAR(100) DEFAULT '' COMMENT '사업부'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_user ADD COLUMN team VARCHAR(100) DEFAULT '' COMMENT '소속팀'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_user ADD COLUMN \`rank\` VARCHAR(50) DEFAULT '' COMMENT '직급'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_user ADD COLUMN email VARCHAR(100) DEFAULT '' COMMENT '이메일 주소'`); } catch (err) {}
    }

    // 5. Ensure security_log active columns and drop legacy deleted columns
    try {
      // Column renames
      try { await connection.query("ALTER TABLE security_log CHANGE COLUMN `user_name` `name` VARCHAR(100) NOT NULL COMMENT '서약자 성명'"); } catch (err) {}
      try { await connection.query("ALTER TABLE security_log CHANGE COLUMN `visitor_team` `team` VARCHAR(100) DEFAULT '' COMMENT '방문자 소속팀'"); } catch (err) {}
      try { await connection.query("ALTER TABLE security_log CHANGE COLUMN `visitor_rank` `rank` VARCHAR(50) DEFAULT '' COMMENT '방문자 직급'"); } catch (err) {}
      // site -> site_name 컬럼명 변경
      try { await connection.query("ALTER TABLE security_log CHANGE COLUMN `site` `site_name` VARCHAR(255) DEFAULT 'SEC 평택사업장' COMMENT '출입 현장명'"); } catch (err) {}

      await connection.query(`
        ALTER TABLE security_log
        ADD COLUMN IF NOT EXISTS \`name\` VARCHAR(100) NOT NULL DEFAULT '서약자' COMMENT '서약자 성명',
        ADD COLUMN IF NOT EXISTS division VARCHAR(100) DEFAULT '' COMMENT '서약자 사업부',
        ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT '' COMMENT '서약자 권한/역할',
        ADD COLUMN IF NOT EXISTS site_name VARCHAR(255) DEFAULT 'SEC 평택사업장' COMMENT '출입 현장명',
        ADD COLUMN IF NOT EXISTS purpose VARCHAR(255) DEFAULT '' COMMENT '방문/출입 목적',
        ADD COLUMN IF NOT EXISTS visitor_phone VARCHAR(50) DEFAULT '' COMMENT '방문자 연락처',
        ADD COLUMN IF NOT EXISTS \`team\` VARCHAR(100) DEFAULT '' COMMENT '방문자 소속팀',
        ADD COLUMN IF NOT EXISTS \`rank\` VARCHAR(50) DEFAULT '' COMMENT '방문자 직급',
        ADD COLUMN IF NOT EXISTS mdm_verified TINYINT(1) DEFAULT 0 COMMENT '보안앱 검수여부',
        ADD COLUMN IF NOT EXISTS gate_approved TINYINT(1) DEFAULT 0 COMMENT '게이트 승인여부',
        ADD COLUMN IF NOT EXISTS doc_sec_verified TINYINT(1) DEFAULT 0 COMMENT '서류보안 확인여부',
        ADD COLUMN IF NOT EXISTS pre_check_verified TINYINT(1) DEFAULT 0 COMMENT '사전점검 완료여부',
        ADD COLUMN IF NOT EXISTS pledge_terms TEXT COMMENT '보안서약 준수 약관 전문',
        ADD COLUMN IF NOT EXISTS \`signature_date\` VARCHAR(100) DEFAULT '' COMMENT '서명 완료 날짜시간',
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT '승인완료' COMMENT '서약 처리 상태';
      `);
    } catch (e) {
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN \`name\` VARCHAR(100) DEFAULT '서약자' COMMENT '서약자 성명'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN division VARCHAR(100) DEFAULT '' COMMENT '서약자 사업부'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN role VARCHAR(50) DEFAULT '' COMMENT '서약자 권한/역할'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN site_name VARCHAR(255) DEFAULT 'SEC 평택사업장' COMMENT '출입 현장명'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN purpose VARCHAR(255) DEFAULT '' COMMENT '방문/출입 목적'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN visitor_phone VARCHAR(50) DEFAULT '' COMMENT '방문자 연락처'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN \`team\` VARCHAR(100) DEFAULT '' COMMENT '방문자 소속팀'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN \`rank\` VARCHAR(50) DEFAULT '' COMMENT '방문자 직급'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN mdm_verified TINYINT(1) DEFAULT 0 COMMENT '보안앱 검수여부'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN gate_approved TINYINT(1) DEFAULT 0 COMMENT '게이트 승인여부'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN doc_sec_verified TINYINT(1) DEFAULT 0 COMMENT '서류보안 확인여부'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN pre_check_verified TINYINT(1) DEFAULT 0 COMMENT '사전점검 완료여부'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN pledge_terms TEXT COMMENT '보안서약 준수 약관 전문'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN \`signature_date\` VARCHAR(100) DEFAULT '' COMMENT '서명 완료 날짜시간'`); } catch (err) {}
      try { await connection.query(`ALTER TABLE security_log ADD COLUMN status VARCHAR(50) DEFAULT '승인완료' COMMENT '서약 처리 상태'`); } catch (err) {}
    }

    await connection.end();
    console.log('🎉 Database initialization complete!');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('💡 MySQL 서비스가 켜져 있는지 확인해주세요.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 DB_USER 또는 DB_PASSWORD가 올바른지 확인해주세요.');
    }
  }
}

initDatabase();
