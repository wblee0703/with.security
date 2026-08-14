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
 * 사용자 목록 조회 (security_user)
 * admin 개발자 계정이 없으면 자동 생성 후 반환
 */
export async function getSecurityUsers() {
  const sql = 'SELECT id, username, password, name, role, division, team, `rank`, siteId, phone, email, created_at FROM security_user ORDER BY id ASC';
  let users = await query(sql);
  
  // 기본 admin/wblee 계정이 없거나 기존 임시 정보인 경우 암호화된 초기 시드 데이터 생성
  const adminUser = Array.isArray(users) && users.find(u => u.username === 'admin');
  if (!adminUser || adminUser.name === '개발자 관리자' || !adminUser.division) {
    try {
      await createSecurityUser({
        username: 'admin',
        password: hashPasswordServer('admin'),
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
        password: hashPasswordServer('1234'),
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
  const sql = 'SELECT * FROM security_user WHERE username = ? LIMIT 1';
  const results = await query(sql, [username]);
  if (results.length > 0) {
    const u = results[0];
    return { ...u, passwordHash: u.password };
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
  const sql = 'DELETE FROM security_user WHERE username = ?';
  const result = await query(sql, [username]);
  return result.affectedRows > 0;
}
