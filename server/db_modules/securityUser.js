import { query } from '../mysql.js';
import crypto from 'crypto';

const SALT_PREFIX = 'WithSecurity_SALT_2026_';

/**
 * 4. SHA-256 서버 솔트(Salt) 암호화 헬퍼
 */
export function hashPasswordServer(rawPassword) {
  if (!rawPassword) return '';
  const str = String(rawPassword).trim();
  // 이미 솔트 해시된 64자리 문자열인 경우 그대로 보존
  if (/^[a-f0-9]{64}$/i.test(str)) return str;
  return crypto.createHash('sha256').update(`${SALT_PREFIX}${str}`).digest('hex');
}

/**
 * 솔트 해시 및 레거시 해시 호환 검증 함수
 */
export function verifyUserPasswordServer(inputPassword, storedPasswordHash) {
  if (!inputPassword || !storedPasswordHash) return false;
  const inputStr = String(inputPassword).trim();
  const storedStr = String(storedPasswordHash).trim();

  // 1. 솔트 적용 해시 검증
  const saltedHash = crypto.createHash('sha256').update(`${SALT_PREFIX}${inputStr}`).digest('hex');
  if (saltedHash === storedStr) return true;

  // 2. 레거시 일반 SHA-256 해시 검증 (하위 호환성)
  const legacyHash = crypto.createHash('sha256').update(inputStr).digest('hex');
  if (legacyHash === storedStr) return true;

  // 3. 평문 직접 일치 검증 (개발/테스트 임시 계정)
  if (inputStr === storedStr) return true;

  return false;
}

/**
 * 사용자 정보 객체에서 민감한 패스워드 해시를 제거하는 살균 헬퍼
 */
export function sanitizeUserOutput(user) {
  if (!user) return null;
  const { password, passwordHash, ...safeUser } = user;
  return {
    ...safeUser,
    educationDate: user.education_date || user.educationDate || '',
    educationExpiryDate: user.education_expiry_date || user.educationExpiryDate || '',
    educationName: user.education_name || user.educationName || '사내 정기 정보보안 및 안전 교육',
    trainings: Array.isArray(user.trainings) ? user.trainings : (typeof user.trainings === 'string' && user.trainings ? JSON.parse(user.trainings || '[]') : [])
  };
}

/**
 * 사용자 목록 조회 (security_user)
 * admin 개발자 계정이 없으면 자동 생성 후 반환
 */
export async function getSecurityUsers(includePassword = false) {
  let users = [];
  try {
    const sql = 'SELECT id, username, password, name, role, division, team, `rank`, siteId, phone, email, education_date, education_expiry_date, education_name, trainings, created_at FROM security_user ORDER BY id ASC';
    users = await query(sql);
  } catch (err) {
    const fallbackSql = 'SELECT * FROM security_user ORDER BY id ASC';
    try { users = await query(fallbackSql); } catch (e) { users = []; }
  }
  
  const defaultAdminPass = process.env.ADMIN_DEFAULT_PASSWORD || 'withtech123!';
  const defaultAdminUser = process.env.ADMIN_USERNAME || 'admin';

  // 기본 admin 계정이 없거나 초기 생성 필요한 경우 암호화된 관리자 계정 생성
  const adminUser = Array.isArray(users) && users.find(u => u.username === defaultAdminUser);
  if (!adminUser || !adminUser.password) {
    try {
      await createSecurityUser({
        username: defaultAdminUser,
        password: hashPasswordServer(defaultAdminPass),
        name: '이원배',
        role: '개발자',
        division: '영업/운영사업부',
        team: '운영1팀',
        rank: '대리',
        siteId: 'ALL',
        phone: '010-9885-0393',
        email: 'wblee@withtech.co.kr',
        education_date: '2025-08-20',
        education_expiry_date: '2026-08-19',
        education_name: '사내 정기 정보보안 및 안전 교육'
      });
      users = await query('SELECT * FROM security_user ORDER BY id ASC');
    } catch (e) {
      console.warn('Auto admin account seed warning:', e.message);
    }
  }

  // wblee 계정도 없을 경우 생성
  const wbleeUser = Array.isArray(users) && users.find(u => u.username === 'wblee');
  if (!wbleeUser) {
    try {
      await createSecurityUser({
        username: 'wblee',
        password: hashPasswordServer(defaultAdminPass),
        name: '이원배',
        role: '일반',
        division: '영업/운영사업부',
        team: '운영1팀',
        rank: '대리',
        siteId: 'SITE-001',
        phone: '010-9885-0393',
        email: 'wblee@withtech.co.kr',
        education_date: '2025-08-20',
        education_expiry_date: '2026-08-19',
        education_name: '사내 정기 정보보안 및 안전 교육'
      });
      users = await query('SELECT * FROM security_user ORDER BY id ASC');
    } catch (e) {}
  }

  if (includePassword) {
    return (users || []).map(u => ({
      ...u,
      educationDate: u.education_date || u.educationDate || '',
      educationExpiryDate: u.education_expiry_date || u.educationExpiryDate || '',
      educationName: u.education_name || u.educationName || '사내 정기 정보보안 및 안전 교육',
      password: u.password || '',
      passwordHash: u.password || ''
    }));
  }

  return (users || []).map(u => sanitizeUserOutput(u));
}

/**
 * 특정 사용자 상세 조회
 */
export async function getSecurityUserByUsername(username, includePassword = false) {
  const sql = 'SELECT * FROM security_user WHERE username = ? LIMIT 1';
  const results = await query(sql, [username]);
  if (results.length > 0) {
    const u = results[0];
    if (includePassword) {
      return {
        ...u,
        educationDate: u.education_date || u.educationDate || '',
        educationExpiryDate: u.education_expiry_date || u.educationExpiryDate || '',
        educationName: u.education_name || u.educationName || '사내 정기 정보보안 및 안전 교육',
        passwordHash: u.password
      };
    }
    return sanitizeUserOutput(u);
  }
  return null;
}

/**
 * 사용자 생성 / 업데이트 (비밀번호 솔트 SHA-256 암호화 적용)
 */
export async function createSecurityUser(data = {}) {
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
  const education_date = data.educationDate || data.education_date || '';
  const education_expiry_date = data.educationExpiryDate || data.education_expiry_date || '';
  const education_name = data.educationName || data.education_name || '사내 정기 정보보안 및 안전 교육';
  const trainings = Array.isArray(data.trainings) ? JSON.stringify(data.trainings) : (typeof data.trainings === 'string' ? data.trainings : '');

  try {
    const sql = `
      INSERT INTO security_user (username, password, name, role, division, team, \`rank\`, siteId, phone, email, education_date, education_expiry_date, education_name, trainings)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        password = IF(VALUES(password) != '', VALUES(password), password),
        name = VALUES(name),
        role = VALUES(role),
        division = VALUES(division),
        team = VALUES(team),
        \`rank\` = VALUES(\`rank\`),
        siteId = VALUES(siteId),
        phone = VALUES(phone),
        email = VALUES(email),
        education_date = VALUES(education_date),
        education_expiry_date = VALUES(education_expiry_date),
        education_name = VALUES(education_name),
        trainings = IF(VALUES(trainings) != '', VALUES(trainings), trainings)
    `;
    await query(sql, [username, password, name, role, division, team, rank, siteId, phone, email, education_date, education_expiry_date, education_name, trainings]);
  } catch (err) {
    // Fallback without new columns if DB not migrated yet
    const fallbackSql = `
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
    await query(fallbackSql, [username, password, name, role, division, team, rank, siteId, phone, email]);
  }

  return {
    username, name, role, division, team, rank, siteId, phone, email,
    educationDate: education_date,
    educationExpiryDate: education_expiry_date,
    educationName: education_name,
    trainings: Array.isArray(data.trainings) ? data.trainings : []
  };
}

/**
 * 사용자 삭제
 */
export async function deleteSecurityUser(username) {
  const sql = 'DELETE FROM security_user WHERE username = ?';
  const result = await query(sql, [username]);
  return result.affectedRows > 0;
}
