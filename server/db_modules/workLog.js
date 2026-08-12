import { query } from '../mysql.js';

let workLogColumnsEnsured = false;

/**
 * work_log 테이블 컬럼 자동 변경 및 마이그레이션
 * 1. writer_name -> name, writer_rank -> rank, writer_team -> team 컬럼명 변경
 * 2. issues_found, weather, status 컬럼 삭제
 * 3. division(사업부), role(권한) 컬럼 추가
 * MySQL 예약어 (`name`, `rank`, `team`, `role`, `division` 등) 백틱 이스케이프 적용
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

    // 1. 컬럼명 변경 (writer_name -> name, writer_rank -> rank, writer_team -> team)
    if (colNames.includes('writer_name') && !colNames.includes('name')) {
      try { await query("ALTER TABLE work_log CHANGE COLUMN `writer_name` `name` VARCHAR(100) NOT NULL COMMENT '작성자 성명'"); } catch (e) {}
    }
    if (colNames.includes('writer_rank') && !colNames.includes('rank')) {
      try { await query("ALTER TABLE work_log CHANGE COLUMN `writer_rank` `rank` VARCHAR(50) DEFAULT '' COMMENT '작성자 직급'"); } catch (e) {}
    }
    if (colNames.includes('writer_team') && !colNames.includes('team')) {
      try { await query("ALTER TABLE work_log CHANGE COLUMN `writer_team` `team` VARCHAR(100) DEFAULT '' COMMENT '작성자 소속팀'"); } catch (e) {}
    }

    // 2. 불필요 컬럼 삭제 (issues_found, weather, status)
    const dropCols = ['issues_found', 'weather', 'status'];
    for (const col of dropCols) {
      if (colNames.includes(col)) {
        try { await query(`ALTER TABLE work_log DROP COLUMN \`${col}\``); } catch (e) {}
      }
    }

    // 최신 컬럼 목록 재조회
    const currentCols = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_log'
    `);
    const freshColNames = (currentCols || []).map(c => String(c.COLUMN_NAME).toLowerCase());

    // 3. 신규 및 필수 컬럼 보장 (division, role)
    if (!freshColNames.includes('name')) try { await query("ALTER TABLE work_log ADD COLUMN `name` VARCHAR(100) NOT NULL DEFAULT '작성자' COMMENT '작성자 성명'"); } catch (e) {}
    if (!freshColNames.includes('rank')) try { await query("ALTER TABLE work_log ADD COLUMN `rank` VARCHAR(50) DEFAULT '' COMMENT '작성자 직급'"); } catch (e) {}
    if (!freshColNames.includes('team')) try { await query("ALTER TABLE work_log ADD COLUMN `team` VARCHAR(100) DEFAULT '' COMMENT '작성자 소속팀'"); } catch (e) {}
    if (!freshColNames.includes('division')) try { await query("ALTER TABLE work_log ADD COLUMN `division` VARCHAR(100) DEFAULT '' COMMENT '해당 계정 사업부'"); } catch (e) {}
    if (!freshColNames.includes('role')) try { await query("ALTER TABLE work_log ADD COLUMN `role` VARCHAR(50) DEFAULT '일반' COMMENT '해당 계정 권한'"); } catch (e) {}
    if (!freshColNames.includes('category')) try { await query("ALTER TABLE work_log ADD COLUMN `category` VARCHAR(50) DEFAULT '사내 업무' COMMENT '일지 구별'"); } catch (e) {}
    if (!freshColNames.includes('site_name')) try { await query("ALTER TABLE work_log ADD COLUMN `site_name` VARCHAR(255) DEFAULT '' COMMENT '출장 사업장명'"); } catch (e) {}
  } catch (e) {}
  workLogColumnsEnsured = true;
}

/**
 * 업무일지(work_log) 생성 및 저장
 */
export async function createWorkLog(data = {}) {
  await ensureWorkLogColumns();

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
  await ensureWorkLogColumns();
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
  await ensureWorkLogColumns();
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
  await ensureWorkLogColumns();
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
