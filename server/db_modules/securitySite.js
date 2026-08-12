import { query } from '../mysql.js';



/**
 * 현장 목록 조회 (security_site - id, type, name, address, site_name)
 */
export async function getSecuritySites() {
  const sql = 'SELECT id, type, name, address, site_name FROM security_site ORDER BY id ASC';
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

  return (sites || []).map(s => {
    const sName = String(s.name || '').trim();
    const sAddr = String(s.address || '').trim();
    const fullSiteName = s.site_name || (sAddr ? `${sName} ${sAddr}` : sName);
    return {
      id: String(s.id || '').toLowerCase(),
      type: s.type || '보안어플O',
      name: sName,
      address: sAddr,
      site_name: fullSiteName,
      siteName: fullSiteName
    };
  });
}

/**
 * 특정 현장 상세 조회
 */
export async function getSecuritySiteById(id) {
  const sql = 'SELECT id, type, name, address, site_name FROM security_site WHERE id = ? LIMIT 1';
  const results = await query(sql, [id]);
  if (results && results.length > 0) {
    const s = results[0];
    const sName = String(s.name || '').trim();
    const sAddr = String(s.address || '').trim();
    const fullSiteName = s.site_name || (sAddr ? `${sName} ${sAddr}` : sName);
    return {
      id: String(s.id || '').toLowerCase(),
      type: s.type || '보안어플O',
      name: sName,
      address: sAddr,
      site_name: fullSiteName,
      siteName: fullSiteName
    };
  }
  return null;
}

/**
 * 현장 등록 / 수정 (site_name 컬럼에 'name address' 형태로 기록)
 */
export async function createSecuritySite(data = {}) {

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
  const siteName = String(data.site_name || data.siteName || (address ? `${name} ${address}` : name)).trim();

  const sql = `
    INSERT INTO security_site (id, type, name, address, site_name)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      type = VALUES(type),
      name = VALUES(name),
      address = VALUES(address),
      site_name = VALUES(site_name)
  `;

  await query(sql, [siteId, type, name, address, siteName]);
  return { id: siteId, type, name, address, site_name: siteName, siteName };
}

/**
 * 현장 삭제
 */
export async function deleteSecuritySite(id) {
  const sql = 'DELETE FROM security_site WHERE id = ? OR id = ?';
  const result = await query(sql, [id, String(id).toLowerCase()]);
  return result.affectedRows > 0;
}
