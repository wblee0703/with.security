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

// DB 연결 테스트 및 자동 DB 생성 함수
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL 데이터베이스 연결 성공! (가비아 커넥션 풀 활성화)');
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
