import { query } from '../mysql.js';

/**
 * 사용자 목록 조회 (security_user)
 */
export async function getSecurityUsers() {
  const sql = 'SELECT id, username, name, role, siteId, phone, created_at FROM security_user ORDER BY id ASC';
  return await query(sql);
}

/**
 * 특정 사용자 상세 조회
 */
export async function getSecurityUserByUsername(username) {
  const sql = 'SELECT * FROM security_user WHERE username = ? LIMIT 1';
  const results = await query(sql, [username]);
  return results.length > 0 ? results[0] : null;
}

/**
 * 사용자 생성
 */
export async function createSecurityUser(data) {
  const { username, password, name, role = 'worker', siteId = '', phone = '' } = data;
  const sql = `
    INSERT INTO security_user (username, password, name, role, siteId, phone)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      password = VALUES(password),
      name = VALUES(name),
      role = VALUES(role),
      siteId = VALUES(siteId),
      phone = VALUES(phone)
  `;
  const result = await query(sql, [username, password, name, role, siteId, phone]);
  return { username, name, role, siteId, phone };
}

/**
 * 사용자 삭제
 */
export async function deleteSecurityUser(username) {
  const sql = 'DELETE FROM security_user WHERE username = ?';
  const result = await query(sql, [username]);
  return result.affectedRows > 0;
}
