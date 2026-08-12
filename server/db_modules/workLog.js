import { query } from '../mysql.js';

let workLogColumnsEnsured = false;

/**
 * work_log 테이블 컬럼 자동 생성 마이그레이션 (writer_team, writer_rank, category 지원)
 */
async function ensureWorkLogColumns() {
  if (workLogColumnsEnsured) return;
  try {
    const existingColumns = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_log'
    `);
    const colNames = (existingColumns || []).map(c => String(c.COLUMN_NAME).toLowerCase());

    if (!colNames.includes('writer_team')) {
      try { await query("ALTER TABLE work_log ADD COLUMN `writer_team` VARCHAR(100) DEFAULT '' COMMENT '작성자 소속팀'"); } catch (e) {}
    }
    if (!colNames.includes('writer_rank')) {
      try { await query("ALTER TABLE work_log ADD COLUMN `writer_rank` VARCHAR(50) DEFAULT '' COMMENT '작성자 직급'"); } catch (e) {}
    }
    if (!colNames.includes('category')) {
      try { await query("ALTER TABLE work_log ADD COLUMN `category` VARCHAR(50) DEFAULT '사내 업무' COMMENT '일지 구별'"); } catch (e) {}
    }
  } catch (e) {}
  workLogColumnsEnsured = true;
}

/**
 * 업무일지(work_log) 생성 및 저장 (log_date 반영)
 */
export async function createWorkLog(data = {}) {
  await ensureWorkLogColumns();

  const logId = String(data.logId || data.log_id || data.id || `work_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
  const writerName = String(data.writerName || data.writer_name || data.authorName || '작성자');
  const writerId = String(data.writerId || data.writer_id || data.authorUsername || '');
  const writerTeam = String(data.writerTeam || data.writer_team || data.authorTeam || data.department || '보안관제팀');
  const writerRank = String(data.writerRank || data.writer_rank || data.authorRank || '대리');
  const category = String(data.category || '사내 업무');
  const siteName = String(data.siteName || data.site_name || '');
  const logDate = String(data.logDate || data.log_date || data.date || new Date().toISOString().split('T')[0]);
  const title = String(data.title || '업무 일지');
  const tasksDone = String(data.tasksDone || data.tasks_done || data.details || '');
  const issuesFound = String(data.issuesFound || data.issues_found || '');
  const weather = String(data.weather || '맑음');
  const status = String(data.status || 'SUBMITTED');

  const sql = `
    INSERT INTO work_log 
    (\`log_id\`, \`writer_name\`, \`writer_id\`, \`writer_team\`, \`writer_rank\`, \`category\`, \`site_name\`, \`log_date\`, \`title\`, \`tasks_done\`, \`issues_found\`, \`weather\`, \`status\`)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      \`writer_name\` = VALUES(\`writer_name\`),
      \`writer_id\` = VALUES(\`writer_id\`),
      \`writer_team\` = VALUES(\`writer_team\`),
      \`writer_rank\` = VALUES(\`writer_rank\`),
      \`category\` = VALUES(\`category\`),
      \`site_name\` = VALUES(\`site_name\`),
      \`log_date\` = VALUES(\`log_date\`),
      \`title\` = VALUES(\`title\`),
      \`tasks_done\` = VALUES(\`tasks_done\`),
      \`issues_found\` = VALUES(\`issues_found\`),
      \`weather\` = VALUES(\`weather\`),
      \`status\` = VALUES(\`status\`)
  `;

  await query(sql, [
    logId, writerName, writerId, writerTeam, writerRank, category, siteName, logDate, title, tasksDone, issuesFound, weather, status
  ]);

  return { id: logId, log_id: logId, title, writerName, writerTeam, writerRank, logDate, status };
}

/**
 * 업무일지 목록 조회 (날짜별 / 작성자별 필터 가능)
 */
export async function getWorkLogs(searchParams = {}) {
  await ensureWorkLogColumns();
  let sql = "SELECT `id`, `log_id`, `writer_name`, `writer_id`, `writer_team`, `writer_rank`, `category`, `site_name`, DATE_FORMAT(`log_date`, '%Y-%m-%d') AS `log_date`, `title`, `tasks_done`, `issues_found`, `weather`, `status`, `created_at` FROM work_log WHERE 1=1";
  const params = [];

  if (searchParams.writerName) {
    sql += ' AND `writer_name` LIKE ?';
    params.push(`%${searchParams.writerName}%`);
  }

  if (searchParams.siteName) {
    sql += ' AND `site_name` LIKE ?';
    params.push(`%${searchParams.siteName}%`);
  }

  if (searchParams.logDate) {
    sql += ' AND `log_date` = ?';
    params.push(searchParams.logDate);
  }

  sql += ' ORDER BY `log_date` DESC, `created_at` DESC, `id` DESC';

  const rows = await query(sql, params);
  return (rows || []).map(row => ({
    ...row,
    log_date: row.log_date ? String(row.log_date).slice(0, 10) : ''
  }));
}

/**
 * 특정 업무일지 상세 조회
 */
export async function getWorkLogById(logId) {
  await ensureWorkLogColumns();
  const sql = 'SELECT * FROM work_log WHERE `log_id` = ? OR `id` = ? LIMIT 1';
  const results = await query(sql, [logId, logId]);
  return results.length > 0 ? results[0] : null;
}

/**
 * 업무일지 수정 (log_date 날짜 수정 포함)
 */
export async function updateWorkLog(logId, data) {
  await ensureWorkLogColumns();
  const { title, tasksDone, details, issuesFound, weather, status, category, writerTeam, writerRank, logDate, date } = data;
  const targetDate = logDate || date || null;

  const sql = `
    UPDATE work_log 
    SET title = COALESCE(?, title),
        tasks_done = COALESCE(?, tasks_done),
        issues_found = COALESCE(?, issues_found),
        weather = COALESCE(?, weather),
        category = COALESCE(?, category),
        writer_team = COALESCE(?, writer_team),
        writer_rank = COALESCE(?, writer_rank),
        log_date = COALESCE(?, log_date),
        status = COALESCE(?, status)
    WHERE \`log_id\` = ? OR \`id\` = ?
  `;

  const result = await query(sql, [
    title || null, (tasksDone || details) || null, issuesFound || null, weather || null, category || null, writerTeam || null, writerRank || null, targetDate, status || null, logId || '', logId || ''
  ]);
  return result.affectedRows > 0;
}

/**
 * 업무일지 삭제
 */
export async function deleteWorkLog(logId) {
  await ensureWorkLogColumns();
  const targetId = String(logId || '').trim();
  if (!targetId) return false;

  const isPureNumber = /^\d+$/.test(targetId);
  const sql = isPureNumber
    ? 'DELETE FROM work_log WHERE `log_id` = ? OR `id` = ?'
    : 'DELETE FROM work_log WHERE `log_id` = ?';

  const params = isPureNumber ? [targetId, parseInt(targetId, 10)] : [targetId];

  try {
    const result = await query(sql, params);
    return (result && result.affectedRows > 0);
  } catch (e) {
    try {
      const result = await query('DELETE FROM work_log WHERE `log_id` = ?', [targetId]);
      return (result && result.affectedRows > 0);
    } catch (err) {
      return false;
    }
  }
}
