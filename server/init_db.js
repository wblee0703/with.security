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
