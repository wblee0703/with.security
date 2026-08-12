import { query } from '../mysql.js';

let siteColumnsEnsured = false;

/**
 * security_site 테이블 컬럼 자동 정리 및 마이그레이션 (id, type, name, address 컬럼 유지)
 */
async function ensureSiteColumns() {
  if (siteColumnsEnsured) return;
  try {
    const existingColumns = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'security_site'
    `);
    const colNames = (existingColumns || []).map(c => String(c.COLUMN_NAME).toLowerCase());

    // manager, contact, status, created_at 컬럼이 존재할 경우 삭제
    if (colNames.includes('manager')) {
      try { await query("ALTER TABLE security_site DROP COLUMN manager"); } catch (e) {}
    }
    if (colNames.includes('contact')) {
      try { await query("ALTER TABLE security_site DROP COLUMN contact"); } catch (e) {}
    }
    if (colNames.includes('status')) {
      try { await query("ALTER TABLE security_site DROP COLUMN status"); } catch (e) {}
    }
    if (colNames.includes('created_at')) {
      try { await query("ALTER TABLE security_site DROP COLUMN created_at"); } catch (e) {}
    }

    // type, address 컬럼이 없을 경우 생성 (기본값: 보안어플O)
    if (!colNames.includes('type')) {
      await query("ALTER TABLE security_site ADD COLUMN type VARCHAR(100) DEFAULT '보안어플O' COMMENT '분류'");
    }
    if (!colNames.includes('address')) {
      await query("ALTER TABLE security_site ADD COLUMN address VARCHAR(255) DEFAULT '' COMMENT '사업장 위치'");
    }
  } catch (e) {}
  siteColumnsEnsured = true;
}

/**
 * 현장 목록 조회 (security_site - id, type, name, address)
 * 비어있는 경우 site-000 형식 샘플 자동 생성 (보안어플O / 보안어플X)
 */
export async function getSecuritySites() {
  await ensureSiteColumns();
  const sql = 'SELECT id, type, name, address FROM security_site ORDER BY id ASC';
  let sites = await query(sql);

  if (!Array.isArray(sites) || sites.length === 0) {
    try {
      await createSecuritySite({ id: 'site-001', type: '보안어플O', name: '삼성전자 평택캠퍼스 P4 라인', address: '경기도 평택시 고덕면 삼성로 114' });
      await createSecuritySite({ id: 'site-002', type: '보안어플O', name: 'SK하이닉스 이천 M16 공장', address: '경기도 이천시 부발읍 경충대로 2091' });
      await createSecuritySite({ id: 'site-003', type: '보안어플X', name: '위드텍 본사 통합관제센터', address: '대전광역시 유성구 테크노2로 42' });
      sites = await query(sql);
    } catch (e) {
      console.warn('Auto site seed warning:', e.message);
    }
  }

  return (sites || []).map(s => ({
    id: String(s.id || '').toLowerCase(),
    type: s.type || '보안어플O',
    name: s.name || '',
    address: s.address || ''
  }));
}

/**
 * 특정 현장 상세 조회
 */
export async function getSecuritySiteById(id) {
  await ensureSiteColumns();
  const sql = 'SELECT id, type, name, address FROM security_site WHERE id = ? LIMIT 1';
  const results = await query(sql, [id]);
  if (results.length > 0) {
    const s = results[0];
    return {
      id: String(s.id || '').toLowerCase(),
      type: s.type || '보안어플O',
      name: s.name || '',
      address: s.address || ''
    };
  }
  return null;
}

/**
 * 현장 등록 / 수정 (site-000 형식 ID 지원, type: 보안어플O / 보안어플X)
 */
export async function createSecuritySite(data = {}) {
  await ensureSiteColumns();

  let siteId = String(data.id || '').trim().toLowerCase();
  if (!siteId || siteId === 'site-new' || siteId === 'new') {
    const existing = await query('SELECT id FROM security_site');
    const num = (existing ? existing.length : 0) + 1;
    siteId = `site-${String(num).padStart(3, '0')}`;
  } else if (!siteId.startsWith('site-')) {
    siteId = `site-${siteId.replace(/[^0-9]/g, '').padStart(3, '0') || '001'}`;
  }

  const type = String(data.type || '보안어플O').trim();
  const name = String(data.name || '').trim();
  const address = String(data.address || '').trim();

  const sql = `
    INSERT INTO security_site (id, type, name, address)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      type = VALUES(type),
      name = VALUES(name),
      address = VALUES(address)
  `;

  await query(sql, [siteId, type, name, address]);
  return { id: siteId, type, name, address };
}

/**
 * 현장 삭제
 */
export async function deleteSecuritySite(id) {
  await ensureSiteColumns();
  const sql = 'DELETE FROM security_site WHERE id = ? OR id = ?';
  const result = await query(sql, [id, String(id).toLowerCase()]);
  return result.affectedRows > 0;
}
