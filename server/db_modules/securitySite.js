import { query } from '../mysql.js';

let migrationChecked = false;
async function ensureSiteColumns() {
  if (migrationChecked) return;
  try {
    // Add app_name and app_url columns if not present
    await query(`
      ALTER TABLE security_site 
      ADD COLUMN IF NOT EXISTS app_name VARCHAR(100) DEFAULT '' COMMENT '연동 모바일 보안 어플명',
      ADD COLUMN IF NOT EXISTS app_url TEXT COMMENT '연동 모바일 보안 어플 링크/스킴'
    `).catch(async () => {
      // Fallback for MySQL versions without IF NOT EXISTS in ALTER TABLE
      try {
        await query(`ALTER TABLE security_site ADD COLUMN app_name VARCHAR(100) DEFAULT '' COMMENT '연동 모바일 보안 어플명'`);
      } catch (e) {}
      try {
        await query(`ALTER TABLE security_site ADD COLUMN app_url TEXT COMMENT '연동 모바일 보안 어플 링크/스킴'`);
      } catch (e) {}
    });
    migrationChecked = true;
  } catch (err) {
    // Ignore migration error if already exists or offline
  }
}

/**
 * 사업장(현장) 목록 조회 (security_site)
 */
export async function getSecuritySites() {
  await ensureSiteColumns();

  const sql = 'SELECT id, type, name, address, site_name, app_name, app_url FROM security_site ORDER BY id ASC';
  let results;
  try {
    results = await query(sql);
  } catch (err) {
    // If table does not exist or column error, fallback to basic query
    results = await query('SELECT id, type, name, address, site_name FROM security_site ORDER BY id ASC').catch(() => []);
  }

  // 기본 사업장이 하나도 없으면 자동 초기 생성(Seed Data)
  if (!results || results.length === 0) {
    try {
      await createSecuritySite({
        id: 'site-001',
        type: '보안어플O',
        name: '삼성전자 평택캠퍼스 P4 라인',
        address: '경기도 평택시 고덕면 삼성로 114',
        appName: '삼성 Knox / MDM 모바일 보안',
        appUrl: 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.sec.knox.app;end'
      });
      await createSecuritySite({
        id: 'site-002',
        type: '보안어플O',
        name: 'SK하이닉스 이천 M16 공장',
        address: '경기도 이천시 부발읍 경충대로 2091',
        appName: 'SK하이닉스 SSM',
        appUrl: 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.skhynix.ssm;end'
      });
      await createSecuritySite({
        id: 'site-003',
        type: '보안어플X',
        name: '위드텍 본사 통합관제센터',
        address: '대전광역시 유성구 테크노2로 42',
        appName: '',
        appUrl: ''
      });
      results = await query(sql).catch(() => []);
    } catch (e) {
      console.warn('Auto site seed warning:', e.message);
    }
  }

  return (results || []).map(s => {
    const sName = String(s.name || '').trim();
    const sAddr = String(s.address || '').trim();
    const fullSiteName = s.site_name || (sAddr ? `${sName} ${sAddr}` : sName);
    const appName = String(s.app_name || s.appName || '').trim();
    const appUrl = String(s.app_url || s.appUrl || '').trim();

    return {
      id: String(s.id || '').toLowerCase(),
      type: s.type || '보안어플O',
      name: sName,
      address: sAddr,
      site_name: fullSiteName,
      siteName: fullSiteName,
      appName: appName,
      app_name: appName,
      appUrl: appUrl,
      app_url: appUrl
    };
  });
}

/**
 * 특정 현장 상세 조회
 */
export async function getSecuritySiteById(id) {
  await ensureSiteColumns();

  const sql = 'SELECT id, type, name, address, site_name, app_name, app_url FROM security_site WHERE id = ? LIMIT 1';
  let results;
  try {
    results = await query(sql, [id]);
  } catch (e) {
    results = await query('SELECT id, type, name, address, site_name FROM security_site WHERE id = ? LIMIT 1', [id]).catch(() => []);
  }

  if (results && results.length > 0) {
    const s = results[0];
    const sName = String(s.name || '').trim();
    const sAddr = String(s.address || '').trim();
    const fullSiteName = s.site_name || (sAddr ? `${sName} ${sAddr}` : sName);
    const appName = String(s.app_name || s.appName || '').trim();
    const appUrl = String(s.app_url || s.appUrl || '').trim();

    return {
      id: String(s.id || '').toLowerCase(),
      type: s.type || '보안어플O',
      name: sName,
      address: sAddr,
      site_name: fullSiteName,
      siteName: fullSiteName,
      appName: appName,
      app_name: appName,
      appUrl: appUrl,
      app_url: appUrl
    };
  }
  return null;
}

/**
 * 현장 등록 / 수정 (site_name 및 app_name, app_url 컬럼 함께 저장)
 */
export async function createSecuritySite(data = {}) {
  await ensureSiteColumns();

  let siteId = String(data.id || '').trim().toLowerCase();
  if (!siteId || siteId === 'site-new' || siteId === 'new') {
    const existing = await query('SELECT id FROM security_site').catch(() => []);
    const num = (existing ? existing.length : 0) + 1;
    siteId = `site-${String(num).padStart(3, '0')}`;
  } else if (!siteId.startsWith('site-')) {
    siteId = `site-${siteId.replace(/[^0-9]/g, '').padStart(3, '0') || '001'}`;
  }

  const type = String(data.type || '보안어플O').trim();
  const name = String(data.name || '').trim();
  const address = String(data.address || '').trim();
  const siteName = String(data.site_name || data.siteName || (address ? `${name} ${address}` : name)).trim();
  const appName = String(data.app_name || data.appName || '').trim();
  const appUrl = String(data.app_url || data.appUrl || '').trim();

  const sql = `
    INSERT INTO security_site (id, type, name, address, site_name, app_name, app_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      type = VALUES(type),
      name = VALUES(name),
      address = VALUES(address),
      site_name = VALUES(site_name),
      app_name = VALUES(app_name),
      app_url = VALUES(app_url)
  `;

  try {
    await query(sql, [siteId, type, name, address, siteName, appName, appUrl]);
  } catch (err) {
    // Fallback in case columns were not migrated
    const fallbackSql = `
      INSERT INTO security_site (id, type, name, address, site_name)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        type = VALUES(type),
        name = VALUES(name),
        address = VALUES(address),
        site_name = VALUES(site_name)
    `;
    await query(fallbackSql, [siteId, type, name, address, siteName]);
  }

  return {
    id: siteId,
    type,
    name,
    address,
    site_name: siteName,
    siteName,
    app_name: appName,
    appName,
    app_url: appUrl,
    appUrl
  };
}

/**
 * 현장 삭제
 */
export async function deleteSecuritySite(id) {
  const sql = 'DELETE FROM security_site WHERE id = ? OR id = ?';
  const result = await query(sql, [id, String(id).toLowerCase()]);
  return result.affectedRows > 0;
}
