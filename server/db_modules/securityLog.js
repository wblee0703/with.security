import { query } from '../mysql.js';

let logColumnsEnsured = false;

/**
 * security_log 테이블 컬럼 자동 변경 / 삭제 마이그레이션
 * MySQL 예약어 (`rank`, `name`, `role`, `team` 등) 백틱 이스케이프 및 중복/부재 컬럼 안전 보완
 */
async function ensureLogColumns() {
  if (logColumnsEnsured) return;
  try {
    const existingColumns = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'security_log'
    `);
    const colNames = (existingColumns || []).map(c => String(c.COLUMN_NAME).toLowerCase());

    // 1. 컬럼명 변경 (RENAME / CHANGE COLUMN)
    if (colNames.includes('user_name') && !colNames.includes('name')) {
      try { await query("ALTER TABLE security_log CHANGE COLUMN `user_name` `name` VARCHAR(100) NOT NULL COMMENT '서약자 성명'"); } catch (e) {}
    }
    if (colNames.includes('visitor_team') && !colNames.includes('team')) {
      try { await query("ALTER TABLE security_log CHANGE COLUMN `visitor_team` `team` VARCHAR(100) DEFAULT '' COMMENT '방문자 소속팀'"); } catch (e) {}
    }
    if (colNames.includes('visitor_rank') && !colNames.includes('rank')) {
      try { await query("ALTER TABLE security_log CHANGE COLUMN `visitor_rank` `rank` VARCHAR(50) DEFAULT '' COMMENT '방문자 직급'"); } catch (e) {}
    }
    if (colNames.includes('signature_data') && !colNames.includes('signature_date')) {
      try { await query("ALTER TABLE security_log CHANGE COLUMN `signature_data` `signature_date` VARCHAR(100) DEFAULT '' COMMENT '서명 완료 날짜시간'"); } catch (e) {}
    }

    // 2. 불필요 컬럼 삭제 (target_company 포함)
    const dropCols = ['target_company', 'ip_address', 'pledge_content', 'pledge_title', 'visit_date', 'materials_json', 'companions_json', 'agreed_terms', 'user_id', 'host_name', 'agreed_at', 'created_at'];
    for (const col of dropCols) {
      if (colNames.includes(col)) {
        try { await query(`ALTER TABLE security_log DROP COLUMN \`${col}\``); } catch (e) {}
      }
    }

    // 최신 컬럼 목록 재조회
    const currentCols = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'security_log'
    `);
    const freshColNames = (currentCols || []).map(c => String(c.COLUMN_NAME).toLowerCase());

    // 3. 필요한 신규/활성 컬럼 보장
    if (!freshColNames.includes('name')) try { await query("ALTER TABLE security_log ADD COLUMN `name` VARCHAR(100) NOT NULL DEFAULT '서약자' COMMENT '서약자 성명'"); } catch (e) {}
    if (!freshColNames.includes('division')) try { await query("ALTER TABLE security_log ADD COLUMN `division` VARCHAR(100) DEFAULT '' COMMENT '서약자 사업부'"); } catch (e) {}
    if (!freshColNames.includes('role')) try { await query("ALTER TABLE security_log ADD COLUMN `role` VARCHAR(50) DEFAULT '' COMMENT '서약자 권한/역할'"); } catch (e) {}
    if (!freshColNames.includes('site')) try { await query("ALTER TABLE security_log ADD COLUMN `site` VARCHAR(200) DEFAULT '' COMMENT '출입 현장명'"); } catch (e) {}
    if (!freshColNames.includes('purpose')) try { await query("ALTER TABLE security_log ADD COLUMN `purpose` VARCHAR(255) DEFAULT '' COMMENT '방문/출입 목적'"); } catch (e) {}
    if (!freshColNames.includes('visitor_phone')) try { await query("ALTER TABLE security_log ADD COLUMN `visitor_phone` VARCHAR(50) DEFAULT '' COMMENT '방문자 연락처'"); } catch (e) {}
    if (!freshColNames.includes('team')) try { await query("ALTER TABLE security_log ADD COLUMN `team` VARCHAR(100) DEFAULT '' COMMENT '방문자 소속팀'"); } catch (e) {}
    if (!freshColNames.includes('rank')) try { await query("ALTER TABLE security_log ADD COLUMN `rank` VARCHAR(50) DEFAULT '' COMMENT '방문자 직급'"); } catch (e) {}
    if (!freshColNames.includes('mdm_verified')) try { await query("ALTER TABLE security_log ADD COLUMN `mdm_verified` TINYINT(1) DEFAULT 0 COMMENT '보안앱 검수여부'"); } catch (e) {}
    if (!freshColNames.includes('gate_approved')) try { await query("ALTER TABLE security_log ADD COLUMN `gate_approved` TINYINT(1) DEFAULT 0 COMMENT '게이트 승인여부'"); } catch (e) {}
    if (!freshColNames.includes('doc_sec_verified')) try { await query("ALTER TABLE security_log ADD COLUMN `doc_sec_verified` TINYINT(1) DEFAULT 0 COMMENT '서류보안 확인여부'"); } catch (e) {}
    if (!freshColNames.includes('pre_check_verified')) try { await query("ALTER TABLE security_log ADD COLUMN `pre_check_verified` TINYINT(1) DEFAULT 0 COMMENT '사전점검 완료여부'"); } catch (e) {}
    if (!freshColNames.includes('pledge_terms')) try { await query("ALTER TABLE security_log ADD COLUMN `pledge_terms` TEXT COMMENT '보안서약 준수 약관 전문'"); } catch (e) {}
    if (!freshColNames.includes('signature_date')) try { await query("ALTER TABLE security_log ADD COLUMN `signature_date` VARCHAR(100) DEFAULT '' COMMENT '서명 완료 날짜시간'"); } catch (e) {}
    if (!freshColNames.includes('status')) try { await query("ALTER TABLE security_log ADD COLUMN `status` VARCHAR(50) DEFAULT '승인완료' COMMENT '서약 처리 상태'"); } catch (e) {}
  } catch (e) {}
  logColumnsEnsured = true;
}

/**
 * 보안서약(security_log) 생성 / 저장
 * - log_id: PASS-YYYY-000 형식 지원 (예: PASS-2026-001)
 * - signature_date: 서명 완료 날짜시간 문자열만 저장
 */
export async function createSecurityLog(data = {}) {
  await ensureLogColumns();

  const currentYear = new Date().getFullYear();
  let logId = String(data.log_id || data.id || '').trim();

  // PASS-YYYY-000 형식으로 자동 부여
  if (!logId || !logId.startsWith(`PASS-${currentYear}-`)) {
    try {
      const existing = await query("SELECT `log_id` FROM security_log WHERE `log_id` LIKE ?", [`PASS-${currentYear}-%`]);
      const num = (existing ? existing.length : 0) + 1;
      logId = `PASS-${currentYear}-${String(num).padStart(3, '0')}`;
    } catch (e) {
      logId = `PASS-${currentYear}-${String(Date.now()).slice(-3)}`;
    }
  }

  const name = String(data.name || data.user_name || data.visitorName || data.userName || '서약자');
  const division = String(data.division || '');
  const role = String(data.role || '일반');
  const site = String(data.site || data.siteName || '');
  const purpose = String(data.purpose || data.purposeType || data.customPurpose || '');
  const visitorPhone = String(data.visitor_phone || data.phone || data.visitorPhone || '');
  const team = String(data.team || data.visitor_team || data.visitorTeam || data.department || '');
  const rank = String(data.rank || data.visitor_rank || data.visitorRank || '');

  const docChecklist = data.docChecklist || {};
  const mdmVerified = (data.mdmVerified || data.mdm_verified) ? 1 : 0;
  const gateApproved = (docChecklist.gateApproved || data.gate_approved) ? 1 : 0;
  const docSecVerified = (docChecklist.docSecVerified || data.doc_sec_verified) ? 1 : 0;
  const preCheckVerified = (docChecklist.preCheckVerified || data.pre_check_verified) ? 1 : 0;

  const defaultTerms = "1. 본 서약자는 지정된 출입 장소 외 미인가 지역의 무단 출입을 금합니다.\n2. 사업장 내 보안 구역에서의 사진 촬영, 음성 녹음, 영상 촬영을 일체 금합니다.\n3. 출입 기간 중 취득한 사내 기술 및 자산 정보를 제3자에게 누설하지 않습니다.";
  const pledgeTerms = String(data.pledge_terms || data.pledgeTerms || defaultTerms);

  const nowFormatted = new Date().toLocaleString('ko-KR', { hour12: false });
  let signatureDate = String(data.signature_date || data.signatureDate || data.signedAt || nowFormatted).trim();
  if (signatureDate.startsWith('{') || signatureDate.startsWith('data:image')) {
    signatureDate = nowFormatted;
  }

  const status = String(data.status || '승인완료');

  try {
    const sql = `
      INSERT INTO security_log 
      (\`log_id\`, \`name\`, \`division\`, \`role\`, \`site\`, \`purpose\`, \`visitor_phone\`, \`team\`, \`rank\`, \`mdm_verified\`, \`gate_approved\`, \`doc_sec_verified\`, \`pre_check_verified\`, \`pledge_terms\`, \`signature_date\`, \`status\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`name\` = VALUES(\`name\`),
        \`division\` = VALUES(\`division\`),
        \`role\` = VALUES(\`role\`),
        \`site\` = VALUES(\`site\`),
        \`purpose\` = VALUES(\`purpose\`),
        \`visitor_phone\` = VALUES(\`visitor_phone\`),
        \`team\` = VALUES(\`team\`),
        \`rank\` = VALUES(\`rank\`),
        \`mdm_verified\` = VALUES(\`mdm_verified\`),
        \`gate_approved\` = VALUES(\`gate_approved\`),
        \`doc_sec_verified\` = VALUES(\`doc_sec_verified\`),
        \`pre_check_verified\` = VALUES(\`pre_check_verified\`),
        \`pledge_terms\` = VALUES(\`pledge_terms\`),
        \`signature_date\` = VALUES(\`signature_date\`),
        \`status\` = VALUES(\`status\`)
    `;

    await query(sql, [
      logId, name, division, role, site, purpose, visitorPhone, team, rank,
      mdmVerified, gateApproved, docSecVerified, preCheckVerified, pledgeTerms, signatureDate, status
    ]);
  } catch (err) {
    console.warn('Primary INSERT security_log error, trying fallback:', err.message);
    try {
      const fallbackSql = `
        INSERT INTO security_log 
        (\`log_id\`, \`site\`, \`status\`)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE \`site\` = VALUES(\`site\`)
      `;
      await query(fallbackSql, [logId, site, status]);
    } catch (e) {}
  }

  return { id: logId, log_id: logId, name, site, status: 'SUCCESS' };
}

/**
 * 보안서약 전체 / 검색 목록 조회 (모든 예약어 백틱 및 조회 예외 안전 처리)
 */
export async function getSecurityLogs(searchParams = {}) {
  await ensureLogColumns();
  let rows = [];

  try {
    let sql = 'SELECT `id`, `log_id`, `name`, `division`, `role`, `site`, `purpose`, `visitor_phone`, `team`, `rank`, `mdm_verified`, `gate_approved`, `doc_sec_verified`, `pre_check_verified`, `pledge_terms`, `signature_date`, `status` FROM security_log';
    const params = [];

    if (searchParams.userName || searchParams.name) {
      sql += ' WHERE `name` LIKE ?';
      params.push(`%${searchParams.userName || searchParams.name}%`);
    }

    sql += ' ORDER BY `id` DESC';

    rows = await query(sql, params);
  } catch (err) {
    console.warn('Fallback querying security_log with SELECT *:', err.message);
    try {
      rows = await query('SELECT * FROM security_log ORDER BY `id` DESC');
    } catch (e) {
      rows = [];
    }
  }

  return (rows || []).map(row => {
    const sName = row.name || row.user_name || row.visitorName || '';
    const sTeam = row.team || row.visitor_team || row.department || '';
    const sRank = row.rank || row.visitor_rank || '';
    const sSigDate = row.signature_date || row.signature_data || row.signedAt || row.agreed_at || row.created_at || '';

    return {
      id: row.log_id || row.id,
      log_id: row.log_id || row.id,
      name: sName,
      visitorName: sName,
      userName: sName,
      division: row.division || '',
      role: row.role || '일반',
      site: row.site || '',
      purpose: row.purpose || '',
      phone: row.visitor_phone || row.phone || '',
      visitorPhone: row.visitor_phone || row.phone || '',
      team: sTeam,
      department: sTeam,
      rank: sRank,
      mdmVerified: Boolean(row.mdm_verified),
      docChecklist: {
        gateApproved: Boolean(row.gate_approved),
        docSecVerified: Boolean(row.doc_sec_verified),
        preCheckVerified: Boolean(row.pre_check_verified)
      },
      pledgeTerms: row.pledge_terms || '',
      signature_date: sSigDate,
      signatureDate: sSigDate,
      signedAt: sSigDate,
      agreed_at: sSigDate,
      createdAt: sSigDate,
      status: row.status || '승인완료'
    };
  });
}

/**
 * 특정 보안서약 상세 조회
 */
export async function getSecurityLogById(logId) {
  await ensureLogColumns();
  const targetId = String(logId || '').trim();
  if (!targetId) return null;

  const isPureNumber = /^\d+$/.test(targetId);
  let row = null;

  try {
    const sql = isPureNumber
      ? 'SELECT `id`, `log_id`, `name`, `division`, `role`, `site`, `purpose`, `visitor_phone`, `team`, `rank`, `mdm_verified`, `gate_approved`, `doc_sec_verified`, `pre_check_verified`, `pledge_terms`, `signature_date`, `status` FROM security_log WHERE `log_id` = ? OR `id` = ? LIMIT 1'
      : 'SELECT `id`, `log_id`, `name`, `division`, `role`, `site`, `purpose`, `visitor_phone`, `team`, `rank`, `mdm_verified`, `gate_approved`, `doc_sec_verified`, `pre_check_verified`, `pledge_terms`, `signature_date`, `status` FROM security_log WHERE `log_id` = ? LIMIT 1';

    const params = isPureNumber ? [targetId, parseInt(targetId, 10)] : [targetId];
    const results = await query(sql, params);
    if (results && results.length > 0) row = results[0];
  } catch (e) {
    try {
      const results = await query('SELECT * FROM security_log WHERE `log_id` = ? LIMIT 1', [targetId]);
      if (results && results.length > 0) row = results[0];
    } catch (err) {}
  }

  if (!row) return null;

  const sName = row.name || row.user_name || row.visitorName || '';
  const sTeam = row.team || row.visitor_team || row.department || '';
  const sRank = row.rank || row.visitor_rank || '';
  const sSigDate = row.signature_date || row.signature_data || row.signedAt || row.agreed_at || row.created_at || '';

  return {
    id: row.log_id || row.id,
    log_id: row.log_id,
    name: sName,
    visitorName: sName,
    division: row.division,
    role: row.role,
    site: row.site,
    purpose: row.purpose,
    phone: row.visitor_phone || row.phone,
    team: sTeam,
    rank: sRank,
    mdmVerified: Boolean(row.mdm_verified),
    docChecklist: {
      gateApproved: Boolean(row.gate_approved),
      docSecVerified: Boolean(row.doc_sec_verified),
      preCheckVerified: Boolean(row.pre_check_verified)
    },
    pledgeTerms: row.pledge_terms,
    signature_date: sSigDate,
    signatureDate: sSigDate,
    signedAt: sSigDate,
    status: row.status
  };
}

/**
 * 보안서약 삭제 (문자열 log_id는 `log_id` = ? 조건으로만 조회하여 INT 캐스팅 에러 예방)
 */
export async function deleteSecurityLog(logId) {
  await ensureLogColumns();
  const targetId = String(logId || '').trim();
  if (!targetId) return false;

  const isPureNumber = /^\d+$/.test(targetId);
  const sql = isPureNumber
    ? 'DELETE FROM security_log WHERE `log_id` = ? OR `id` = ?'
    : 'DELETE FROM security_log WHERE `log_id` = ?';

  const params = isPureNumber ? [targetId, parseInt(targetId, 10)] : [targetId];

  try {
    const result = await query(sql, params);
    return (result && result.affectedRows > 0);
  } catch (err) {
    console.warn('Primary delete error, fallback log_id DELETE:', err.message);
    try {
      const result = await query('DELETE FROM security_log WHERE `log_id` = ?', [targetId]);
      return (result && result.affectedRows > 0);
    } catch (e) {
      return false;
    }
  }
}
