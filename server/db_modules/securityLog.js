import { query } from '../mysql.js';

/**
 * 사업장명 포맷팅 헬퍼
 */
function formatSecLogSiteName(rawSite, rawAddress = '') {
  if (!rawSite) return '';
  let siteStr = String(rawSite).trim();
  let addrStr = String(rawAddress).trim();

  if (siteStr.includes('(') && siteStr.endsWith(')')) {
    const match = siteStr.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      siteStr = match[1].trim();
      if (!addrStr) addrStr = match[2].trim();
    }
  }

  let finalSecName = siteStr;
  if (addrStr && !siteStr.includes(addrStr)) {
    finalSecName = `${siteStr} ${addrStr}`;
  }

  return finalSecName.trim();
}/**
 * DB Row -> 프론트엔드 Pledge 객체 변환 헬퍼
 */
function mapRowToPledgeObject(row) {
  const sName = row.name || row.user_name || row.visitorName || '';
  const sTeam = row.team || row.visitor_team || row.department || '';
  const sRank = row.rank || row.visitor_rank || '';
  const sSigDate = row.signature_date || row.signature_data || row.signedAt || row.agreed_at || row.created_at || '';
  const sSiteName = formatSecLogSiteName(row.site_name || row.site);

  return {
    id: row.log_id || row.id,
    log_id: row.log_id || row.id,
    parent_log_id: row.parent_log_id || '',
    parentLogId: row.parent_log_id || '',
    parentPledgeId: row.parent_log_id || '',
    name: sName,
    visitorName: sName,
    userName: sName,
    division: row.division || '',
    role: row.role || '일반',
    site_name: sSiteName,
    siteName: sSiteName,
    site: sSiteName,
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
    status: row.status || '승인완료',
    companions: []
  };
}

/**
 * 보안서약(security_log) 생성 / 저장
 * - parent_log_id 컬럼에 최초 서약 ID 저장 (동행 서약 연결)
 */
export async function createSecurityLog(data = {}) {

  const currentYear = new Date().getFullYear();
  let logId = String(data.log_id || data.id || '').trim();

  if (!logId || !logId.startsWith(`PASS-${currentYear}-`)) {
    try {
      const existing = await query("SELECT `log_id` FROM security_log WHERE `log_id` LIKE ?", [`PASS-${currentYear}-%`]);
      const num = (existing ? existing.length : 0) + 1;
      logId = `PASS-${currentYear}-${String(num).padStart(3, '0')}`;
    } catch (e) {
      logId = `PASS-${currentYear}-${String(Date.now()).slice(-3)}`;
    }
  }

  const parentLogId = String(data.parent_log_id || data.parentLogId || data.parentPledgeId || '').trim();
  const name = String(data.name || data.user_name || data.visitorName || data.userName || '서약자');
  const division = String(data.division || '');
  const role = String(data.role || '일반');
  const siteName = formatSecLogSiteName(
    data.site_name || data.siteName || data.site,
    data.address || data.siteAddress || data.site_address
  );
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
      (\`log_id\`, \`parent_log_id\`, \`name\`, \`division\`, \`role\`, \`site_name\`, \`purpose\`, \`visitor_phone\`, \`team\`, \`rank\`, \`mdm_verified\`, \`gate_approved\`, \`doc_sec_verified\`, \`pre_check_verified\`, \`pledge_terms\`, \`signature_date\`, \`status\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`parent_log_id\` = VALUES(\`parent_log_id\`),
        \`name\` = VALUES(\`name\`),
        \`division\` = VALUES(\`division\`),
        \`role\` = VALUES(\`role\`),
        \`site_name\` = VALUES(\`site_name\`),
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
      logId, parentLogId, name, division, role, siteName, purpose, visitorPhone, team, rank,
      mdmVerified, gateApproved, docSecVerified, preCheckVerified, pledgeTerms, signatureDate, status
    ]);
  } catch (err) {
    console.warn('Primary INSERT security_log error, trying fallback:', err.message);
    try {
      const fallbackSql = `
        INSERT INTO security_log 
        (\`log_id\`, \`parent_log_id\`, \`site_name\`, \`status\`)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          \`parent_log_id\` = VALUES(\`parent_log_id\`),
          \`site_name\` = VALUES(\`site_name\`)
      `;
      await query(fallbackSql, [logId, parentLogId, siteName, status]);
    } catch (e) { }
  }

  return { id: logId, log_id: logId, parent_log_id: parentLogId, name, site_name: siteName, site: siteName, status: 'SUCCESS' };
}

/**
 * 보안서약 전체 목록 조회 (parent_log_id 기준으로 동행자를 최초 원본 서약 카드 내부에 자동 그룹화)
 */
export async function getSecurityLogs(searchParams = {}) {
  let rows = [];

  try {
    let sql = 'SELECT `id`, `log_id`, `parent_log_id`, `name`, `division`, `role`, `site_name`, `purpose`, `visitor_phone`, `team`, `rank`, `mdm_verified`, `gate_approved`, `doc_sec_verified`, `pre_check_verified`, `pledge_terms`, `signature_date`, `status` FROM security_log';
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

  // 1. 최초 서약(Primary Logs)과 동행 서약(Companion Logs) 분리 그룹핑
  const primaryMap = new Map();
  const companionChildRows = [];

  (rows || []).forEach(row => {
    const parentId = String(row.parent_log_id || '').trim();
    if (parentId) {
      companionChildRows.push(row);
    } else {
      const pObj = mapRowToPledgeObject(row);
      primaryMap.set(String(pObj.id), pObj);
    }
  });

  // 2. 동행 서약 레코드를 최초 원본 서약 카드의 companions 배열에 중접 매핑
  companionChildRows.forEach(cRow => {
    const parentId = String(cRow.parent_log_id || '').trim();
    const parentPledge = primaryMap.get(parentId);

    const sName = cRow.name || cRow.user_name || cRow.visitorName || '';
    const sTeam = cRow.team || cRow.visitor_team || cRow.department || '';
    const sRank = cRow.rank || cRow.visitor_rank || '';
    const sSigDate = cRow.signature_date || cRow.signature_data || cRow.signedAt || cRow.agreed_at || cRow.created_at || '';

    const companionObj = {
      id: String(cRow.log_id || cRow.id),
      visitorName: sName,
      name: sName,
      phone: cRow.visitor_phone || cRow.phone || '',
      visitorPhone: cRow.visitor_phone || cRow.phone || '',
      team: sTeam,
      department: sTeam,
      rank: sRank,
      status: cRow.status || '서약전',
      mdmVerified: Boolean(cRow.mdm_verified),
      parentPledgeId: parentId,
      parent_log_id: parentId,
      pledgedAt: sSigDate || null,
      createdAt: sSigDate || null
    };

    if (parentPledge) {
      const exists = (parentPledge.companions || []).some(c => String(c.id) === String(companionObj.id) || (c.visitorName === companionObj.visitorName && c.phone === companionObj.phone));
      if (!exists) {
        parentPledge.companions.push(companionObj);
      }
    } else {
      // 상위 서약서가 비어있는 예외 경우 독립 카드로 표시
      const standalone = mapRowToPledgeObject(cRow);
      primaryMap.set(String(standalone.id), standalone);
    }
  });

  return Array.from(primaryMap.values());
}

/**
 * 특정 보안서약 상세 조회
 */
export async function getSecurityLogById(logId) {
  const targetId = String(logId || '').trim();
  if (!targetId) return null;

  const isPureNumber = /^\d+$/.test(targetId);
  let row = null;

  try {
    const sql = isPureNumber
      ? 'SELECT `id`, `log_id`, `parent_log_id`, `name`, `division`, `role`, `site_name`, `purpose`, `visitor_phone`, `team`, `rank`, `mdm_verified`, `gate_approved`, `doc_sec_verified`, `pre_check_verified`, `pledge_terms`, `signature_date`, `status` FROM security_log WHERE `log_id` = ? OR `id` = ? LIMIT 1'
      : 'SELECT `id`, `log_id`, `parent_log_id`, `name`, `division`, `role`, `site_name`, `purpose`, `visitor_phone`, `team`, `rank`, `mdm_verified`, `gate_approved`, `doc_sec_verified`, `pre_check_verified`, `pledge_terms`, `signature_date`, `status` FROM security_log WHERE `log_id` = ? LIMIT 1';

    const params = isPureNumber ? [targetId, parseInt(targetId, 10)] : [targetId];
    const results = await query(sql, params);
    if (results && results.length > 0) row = results[0];
  } catch (e) {
    try {
      const results = await query('SELECT * FROM security_log WHERE `log_id` = ? LIMIT 1', [targetId]);
      if (results && results.length > 0) row = results[0];
    } catch (err) { }
  }

  if (!row) return null;
  return mapRowToPledgeObject(row);
}

/**
 * 보안서약 수정
 */
export async function updateSecurityLog(logId, data) {
  const targetId = String(logId || '').trim();
  if (!targetId) return false;

  const isPureNumber = /^\d+$/.test(targetId);
  const siteName = formatSecLogSiteName(
    data.site_name || data.siteName || data.site,
    data.address || data.siteAddress || data.site_address
  );

  const sql = isPureNumber
    ? 'UPDATE security_log SET `site_name` = COALESCE(?, `site_name`), `purpose` = COALESCE(?, `purpose`), `status` = COALESCE(?, `status`) WHERE `log_id` = ? OR `id` = ?'
    : 'UPDATE security_log SET `site_name` = COALESCE(?, `site_name`), `purpose` = COALESCE(?, `purpose`), `status` = COALESCE(?, `status`) WHERE `log_id` = ?';

  const params = isPureNumber
    ? [siteName || null, data.purpose || null, data.status || null, targetId, parseInt(targetId, 10)]
    : [siteName || null, data.purpose || null, data.status || null, targetId];

  try {
    const result = await query(sql, params);
    return (result && result.affectedRows > 0);
  } catch (e) {
    return false;
  }
}

/**
 * 보안서약 삭제
 */
export async function deleteSecurityLog(logId) {
  const targetId = String(logId || '').trim();
  if (!targetId) return false;

  const isPureNumber = /^\d+$/.test(targetId);
  const sql = isPureNumber
    ? 'DELETE FROM security_log WHERE `log_id` = ? OR `id` = ? OR `parent_log_id` = ?'
    : 'DELETE FROM security_log WHERE `log_id` = ? OR `parent_log_id` = ?';

  const params = isPureNumber ? [targetId, parseInt(targetId, 10), targetId] : [targetId, targetId];

  try {
    const result = await query(sql, params);
    return (result && result.affectedRows > 0);
  } catch (e) {
    try {
      const result = await query('DELETE FROM security_log WHERE `log_id` = ? OR `parent_log_id` = ?', [targetId, targetId]);
      return (result && result.affectedRows > 0);
    } catch (err) {
      return false;
    }
  }
}
