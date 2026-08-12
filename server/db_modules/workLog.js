import { query } from '../mysql.js';

/**
 * 업무일지(work_log) 생성
 */
export async function createWorkLog(data) {
  const {
    logId = `work_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    writerName,
    writerId = '',
    siteName = '',
    logDate = new Date().toISOString().split('T')[0],
    title,
    tasksDone = '',
    issuesFound = '',
    weather = '맑음',
    status = 'SUBMITTED'
  } = data;

  const sql = `
    INSERT INTO work_log 
    (log_id, writer_name, writer_id, site_name, log_date, title, tasks_done, issues_found, weather, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await query(sql, [
    logId,
    writerName,
    writerId,
    siteName,
    logDate,
    title,
    tasksDone,
    issuesFound,
    weather,
    status
  ]);

  return { id: result.insertId, logId, title, writerName, logDate, status };
}

/**
 * 업무일지 목록 조회 (날짜별 / 작성자별 필터 가능)
 */
export async function getWorkLogs(searchParams = {}) {
  let sql = 'SELECT * FROM work_log WHERE 1=1';
  const params = [];

  if (searchParams.writerName) {
    sql += ' AND writer_name LIKE ?';
    params.push(`%${searchParams.writerName}%`);
  }

  if (searchParams.siteName) {
    sql += ' AND site_name LIKE ?';
    params.push(`%${searchParams.siteName}%`);
  }

  if (searchParams.logDate) {
    sql += ' AND log_date = ?';
    params.push(searchParams.logDate);
  }

  sql += ' ORDER BY log_date DESC, created_at DESC';

  return await query(sql, params);
}

/**
 * 특정 업무일지 상세 조회
 */
export async function getWorkLogById(logId) {
  const sql = 'SELECT * FROM work_log WHERE log_id = ? OR id = ? LIMIT 1';
  const results = await query(sql, [logId, logId]);
  return results.length > 0 ? results[0] : null;
}

/**
 * 업무일지 수정
 */
export async function updateWorkLog(logId, data) {
  const { title, tasksDone, issuesFound, weather, status } = data;
  const sql = `
    UPDATE work_log 
    SET title = COALESCE(?, title),
        tasks_done = COALESCE(?, tasks_done),
        issues_found = COALESCE(?, issues_found),
        weather = COALESCE(?, weather),
        status = COALESCE(?, status)
    WHERE log_id = ? OR id = ?
  `;

  const result = await query(sql, [title, tasksDone, issuesFound, weather, status, logId, logId]);
  return result.affectedRows > 0;
}

/**
 * 업무일지 삭제
 */
export async function deleteWorkLog(logId) {
  const sql = 'DELETE FROM work_log WHERE log_id = ? OR id = ?';
  const result = await query(sql, [logId, logId]);
  return result.affectedRows > 0;
}
