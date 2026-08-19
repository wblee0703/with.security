import { query } from '../mysql.js';

let migrationDone = false;
async function ensureWeeklyReportTable() {
  if (migrationDone) return;
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS weekly_report (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_id VARCHAR(120) UNIQUE COMMENT '고유 주간보고 ID (weekly-rep-username-YYYY-MM-DD)',
        weekly_monday DATE NOT NULL COMMENT '해당 주차 월요일 날짜',
        week_text VARCHAR(100) DEFAULT '' COMMENT '주차 표기 (예: 2026년 8월 3주차)',
        author_name VARCHAR(100) NOT NULL COMMENT '작성자 성명',
        author_username VARCHAR(100) DEFAULT '' COMMENT '작성자 아이디',
        author_team VARCHAR(100) DEFAULT '' COMMENT '작성자 소속팀',
        author_rank VARCHAR(50) DEFAULT '' COMMENT '작성자 직급',
        author_division VARCHAR(100) DEFAULT '' COMMENT '작성자 사업부',
        author_role VARCHAR(50) DEFAULT '' COMMENT '작성자 권한/역할',
        main_tasks TEXT COMMENT '1. 주요 내용',
        info_sharing TEXT COMMENT '2. 정보 공유',
        work_support TEXT COMMENT '3. 업무 지원',
        etc_tasks TEXT COMMENT '4. 기타 업무',
        shared_with TEXT COMMENT '공유 대상 목록 JSON',
        shared_at VARCHAR(100) DEFAULT '' COMMENT '공유 시각',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await query(sql);
    migrationDone = true;
  } catch (e) {
    // ignore
  }
}

/**
 * 주간 업무 보고서 생성 및 업데이트 (주요 내용, 정보 공유, 업무 지원, 기타 업무 컬럼별 분리 저장)
 */
export async function createWeeklyReport(data = {}) {
  await ensureWeeklyReportTable();

  const reportId = String(data.reportId || data.report_id || data.id || `weekly_${Date.now()}`);
  const weeklyMonday = String(data.weeklyMonday || data.weekly_monday || new Date().toISOString().split('T')[0]);
  const weekText = String(data.weekText || data.week_text || '');
  const authorName = String(data.authorName || data.author_name || data.name || '작성자');
  const authorUsername = String(data.authorUsername || data.author_username || data.writerId || '');
  const authorTeam = String(data.authorTeam || data.author_team || data.team || '');
  const authorRank = String(data.authorRank || data.author_rank || data.rank || '대리');
  const authorDivision = String(data.authorDivision || data.author_division || data.division || '');
  const authorRole = String(data.authorRole || data.author_role || data.role || '일반');

  // ⭐ 주간 4대 핵심 컬럼 분리
  const mainTasks = String(data.mainTasks || data.main_tasks || '');
  const infoSharing = String(data.infoSharing || data.info_sharing || '');
  const workSupport = String(data.workSupport || data.work_support || data.teamCoop || data.team_coop || '');
  // ⭐ shared_with를 '이름 (소속)' 형식으로만 정제 (예: '홍길동 (운영1팀), 이원배 (운영2팀)')
  let formattedSharedWith = '';
  const rawShared = data.sharedWith || data.shared_with || [];
  let sharedList = [];
  if (Array.isArray(rawShared)) {
    sharedList = rawShared;
  } else if (typeof rawShared === 'string') {
    try {
      const parsed = JSON.parse(rawShared);
      if (Array.isArray(parsed)) sharedList = parsed;
      else sharedList = [rawShared];
    } catch {
      sharedList = rawShared.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  const cleanTargets = sharedList.map(item => {
    if (typeof item === 'string') {
      return item.trim();
    }
    if (item && typeof item === 'object') {
      const name = (item.name || item.authorName || item.writerName || '').trim();
      const rank = (item.rank || item.authorRank || item.writerRank || '').trim();
      let team = (item.team || item.department || item.authorTeam || '').trim();
      if (team.includes(' ')) {
        const parts = team.split(/\s+/);
        team = parts[parts.length - 1];
      }
      let label = name;
      if (rank && !label.includes(rank)) label += ` ${rank}`;
      if (team && !label.includes(team)) label += ` (${team})`;
      return label || name || team || '';
    }
    return String(item || '');
  }).filter(Boolean);

  formattedSharedWith = cleanTargets.join(', ');
  const sharedAt = String(data.sharedAt || data.shared_at || '');

  try {
    const sql = `
      INSERT INTO weekly_report 
      (\`report_id\`, \`weekly_monday\`, \`week_text\`, \`author_name\`, \`author_username\`, \`author_team\`, \`author_rank\`, \`author_division\`, \`author_role\`, \`main_tasks\`, \`info_sharing\`, \`work_support\`, \`etc_tasks\`, \`shared_with\`, \`shared_at\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`weekly_monday\` = VALUES(\`weekly_monday\`),
        \`week_text\` = VALUES(\`week_text\`),
        \`author_name\` = VALUES(\`author_name\`),
        \`author_username\` = VALUES(\`author_username\`),
        \`author_team\` = VALUES(\`author_team\`),
        \`author_rank\` = VALUES(\`author_rank\`),
        \`author_division\` = VALUES(\`author_division\`),
        \`author_role\` = VALUES(\`author_role\`),
        \`main_tasks\` = VALUES(\`main_tasks\`),
        \`info_sharing\` = VALUES(\`info_sharing\`),
        \`work_support\` = VALUES(\`work_support\`),
        \`etc_tasks\` = VALUES(\`etc_tasks\`),
        \`shared_with\` = VALUES(\`shared_with\`),
        \`shared_at\` = VALUES(\`shared_at\`)
    `;

    await query(sql, [
      reportId, weeklyMonday, weekText, authorName, authorUsername, authorTeam, authorRank, authorDivision, authorRole,
      mainTasks, infoSharing, workSupport, etcTasks, formattedSharedWith, sharedAt
    ]);
  } catch (err) {
    console.warn('INSERT weekly_report error:', err.message);
  }

  return {
    id: reportId,
    reportId,
    weeklyMonday,
    weekText,
    authorName,
    authorUsername,
    authorTeam,
    authorRank,
    authorDivision,
    authorRole,
    mainTasks,
    infoSharing,
    workSupport,
    teamCoop: workSupport,
    etcTasks,
    sharedWith: data.sharedWith || [],
    sharedAt
  };
}

/**
 * 주간 업무 보고서 목록 조회 (컬럼별 분리 반환)
 */
export async function getWeeklyReports(searchParams = {}) {
  await ensureWeeklyReportTable();
  let rows = [];

  try {
    let sql = `
      SELECT 
        \`id\`, 
        \`report_id\`, 
        DATE_FORMAT(\`weekly_monday\`, '%Y-%m-%d') AS \`weekly_monday\`, 
        \`week_text\`, 
        \`author_name\`, 
        \`author_username\`, 
        \`author_team\`, 
        \`author_rank\`, 
        \`author_division\`, 
        \`author_role\`, 
        \`main_tasks\`, 
        \`info_sharing\`, 
        \`work_support\`, 
        \`etc_tasks\`, 
        \`shared_with\`, 
        \`shared_at\`, 
        \`created_at\` 
      FROM weekly_report 
      WHERE 1=1
    `;
    const params = [];

    if (searchParams.weeklyMonday) {
      sql += ' AND `weekly_monday` = ?';
      params.push(searchParams.weeklyMonday);
    }
    if (searchParams.authorUsername) {
      sql += ' AND `author_username` = ?';
      params.push(searchParams.authorUsername);
    }

    sql += ' ORDER BY `weekly_monday` DESC, `id` DESC';
    rows = await query(sql, params);
  } catch (err) {
    console.warn('getWeeklyReports query error:', err.message);
    rows = [];
  }

  return (rows || []).map(r => {
    let parsedSharedWith = [];
    if (r.shared_with) {
      if (Array.isArray(r.shared_with)) parsedSharedWith = r.shared_with;
      else if (typeof r.shared_with === 'string') {
        try { parsedSharedWith = JSON.parse(r.shared_with); } catch (e) { parsedSharedWith = []; }
      }
    }

    return {
      id: r.report_id || `weekly_${r.id}`,
      reportId: r.report_id || `weekly_${r.id}`,
      weeklyMonday: r.weekly_monday,
      weekText: r.week_text || '',
      authorName: r.author_name || '작성자',
      authorUsername: r.author_username || '',
      authorTeam: r.author_team || '',
      authorRank: r.author_rank || '대리',
      authorDivision: r.author_division || '',
      authorRole: r.author_role || '일반',
      mainTasks: r.main_tasks || '',
      infoSharing: r.info_sharing || '',
      workSupport: r.work_support || '',
      teamCoop: r.work_support || '',
      etcTasks: r.etc_tasks || '',
      sharedWith: parsedSharedWith,
      sharedAt: r.shared_at || '',
      createdAt: r.created_at ? String(r.created_at).replace('T', ' ').slice(0, 16) : ''
    };
  });
}

/**
 * 주간 업무 보고서 삭제
 */
export async function deleteWeeklyReport(reportId) {
  await ensureWeeklyReportTable();
  try {
    await query("DELETE FROM weekly_report WHERE `report_id` = ? OR `id` = ?", [reportId, reportId]);
    return { success: true };
  } catch (err) {
    console.warn('deleteWeeklyReport error:', err.message);
    return { success: false, error: err.message };
  }
}
