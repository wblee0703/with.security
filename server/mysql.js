import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// .env가 존재하면 로드하고, 없으면 .env.example을 자동 로드
const envFile = fs.existsSync(path.join(rootDir, '.env')) 
  ? path.join(rootDir, '.env') 
  : (fs.existsSync(path.join(rootDir, '.env.example')) ? path.join(rootDir, '.env.example') : null);

if (envFile) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config();
}

// 5. 가비아 MySQL 최적화 커넥션 풀(Connection Pool) 생성
const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
  port: (process.env.DB_PORT || process.env.MYSQL_PORT) ? Number(process.env.DB_PORT || process.env.MYSQL_PORT) : 3306,
  user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD : ''),
  database: process.env.DB_NAME || process.env.MYSQL_DB || 'dbwithtech002',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10), // 가비아 호스팅 동시 커넥션 한도 최적화
  queueLimit: 0,
  enableKeepAlive: true, // 유휴(Idle) 시 연결 유실 방지 Keep-Alive 활성화
  keepAliveInitialDelay: 10000,
  dateStrings: true, // DATE, DATETIME 시차 변환 없는 원본 문자열 유지
  charset: 'utf8mb4'
});

// DB 연결 테스트 및 자동 DB 생성/마이그레이션 함수
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL 데이터베이스 연결 성공! (가비아 커넥션 풀 활성화)');
    
    // work_log 컬럼 자동 마이그레이션 (is_shared, shared_with, shared_at)
    try {
      const [cols] = await connection.query("SHOW COLUMNS FROM work_log");
      const colNames = (cols || []).map(c => c.Field);
      if (!colNames.includes('is_shared')) {
        await connection.query("ALTER TABLE work_log ADD COLUMN is_shared TINYINT(1) DEFAULT 0 COMMENT '업무 공유 여부'");
        console.log('✅ [DB Migration] work_log.is_shared 컬럼이 자동 추가되었습니다.');
      }
      if (!colNames.includes('shared_with')) {
        await connection.query("ALTER TABLE work_log ADD COLUMN shared_with TEXT COMMENT '공유 대상 JSON'");
        console.log('✅ [DB Migration] work_log.shared_with 컬럼이 자동 추가되었습니다.');
      }
      if (!colNames.includes('shared_at')) {
        await connection.query("ALTER TABLE work_log ADD COLUMN shared_at VARCHAR(100) DEFAULT '' COMMENT '공유 시각'");
        console.log('✅ [DB Migration] work_log.shared_at 컬럼이 자동 추가되었습니다.');
      }
    } catch (migErr) {
      // 테이블이 아직 없는 경우 무시
    }

    // security_user 컬럼 자동 마이그레이션 (education_date, education_expiry_date, education_name)
    try {
      const [userCols] = await connection.query("SHOW COLUMNS FROM security_user");
      const userColNames = (userCols || []).map(c => c.Field);
      if (!userColNames.includes('education_date')) {
        await connection.query("ALTER TABLE security_user ADD COLUMN education_date VARCHAR(50) DEFAULT '' COMMENT '보안교육 수료일'");
        console.log('✅ [DB Migration] security_user.education_date 컬럼이 자동 추가되었습니다.');
      }
      if (!userColNames.includes('education_expiry_date')) {
        await connection.query("ALTER TABLE security_user ADD COLUMN education_expiry_date VARCHAR(50) DEFAULT '' COMMENT '보안교육 만료일'");
        console.log('✅ [DB Migration] security_user.education_expiry_date 컬럼이 자동 추가되었습니다.');
      }
      if (!userColNames.includes('education_name')) {
        await connection.query("ALTER TABLE security_user ADD COLUMN education_name VARCHAR(150) DEFAULT '' COMMENT '보안교육 과정명'");
        console.log('✅ [DB Migration] security_user.education_name 컬럼이 자동 추가되었습니다.');
      }
      if (!userColNames.includes('trainings')) {
        await connection.query("ALTER TABLE security_user ADD COLUMN trainings TEXT COMMENT '다건 교육 이수 목록 JSON'");
        console.log('✅ [DB Migration] security_user.trainings 컬럼이 자동 추가되었습니다.');
      }
    } catch (migUserErr) {
      // 테이블이 아직 없는 경우 무시
    }

    // edu_log 테이블 자동 생성
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS edu_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          edu_id VARCHAR(100) UNIQUE COMMENT '고유 교육 로그 ID (EDU-타임스탬프-난수)',
          user_id VARCHAR(100) DEFAULT '' COMMENT '사용자 아이디 (username)',
          name VARCHAR(100) NOT NULL COMMENT '이수자 성명',
          division VARCHAR(100) DEFAULT '' COMMENT '이수자 사업부',
          team VARCHAR(100) DEFAULT '' COMMENT '이수자 소속팀',
          \`rank\` VARCHAR(50) DEFAULT '' COMMENT '이수자 직급',
          category VARCHAR(100) DEFAULT '법정' COMMENT '교육 구분 (SKHynix, Samsung, LGD, 법정, 기타 등)',
          title VARCHAR(200) NOT NULL COMMENT '교육 과정명',
          completion_date DATE NOT NULL COMMENT '교육 수료일 (이수일)',
          expiry_date DATE NOT NULL COMMENT '교육 만료일',
          memo VARCHAR(255) DEFAULT '' COMMENT '비고 / 수료증 번호 / 메모',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch (createEduErr) {
      console.warn('edu_log create table warning:', createEduErr.message);
    }

    // 1. edu_log 테이블 중복 제거 및 edu_id 표준화 (EDU-timestamp-rand)
    try {
      // 레거시 더미 데이터 일괄 정리
      await connection.query("DELETE FROM edu_log WHERE title = '사내 정기 정보보안 및 안전 교육' OR edu_id LIKE 'EDU-INIT-%' OR edu_id LIKE 'EDU-LEGACY-%'").catch(() => {});
      await connection.query("UPDATE security_user SET education_name = '', education_date = '', education_expiry_date = '' WHERE education_name = '사내 정기 정보보안 및 안전 교육'").catch(() => {});

      const [allEduRows] = await connection.query("SELECT * FROM edu_log ORDER BY id ASC");
      if (Array.isArray(allEduRows) && allEduRows.length > 0) {
        const seen = new Map();
        const deleteIds = [];
        const updateList = [];

        for (const row of allEduRows) {
          const uId = String(row.user_id || row.name || '').trim().toLowerCase();
          const tit = String(row.title || '').trim().toLowerCase();
          const comp = String(row.completion_date ? (typeof row.completion_date === 'string' ? row.completion_date.split('T')[0] : row.completion_date.toISOString().split('T')[0]) : '').trim();
          const businessKey = `${uId}__${tit}__${comp}`;

          if (seen.has(businessKey)) {
            deleteIds.push(row.id);
          } else {
            seen.set(businessKey, row);
            const currentEduId = String(row.edu_id || '').trim();
            if (!/^EDU-\d{10,15}-\d{3}$/.test(currentEduId)) {
              const digits = currentEduId.replace(/[^0-9]/g, '');
              let ts = digits.length >= 10 ? digits.slice(0, 13) : String(Date.now());
              if (ts.length < 13) ts = String(Date.now());
              const rand = Math.floor(100 + Math.random() * 900);
              const newEduId = `EDU-${ts}-${rand}`;
              updateList.push({ id: row.id, newEduId });
            }
          }
        }

        if (deleteIds.length > 0) {
          await connection.query(`DELETE FROM edu_log WHERE id IN (${deleteIds.map(() => '?').join(',')})`, deleteIds);
          console.log(`🧹 [MySQL] edu_log 중복 교육 데이터 ${deleteIds.length}건 자동 정리(삭제) 완료!`);
        }

        for (const u of updateList) {
          await connection.query("UPDATE edu_log SET edu_id = ? WHERE id = ?", [u.newEduId, u.id]).catch(() => {});
        }
        if (updateList.length > 0) {
          console.log(`✨ [MySQL] edu_log ID 형식 통일 완료 (총 ${updateList.length}건 EDU-timestamp-rand 적용)`);
        }
      }
    } catch (cleanErr) {
      console.warn('edu_log cleanup error:', cleanErr.message);
    }

    // 2. weekly_report 테이블 자동 생성
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS weekly_report (
          id INT AUTO_INCREMENT PRIMARY KEY,
          report_id VARCHAR(120) UNIQUE COMMENT '고유 주간보고 ID (weekly-rep-username-YYYY-MM-DD)',
          weekly_monday DATE NOT NULL COMMENT '해당 주차 월요일 날짜',
          week_text VARCHAR(100) DEFAULT '' COMMENT '주차 표기 (예: 2026년 8월 3주차)',
          author_name VARCHAR(100) NOT NULL COMMENT '작성자 성명',
          author_username VARCHAR(100) DEFAULT '' COMMENT '작성자 아이디',
          author_team VARCHAR(100) DEFAULT '' COMMENT '작성자 소속팀',
          author_rank VARCHAR(50) DEFAULT '' COMMENT '작성자 직급',
          author_division VARCHAR(100) DEFAULT '' COMMENT '작성자 사업부',
          author_role VARCHAR(50) DEFAULT '' COMMENT '작성자 권한/역할',
          main_tasks TEXT COMMENT '1. 주요 내용',
          info_sharing TEXT COMMENT '2. 정보 공유',
          work_support TEXT COMMENT '3. 업무 지원',
          etc_tasks TEXT COMMENT '4. 기타 업무',
          shared_with TEXT COMMENT '공유 대상 목록 JSON',
          shared_at VARCHAR(100) DEFAULT '' COMMENT '공유 시각',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } catch (migWeeklyErr) {
      // ignore
    }

    connection.release(); // 커넥션 반환
    return true;
  } catch (error) {
    if (error.code === 'ER_BAD_DB_ERROR') {
      const dbName = process.env.DB_NAME || process.env.MYSQL_DB || 'dbwithtech002';
      console.log(`⚠️  데이터베이스('${dbName}')가 존재하지 않습니다. 자동 생성을 시도합니다...`);
      try {
        const tempConn = await mysql.createConnection({
          host: process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost',
          port: (process.env.DB_PORT || process.env.MYSQL_PORT) ? Number(process.env.DB_PORT || process.env.MYSQL_PORT) : 3306,
          user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
          password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD : ''),
          multipleStatements: true
        });
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await tempConn.query(`USE \`${dbName}\`;`);
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          await tempConn.query(sql);
        }
        await tempConn.end();
        console.log(`✅ 데이터베이스('${dbName}') 및 테이블 자동 생성 완료!`);
        return true;
      } catch (initErr) {
        console.error('❌ 데이터베이스 자동 생성 실패:', initErr.message);
        return false;
      }
    }
    console.error('❌ MySQL 데이터베이스 연결 실패:', error.message);
    return false;
  }
}

// 쿼리 실행 헬퍼 함수 (Prepared Statement 사용, SQL Injection 원천 차단)
export async function query(sql, params = []) {
  try {
    const safeParams = (params || []).map(p => (p === undefined ? '' : p));
    const [results] = await pool.execute(sql, safeParams);
    return results;
  } catch (error) {
    console.error('SQL Execution Error:', error.message);
    throw error;
  }
}

export default pool;
