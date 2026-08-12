import { query } from '../mysql.js';

/**
 * 현장 목록 조회 (security_site)
 */
export async function getSecuritySites() {
  const sql = 'SELECT * FROM security_site ORDER BY created_at DESC';
  return await query(sql);
}

/**
 * 특정 현장 상세 조회
 */
export async function getSecuritySiteById(id) {
  const sql = 'SELECT * FROM security_site WHERE id = ? LIMIT 1';
  const results = await query(sql, [id]);
  return results.length > 0 ? results[0] : null;
}

/**
 * 현장 등록 / 수정
 */
export async function createSecuritySite(data) {
  const { id, name, type = 'general', address = '', manager = '', contact = '', status = 'ACTIVE' } = data;
  const sql = `
    INSERT INTO security_site (id, name, type, address, manager, contact, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      type = VALUES(type),
      address = VALUES(address),
      manager = VALUES(manager),
      contact = VALUES(contact),
      status = VALUES(status)
  `;
  await query(sql, [id, name, type, address, manager, contact, status]);
  return { id, name, type, address, manager, contact, status };
}

/**
 * 현장 삭제
 */
export async function deleteSecuritySite(id) {
  const sql = 'DELETE FROM security_site WHERE id = ?';
  const result = await query(sql, [id]);
  return result.affectedRows > 0;
}
