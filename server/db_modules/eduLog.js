import { query } from '../mysql.js';

let migrationDone = false;
async function ensureEduLogTable() {
  if (migrationDone) return;
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS edu_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        edu_id VARCHAR(100) UNIQUE COMMENT '고유 교육 로그 ID (EDU-타임스탬프-난수)',
        user_id VARCHAR(100) DEFAULT '' COMMENT '사용자 아이디 (username)',
        name VARCHAR(100) NOT NULL COMMENT '이수자 성명',
        division VARCHAR(100) DEFAULT '' COMMENT '이수자 사업부',
        team VARCHAR(100) DEFAULT '' COMMENT '이수자 소속팀',
        \`rank\` VARCHAR(50) DEFAULT '' COMMENT '이수자 직급',
        category VARCHAR(100) DEFAULT '법정' COMMENT '교육 구분 (SKHynix, Samsung, LGD, 법정, 기타 등)',
        title VARCHAR(200) NOT NULL COMMENT '교육 과정명',
        completion_date DATE NOT NULL COMMENT '교육 수료일 (이수일)',
        expiry_date DATE NOT NULL COMMENT '교육 만료일',
        memo VARCHAR(255) DEFAULT '' COMMENT '비고 / 수료증 번호 / 메모',
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
 * 교육수료일지(edu_log) 생성 및 업데이트
 */
export async function createEduLog(data = {}) {
  await ensureEduLogTable();

  let rawId = String(data.eduId || data.edu_id || data.id || '').trim();
  let eduId;
  if (/^EDU-\d{10,15}-\d{3}$/.test(rawId)) {
    eduId = rawId;
  } else {
    const digits = rawId.replace(/[^0-9]/g, '');
    let ts = digits.length >= 10 ? digits.slice(0, 13) : String(Date.now());
    if (ts.length < 13) ts = String(Date.now());
    const rand = Math.floor(100 + Math.random() * 900);
    eduId = `EDU-${ts}-${rand}`;
  }

  const userId = String(data.userId || data.user_id || data.username || data.authorUsername || '');
  const name = String(data.name || data.authorName || data.userName || '사용자');
  const division = String(data.division || data.authorDivision || '');
  const team = String(data.team || data.authorTeam || '');
  const rank = String(data.rank || data.authorRank || '대리');
  const category = String(data.category || '법정');
  const title = String(data.title || '안전보건 교육');
  const completionDate = String(data.completionDate || data.completion_date || new Date().toISOString().split('T')[0]);
  const expiryDate = String(data.expiryDate || data.expiry_date || completionDate);
  const memo = String(data.memo || '');

  try {
    // 중복 방지: 동일 사용자, 동일 교육명, 동일 수료일 레코드가 이미 존재하는지 확인
    const existRows = await query(
      "SELECT id, edu_id FROM edu_log WHERE (`user_id` = ? OR `name` = ?) AND `title` = ? AND `completion_date` = ? LIMIT 1",
      [userId || name, name || userId, title, completionDate]
    );

    if (Array.isArray(existRows) && existRows.length > 0) {
      eduId = existRows[0].edu_id;
      if (!/^EDU-\d{10,15}-\d{3}$/.test(eduId)) {
        const digits = eduId.replace(/[^0-9]/g, '');
        let ts = digits.length >= 10 ? digits.slice(0, 13) : String(Date.now());
        if (ts.length < 13) ts = String(Date.now());
        eduId = `EDU-${ts}-${Math.floor(100 + Math.random() * 900)}`;
      }
      await query(`
        UPDATE edu_log SET
          \`edu_id\` = ?,
          \`user_id\` = ?,
          \`name\` = ?,
          \`division\` = ?,
          \`team\` = ?,
          \`rank\` = ?,
          \`category\` = ?,
          \`title\` = ?,
          \`completion_date\` = ?,
          \`expiry_date\` = ?,
          \`memo\` = ?,
          \`updated_at\` = CURRENT_TIMESTAMP
        WHERE \`id\` = ?
      `, [eduId, userId, name, division, team, rank, category, title, completionDate, expiryDate, memo, existRows[0].id]);
      return { eduId, edu_id: eduId, id: eduId, userId, name, division, team, rank, category, title, completionDate, expiryDate, memo };
    }

    const sql = `
      INSERT INTO edu_log 
      (\`edu_id\`, \`user_id\`, \`name\`, \`division\`, \`team\`, \`rank\`, \`category\`, \`title\`, \`completion_date\`, \`expiry_date\`, \`memo\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`user_id\` = VALUES(\`user_id\`),
        \`name\` = VALUES(\`name\`),
        \`division\` = VALUES(\`division\`),
        \`team\` = VALUES(\`team\`),
        \`rank\` = VALUES(\`rank\`),
        \`category\` = VALUES(\`category\`),
        \`title\` = VALUES(\`title\`),
        \`completion_date\` = VALUES(\`completion_date\`),
        \`expiry_date\` = VALUES(\`expiry_date\`),
        \`memo\` = VALUES(\`memo\`),
        \`updated_at\` = CURRENT_TIMESTAMP
    `;
    await query(sql, [eduId, userId, name, division, team, rank, category, title, completionDate, expiryDate, memo]);
    return { eduId, edu_id: eduId, id: eduId, userId, name, division, team, rank, category, title, completionDate, expiryDate, memo };
  } catch (e) {
    return { eduId, edu_id: eduId, id: eduId, userId, name, division, team, rank, category, title, completionDate, expiryDate, memo };
  }
}

/**
 * 교육수료일지(edu_log) 목록 조회
 */
export async function getEduLogs(filter = {}) {
  await ensureEduLogTable();

  try {
    let sql = 'SELECT * FROM edu_log WHERE 1=1';
    const params = [];

    if (filter.userId || filter.user_id || filter.username) {
      sql += ' AND (`user_id` = ? OR `name` = ?)';
      params.push(filter.userId || filter.user_id || filter.username, filter.name || filter.userId || filter.username);
    } else if (filter.name) {
      sql += ' AND `name` = ?';
      params.push(filter.name);
    }

    if (filter.category && filter.category !== '전체') {
      sql += ' AND `category` = ?';
      params.push(filter.category);
    }

    sql += ' ORDER BY completion_date DESC, id DESC';
    const rows = await query(sql, params);
    if (!Array.isArray(rows)) return [];
    return rows.map(r => ({
      id: r.edu_id || r.id,
      eduId: r.edu_id,
      edu_id: r.edu_id,
      userId: r.user_id,
      name: r.name,
      division: r.division,
      team: r.team,
      rank: r.rank,
      category: r.category,
      title: r.title,
      completionDate: r.completion_date ? (typeof r.completion_date === 'string' ? r.completion_date.split('T')[0] : r.completion_date.toISOString().split('T')[0]) : '',
      expiryDate: r.expiry_date ? (typeof r.expiry_date === 'string' ? r.expiry_date.split('T')[0] : r.expiry_date.toISOString().split('T')[0]) : '',
      memo: r.memo || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  } catch (e) {
    return [];
  }
}

/**
 * 교육수료일지(edu_log) 단건 조회
 */
export async function getEduLogById(eduId) {
  await ensureEduLogTable();
  try {
    const isNum = /^\d+$/.test(String(eduId || '').trim());
    const sql = isNum ? 'SELECT * FROM edu_log WHERE edu_id = ? OR id = ? LIMIT 1' : 'SELECT * FROM edu_log WHERE edu_id = ? LIMIT 1';
    const params = isNum ? [eduId, Number(eduId)] : [eduId];
    const rows = await query(sql, params);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.edu_id || r.id,
      eduId: r.edu_id,
      edu_id: r.edu_id,
      userId: r.user_id,
      name: r.name,
      division: r.division,
      team: r.team,
      rank: r.rank,
      category: r.category,
      title: r.title,
      completionDate: r.completion_date ? (typeof r.completion_date === 'string' ? r.completion_date.split('T')[0] : r.completion_date.toISOString().split('T')[0]) : '',
      expiryDate: r.expiry_date ? (typeof r.expiry_date === 'string' ? r.expiry_date.split('T')[0] : r.expiry_date.toISOString().split('T')[0]) : '',
      memo: r.memo || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  } catch (e) {
    return null;
  }
}

/**
 * 교육수료일지(edu_log) 업데이트
 */
export async function updateEduLog(eduId, data = {}) {
  await ensureEduLogTable();
  return createEduLog({ ...data, eduId });
}

/**
 * 교육수료일지(edu_log) 삭제 (ID 및 제목/수료일 기준 철저한 정리)
 */
export async function deleteEduLog(eduId, extraQuery = {}) {
  await ensureEduLogTable();
  try {
    const title = String(extraQuery.title || '').trim();
    const completionDate = String(extraQuery.completionDate || extraQuery.completion_date || '').trim();
    const userId = String(extraQuery.userId || extraQuery.user_id || extraQuery.name || '').trim();
    const isNum = /^\d+$/.test(String(eduId || '').trim());

    if (title && completionDate) {
      if (isNum) {
        const res = await query(
          'DELETE FROM edu_log WHERE edu_id = ? OR id = ? OR ((user_id = ? OR name = ?) AND title = ? AND completion_date = ?)',
          [eduId, Number(eduId), userId, userId, title, completionDate]
        );
        return res && res.affectedRows > 0;
      } else {
        const res = await query(
          'DELETE FROM edu_log WHERE edu_id = ? OR ((user_id = ? OR name = ?) AND title = ? AND completion_date = ?)',
          [eduId, userId, userId, title, completionDate]
        );
        return res && res.affectedRows > 0;
      }
    } else {
      if (isNum) {
        const res = await query('DELETE FROM edu_log WHERE edu_id = ? OR id = ?', [eduId, Number(eduId)]);
        return res && res.affectedRows > 0;
      } else {
        const res = await query('DELETE FROM edu_log WHERE edu_id = ?', [eduId]);
        return res && res.affectedRows > 0;
      }
    }
  } catch (e) {
    console.error('deleteEduLog error:', e.message);
    return false;
  }
}
