import { query } from '../mysql.js';

/**
 * 보안서약(security_log) 생성
 */
export async function createSecurityLog(data) {
  const {
    logId = `sec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    userName,
    userId = '',
    pledgeTitle,
    pledgeContent = '',
    signatureData = '',
    ipAddress = ''
  } = data;

  const sql = `
    INSERT INTO security_log 
    (log_id, user_name, user_id, pledge_title, pledge_content, signature_data, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    logId,
    userName,
    userId,
    pledgeTitle,
    pledgeContent,
    signatureData,
    ipAddress
  ]);

  return { id: result.insertId, logId, userName, pledgeTitle, status: 'SUCCESS' };
}

/**
 * 보안서약 전체/검색 조회
 */
export async function getSecurityLogs(searchParams = {}) {
  let sql = 'SELECT id, log_id, user_name, user_id, pledge_title, ip_address, agreed_at, created_at FROM security_log';
  const params = [];

  if (searchParams.userName) {
    sql += ' WHERE user_name LIKE ?';
    params.push(`%${searchParams.userName}%`);
  }

  sql += ' ORDER BY agreed_at DESC';

  return await query(sql, params);
}

/**
 * 특정 보안서약 상세 조회 (서명 및 전문 포함)
 */
export async function getSecurityLogById(logId) {
  const sql = 'SELECT * FROM security_log WHERE log_id = ? OR id = ? LIMIT 1';
  const results = await query(sql, [logId, logId]);
  return results.length > 0 ? results[0] : null;
}

/**
 * 보안서약 삭제
 */
export async function deleteSecurityLog(logId) {
  const sql = 'DELETE FROM security_log WHERE log_id = ? OR id = ?';
  const result = await query(sql, [logId, logId]);
  return result.affectedRows > 0;
}
