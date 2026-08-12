import { query } from '../mysql.js';



/**
 * 업무일지(work_log) 생성 및 저장
 */
export async function createWorkLog(data = {}) {

  const logId = String(data.logId || data.log_id || data.id || `work_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
  const name = String(data.name || data.writerName || data.writer_name || data.authorName || '작성자');
  const writerId = String(data.writerId || data.writer_id || data.authorUsername || '');
  const division = String(data.division || data.authorDivision || '');
  const team = String(data.team || data.writerTeam || data.writer_team || data.authorTeam || data.department || '보안관제팀');
  const rank = String(data.rank || data.writerRank || data.writer_rank || data.authorRank || '대리');
  const role = String(data.role || data.authorRole || '일반');
  const category = String(data.category || '사내 업무');
  const siteName = String(data.siteName || data.site_name || '');
  const logDate = String(data.logDate || data.log_date || data.date || new Date().toISOString().split('T')[0]);
  const title = String(data.title || '업무 일지');
  const tasksDone = String(data.tasksDone || data.tasks_done || data.details || '');

  try {
    const sql = `
      INSERT INTO work_log 
      (\`log_id\`, \`name\`, \`writer_id\`, \`division\`, \`team\`, \`rank\`, \`role\`, \`category\`, \`site_name\`, \`log_date\`, \`title\`, \`tasks_done\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`writer_id\` = VALUES(\`writer_id\`),
        \`division\` = VALUES(\`division\`),
        \`team\` = VALUES(\`team\`),
        \`rank\` = VALUES(\`rank\`),
        \`role\` = VALUES(\`role\`),
        \`category\` = VALUES(\`category\`),
        \`site_name\` = VALUES(\`site_name\`),
        \`log_date\` = VALUES(\`log_date\`),
        \`title\` = VALUES(\`title\`),
        \`tasks_done\` = VALUES(\`tasks_done\`)
    `;

    await query(sql, [
      logId, name, writerId, division, team, rank, role, category, siteName, logDate, title, tasksDone
    ]);
  } catch (err) {
    console.warn('Primary INSERT work_log error, trying fallback:', err.message);
    try {
      await query("INSERT INTO work_log (`log_id`, `title`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `title` = VALUES(`title`)", [logId, title]);
    } catch (e) {}
  }

  return { id: logId, log_id: logId, title, name, division, team, rank, role, logDate };
}

/**
 * 업무일지 목록 조회 (날짜별 / 작성자별 필터 가능, 모든 새 컬럼 반영)
 */
export async function getWorkLogs(searchParams = {}) {
  let rows = [];

  try {
    let sql = "SELECT `id`, `log_id`, `name`, `writer_id`, `division`, `team`, `rank`, `role`, `category`, `site_name`, DATE_FORMAT(`log_date`, '%Y-%m-%d') AS `log_date`, `title`, `tasks_done`, `created_at` FROM work_log WHERE 1=1";
    const params = [];

    if (searchParams.writerName || searchParams.name) {
      sql += ' AND (`name` LIKE ? OR `writer_name` LIKE ?)';
      params.push(`%${searchParams.writerName || searchParams.name}%`, `%${searchParams.writerName || searchParams.name}%`);
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

    rows = await query(sql, params);
  } catch (err) {
    console.warn('Fallback querying work_log with SELECT *:', err.message);
    try {
      rows = await query('SELECT * FROM work_log ORDER BY `id` DESC');
    } catch (e) {
      rows = [];
    }
  }

  return (rows || []).map(row => {
    const sName = row.name || row.writer_name || row.authorName || '작성자';
    const sTeam = row.team || row.writer_team || row.department || '';
    const sRank = row.rank || row.writer_rank || '';
    const sDate = row.log_date ? String(row.log_date).slice(0, 10) : '';

    return {
      id: row.log_id || row.id,
      log_id: row.log_id || row.id,
      name: sName,
      writer_name: sName,
      authorName: sName,
      division: row.division || '',
      team: sTeam,
      writer_team: sTeam,
      authorTeam: sTeam,
      rank: sRank,
      writer_rank: sRank,
      authorRank: sRank,
      role: row.role || '일반',
      category: row.category || '사내 업무',
      site_name: row.site_name || row.siteName || '',
      siteName: row.site_name || row.siteName || '',
      log_date: sDate,
      date: sDate,
      title: row.title || '',
      tasks_done: row.tasks_done || row.details || '',
      details: row.tasks_done || row.details || '',
      created_at: row.created_at || '',
      createdAt: row.created_at ? String(row.created_at).replace('T', ' ').slice(0, 16) : ''
    };
  });
}

/**
 * 특정 업무일지 상세 조회
 */
export async function getWorkLogById(logId) {
  const targetId = String(logId || '').trim();
  if (!targetId) return null;

  const isPureNumber = /^\d+$/.test(targetId);
  let row = null;

  try {
    const sql = isPureNumber
      ? 'SELECT * FROM work_log WHERE `log_id` = ? OR `id` = ? LIMIT 1'
      : 'SELECT * FROM work_log WHERE `log_id` = ? LIMIT 1';
    const params = isPureNumber ? [targetId, parseInt(targetId, 10)] : [targetId];
    const results = await query(sql, params);
    if (results && results.length > 0) row = results[0];
  } catch (e) {}

  if (!row) return null;

  const sName = row.name || row.writer_name || row.authorName || '작성자';
  const sTeam = row.team || row.writer_team || row.department || '';
  const sRank = row.rank || row.writer_rank || '';
  const sDate = row.log_date ? String(row.log_date).slice(0, 10) : '';

  return {
    id: row.log_id || row.id,
    log_id: row.log_id || row.id,
    name: sName,
    writer_name: sName,
    authorName: sName,
    division: row.division || '',
    team: sTeam,
    writer_team: sTeam,
    authorTeam: sTeam,
    rank: sRank,
    writer_rank: sRank,
    authorRank: sRank,
    role: row.role || '일반',
    category: row.category || '사내 업무',
    site_name: row.site_name || row.siteName || '',
    siteName: row.site_name || row.siteName || '',
    log_date: sDate,
    date: sDate,
    title: row.title || '',
    tasks_done: row.tasks_done || row.details || '',
    details: row.tasks_done || row.details || ''
  };
}

/**
 * 업무일지 수정
 */
export async function updateWorkLog(logId, data) {
  const { title, tasksDone, details, category, team, rank, division, role, logDate, date, siteName, name } = data;
  const targetDate = logDate || date || null;

  const sql = `
    UPDATE work_log 
    SET title = COALESCE(?, title),
        tasks_done = COALESCE(?, tasks_done),
        category = COALESCE(?, category),
        \`name\` = COALESCE(?, \`name\`),
        \`team\` = COALESCE(?, \`team\`),
        \`rank\` = COALESCE(?, \`rank\`),
        \`division\` = COALESCE(?, \`division\`),
        \`role\` = COALESCE(?, \`role\`),
        \`site_name\` = COALESCE(?, \`site_name\`),
        log_date = COALESCE(?, log_date)
    WHERE \`log_id\` = ? OR \`id\` = ?
  `;

  const result = await query(sql, [
    title || null, (tasksDone || details) || null, category || null, name || null, team || null, rank || null, division || null, role || null, siteName || null, targetDate, logId || '', logId || ''
  ]);
  return result.affectedRows > 0;
}

/**
 * 업무일지 삭제
 */
export async function deleteWorkLog(logId) {
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
