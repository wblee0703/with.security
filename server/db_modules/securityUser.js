import { query } from '../mysql.js';
import crypto from 'crypto';

let columnsEnsured = false;

/**
 * SHA-256 서버 암호화 헬퍼 (평문 입력시 자동 암호화, 이미 64자리 해시인 경우 그대로 보존)
 */
function hashPasswordServer(rawPassword) {
  if (!rawPassword) return '';
  const str = String(rawPassword).trim();
  if (/^[a-f0-9]{64}$/i.test(str)) return str;
  return crypto.createHash('sha256').update(`WithSecurity_SALT_2026_${str}`).digest('hex');
}

/**
 * security_user 테이블 컬럼 자동 마이그레이션 (division, team, rank, email)
 * INFORMATION_SCHEMA를 미리 조회하여 이미 존재하는 컬럼일 경우 ALTER 문 실행을 건너뜀 (에러 로그 방지)
 */
async function ensureUserColumns() {
  if (columnsEnsured) return;
  try {
    const existingColumns = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'security_user'
    `);
    const colNames = (existingColumns || []).map(c => String(c.COLUMN_NAME).toLowerCase());

    if (!colNames.includes('division')) {
      await query("ALTER TABLE security_user ADD COLUMN division VARCHAR(100) DEFAULT '' COMMENT '사업부'");
    }
    if (!colNames.includes('team')) {
      await query("ALTER TABLE security_user ADD COLUMN team VARCHAR(100) DEFAULT '' COMMENT '소속팀'");
    }
    if (!colNames.includes('rank')) {
      await query("ALTER TABLE security_user ADD COLUMN `rank` VARCHAR(50) DEFAULT '' COMMENT '직급'");
    }
    if (!colNames.includes('email')) {
      await query("ALTER TABLE security_user ADD COLUMN email VARCHAR(100) DEFAULT '' COMMENT '이메일 주소'");
    }
  } catch (e) {}
  columnsEnsured = true;
}

/**
 * 사용자 목록 조회 (security_user)
 * admin 개발자 계정이 없으면 자동 생성 후 반환
 */
export async function getSecurityUsers() {
  await ensureUserColumns();
  const sql = 'SELECT id, username, password, name, role, division, team, `rank`, siteId, phone, email, created_at FROM security_user ORDER BY id ASC';
  let users = await query(sql);
  
  // 기본 admin/wblee 계정이 없거나 기존 임시 정보인 경우 암호화된 초기 시드 데이터 생성
  const adminUser = Array.isArray(users) && users.find(u => u.username === 'admin');
  if (!adminUser || adminUser.name === '개발자 관리자' || !adminUser.division) {
    try {
      await createSecurityUser({
        username: 'admin',
        password: 'd68e2e25808044e471e01da6bf4ef8dc8fd56de3c4fa590b34b86b7c86fef899',
        name: '이원배',
        role: '개발자',
        division: '영업/운영사업부',
        team: '운영1팀',
        rank: '대리',
        siteId: 'ALL',
        phone: '010-9885-0393',
        email: 'wblee@withtech.co.kr'
      });
      await createSecurityUser({
        username: 'wblee',
        password: 'd68e2e25808044e471e01da6bf4ef8dc8fd56de3c4fa590b34b86b7c86fef899',
        name: '이원배',
        role: '일반',
        division: '영업/운영사업부',
        team: '운영1팀',
        rank: '대리',
        siteId: 'SITE-001',
        phone: '010-9885-0393',
        email: 'wblee@withtech.co.kr'
      });
      users = await query(sql);
    } catch (e) {
      console.warn('Auto admin account seed warning:', e.message);
    }
  }

  // password를 passwordHash 속성으로도 맵핑하여 클라이언트 검증 호환성 보장
  return (users || []).map(u => ({
    ...u,
    password: u.password || '',
    passwordHash: u.password || ''
  }));
}

/**
 * 특정 사용자 상세 조회
 */
export async function getSecurityUserByUsername(username) {
  await ensureUserColumns();
  const sql = 'SELECT * FROM security_user WHERE username = ? LIMIT 1';
  const results = await query(sql, [username]);
  if (results.length > 0) {
    const u = results[0];
    return { ...u, passwordHash: u.password };
  }
  return null;
}

/**
 * 사용자 생성 / 업데이트 (비밀번호 SHA-256 암호화 적용)
 */
export async function createSecurityUser(data = {}) {
  await ensureUserColumns();

  const username = data.username || '';
  const rawPass = data.password || data.passwordHash || '';
  const password = rawPass ? hashPasswordServer(rawPass) : '';
  const name = data.name || '';
  const role = data.role || '일반';
  const division = data.division || '';
  const team = data.team || '';
  const rank = data.rank || '';
  const siteId = data.siteId || '';
  const phone = data.phone || '';
  const email = data.email || '';

  const sql = `
    INSERT INTO security_user (username, password, name, role, division, team, \`rank\`, siteId, phone, email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      password = IF(VALUES(password) != '', VALUES(password), password),
      name = VALUES(name),
      role = VALUES(role),
      division = VALUES(division),
      team = VALUES(team),
      \`rank\` = VALUES(\`rank\`),
      siteId = VALUES(siteId),
      phone = VALUES(phone),
      email = VALUES(email)
  `;

  await query(sql, [username, password, name, role, division, team, rank, siteId, phone, email]);
  return { username, name, role, division, team, rank, siteId, phone, email };
}

/**
 * 사용자 삭제
 */
export async function deleteSecurityUser(username) {
  await ensureUserColumns();
  const sql = 'DELETE FROM security_user WHERE username = ?';
  const result = await query(sql, [username]);
  return result.affectedRows > 0;
}
