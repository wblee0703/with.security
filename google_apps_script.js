/**
 * ==============================================================================
 * Withsharing_DB - 구글 스프레드시트 데이터베이스 전용 Apps Script
 * ==============================================================================
 * 
 * [MySQL 데이터베이스 스키마와 100% 완벽 동기화 버전]
 * 1. 생성하신 'Withsharing_DB' 구글 스프레드시트 열기
 * 2. 상단 메뉴 [확장 프로그램] > [Apps Script] 클릭
 * 3. 기존 코드를 모두 지우고 이 파일의 전체 코드를 그대로 붙여넣기
 * 4. 상단 툴바의 함수 선택 목록에서 'syncDatabaseHeaders' (또는 'initDatabase') 선택 후 [실행] 클릭
 *    -> 필요한 모든 탭(users, sites, work_logs, security_logs 등)의 컬럼이
 *       MySQL 테이블 컬럼과 100% 동일한 헤더와 서식으로 즉시 자동 동기화됩니다!
 * 5. 우측 상단 [배포] > [새 배포] 클릭
 *    - 유형: '웹 앱' (톱니바퀴 아이콘 클릭)
 *    - 설명: Withsharing_DB MySQL Unified v2
 *    - 다음 사용자로 실행: '나'
 *    - 액세스 권한이 있는 사용자: '모든 사용자(Anyone)' (반드시 '모든 사용자' 선택!)
 * 6. [배포] 버튼 클릭 후 생성된 [웹 앱 URL] 복사
 * 7. 앱의 [사용자 설정] > [백엔드 DB API 서버 주소]에 붙여넣고 [저장 & 잠금] 클릭!
 * ==============================================================================
 */

// 테이블별 컬럼 스키마 정의 (MySQL Database Schema와 100% 동일한 표준 컬럼 체계)
const SCHEMAS = {
  // 1. 사용자 계정 정보 (MySQL: security_user)
  users: [
    'id', 'username', 'password', 'name', 'role', 'division', 'team',
    'rank', 'siteId', 'phone', 'email', 'education_date', 'education_expiry_date',
    'education_name', 'trainings', 'created_at'
  ],
  // 2. 작업 현장 정보 (MySQL: security_site)
  sites: [
    'id', 'type', 'name', 'address', 'site_name'
  ],
  // 3. 업무 일지 관리 (MySQL: work_log)
  work_logs: [
    'id', 'log_id', 'name', 'writer_id', 'division', 'team', 'rank', 'role',
    'category', 'sub_category', 'due_date', 'site_name', 'log_date', 'title',
    'tasks_done', 'is_shared', 'shared_with', 'shared_at', 'created_at'
  ],
  // 4. 보안 서약 관리 (MySQL: security_log)
  security_logs: [
    'id', 'log_id', 'parent_log_id', 'name', 'division', 'role', 'site_name',
    'purpose', 'visitor_phone', 'team', 'rank', 'mdm_verified', 'gate_approved',
    'doc_sec_verified', 'pre_check_verified', 'pledge_terms', 'signature_date', 'status'
  ],
  // 5. 주간 업무 보고서 (MySQL: weekly_report)
  weekly_reports: [
    'id', 'report_id', 'weekly_monday', 'week_text', 'author_name', 'author_username',
    'author_team', 'author_rank', 'author_division', 'author_role', 'main_tasks',
    'info_sharing', 'work_support', 'etc_tasks', 'shared_with', 'shared_at', 'created_at'
  ],
  // 6. 교육 수료 관리 (MySQL: edu_log)
  edu_logs: [
    'id', 'edu_id', 'user_id', 'name', 'division', 'team', 'rank', 'category',
    'title', 'completion_date', 'expiry_date', 'memo', 'created_at'
  ],
  // 7. 부가 테이블 (선택 관리)
  checklists: [
    'id', 'site', 'status', 'createdAt', 'data'
  ],
  tbms: [
    'id', 'date', 'siteName', 'leader', 'content', 'createdAt'
  ],
  vault: [
    'id', 'category', 'title', 'encryptedData', 'updatedAt'
  ],
  incidents: [
    'id', 'reportedAt', 'title', 'severity', 'description'
  ]
};

// 기본 초기 시드 데이터 (users & sites)
const INITIAL_USERS = [
  {
    id: 1,
    username: 'admin',
    password: '046d1bf1917f8a7fb783fa6fdb46a53cb6ff090cf16e8b7c527e77a16bfad884',
    name: '이원배',
    role: '개발자',
    division: '영업/운영사업부',
    team: '운영1팀',
    rank: '대리',
    siteId: 'ALL',
    phone: '010-9885-0393',
    email: 'wblee@withtech.co.kr',
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    username: 'wblee',
    password: '046d1bf1917f8a7fb783fa6fdb46a53cb6ff090cf16e8b7c527e77a16bfad884',
    name: '이원배',
    role: '일반',
    division: '영업/운영사업부',
    team: '운영1팀',
    rank: '대리',
    siteId: 'site-001',
    phone: '010-9885-0393',
    email: 'wblee@withtech.co.kr',
    created_at: '2026-01-01T00:00:00.000Z'
  }
];

const INITIAL_SITES = [
  {
    id: 'site-001',
    type: '보안앱O',
    name: '삼성전자 평택캠퍼스 P4 라인',
    address: '경기도 평택시 고덕면 삼성로 114',
    site_name: '삼성전자 평택캠퍼스 P4 라인 경기도 평택시 고덕면 삼성로 114'
  },
  {
    id: 'site-002',
    type: '보안앱O',
    name: 'SK하이닉스 이천 M16 공장',
    address: '경기도 이천시 부발읍 경충대로 2091',
    site_name: 'SK하이닉스 이천 M16 공장 경기도 이천시 부발읍 경충대로 2091'
  },
  {
    id: 'site-003',
    type: '보안앱X',
    name: '일반 협력사 물류센터 (보안앱 예외)',
    address: '경기도 용인시 처인구 백암면 원설로 123',
    site_name: '일반 협력사 물류센터 (보안앱 예외) 경기도 용인시 처인구 백암면 원설로 123'
  }
];

/**
 * 🚀 [100% 자동 초기화 및 MySQL 스키마 동기화 함수]
 */
function initDatabase() {
  return syncDatabaseHeaders();
}

/**
 * 🔄 MySQL 스키마와 구글 스프레드시트 컬럼 헤더 100% 동기화 함수
 * - 각 시트의 1행 헤더를 MySQL 최신 표준 스키마로 완벽 재정렬
 * - 기존에 저장된 데이터(구버전 컬럼명 등)를 새 컬럼 위치로 자동 마이그레이션하여 보존
 */
function syncDatabaseHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const report = {};
  
  for (const [sheetName, targetHeaders] of Object.entries(SCHEMAS)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (lastRow <= 1) {
      // 데이터가 없거나 헤더만 있는 경우: 헤더 덮어쓰기
      sheet.clear();
      sheet.appendRow(targetHeaders);
      formatHeaderRow(sheet, targetHeaders.length);

      // ⭐ 필요없는 잉여 열(컬럼) 자동 삭제
      const maxCols = sheet.getMaxColumns();
      if (maxCols > targetHeaders.length) {
        try { sheet.deleteColumns(targetHeaders.length + 1, maxCols - targetHeaders.length); } catch (e) {}
      }

      if (sheetName === 'users') {
        INITIAL_USERS.forEach(u => appendObjectRow(sheet, targetHeaders, u));
      } else if (sheetName === 'sites') {
        INITIAL_SITES.forEach(s => appendObjectRow(sheet, targetHeaders, s));
      }
      report[sheetName] = '헤더 생성 완료';
      continue;
    }
    
    // 기존 데이터가 있는 경우: 기존 행을 읽어 새 스키마로 정규화 후 안전 재작성
    const existingValues = sheet.getRange(1, 1, lastRow, Math.max(lastCol, 1)).getValues();
    const oldHeaders = existingValues[0];
    const dataRows = existingValues.slice(1);
    
    const normalizedData = [];
    dataRows.forEach(row => {
      const rowObj = {};
      let hasData = false;
      oldHeaders.forEach((h, idx) => {
        let val = row[idx];
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try { val = JSON.parse(val); } catch (e) {}
        }
        rowObj[h] = val;
        if (val !== '' && val !== null && val !== undefined) hasData = true;
      });
      if (hasData) {
        normalizedData.push(normalizeObjectForSheet(sheetName, rowObj));
      }
    });
    
    sheet.clear();
    sheet.appendRow(targetHeaders);
    formatHeaderRow(sheet, targetHeaders.length);

    // ⭐ 필요없는 잉여 열(컬럼) 자동 삭제 (targetHeaders 이후 열 일괄 삭제)
    const maxCols = sheet.getMaxColumns();
    if (maxCols > targetHeaders.length) {
      try { sheet.deleteColumns(targetHeaders.length + 1, maxCols - targetHeaders.length); } catch (e) {}
    }
    
    normalizedData.forEach(item => {
      appendObjectRow(sheet, targetHeaders, item);
    });
    
    try { sheet.autoResizeColumns(1, targetHeaders.length); } catch (e) {}
    report[sheetName] = `${normalizedData.length}건 데이터 마이그레이션 및 불필요한 열 자동 정리 완료`;
  }
  
  // 기본 생성되었던 빈 '시트1' 또는 'Sheet1' 정리
  const defaultSheet = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }
  
  Logger.log('✅ MySQL 스키마와 Withsharing_DB 컬럼 헤더 100% 동기화 완료!');
  return {
    success: true,
    message: 'MySQL 스키마와 스프레드시트의 모든 시트 컬럼이 100% 동일하게 동기화되었습니다.',
    details: report
  };
}

function formatHeaderRow(sheet, numCols) {
  const headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setBackground('#1e293b')
             .setFontColor('#ffffff')
             .setFontWeight('bold')
             .setHorizontalAlignment('center')
             .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1); // 1행 틀 고정
}

/**
 * 구글 스프레드시트 상단 메뉴 자동 등록
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🛡️ Withsharing DB 관리')
    .addItem('🚀 데이터베이스 자동 초기화 (initDatabase)', 'initDatabase')
    .addItem('🔄 MySQL 스키마 헤더 100% 동기화 (syncDatabaseHeaders)', 'syncDatabaseHeaders')
    .addItem('🧹 중복 데이터 자동 정리 (cleanupDuplicates)', 'cleanupDuplicates')
    .addToUi();
}

// -------------------------------------------------------------
// REST API 엔드포인트 핸들러 (GET / POST)
// -------------------------------------------------------------

/**
 * GET 요청 핸들러
 */
function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action || 'get';
    const sheetName = params.sheet || 'work_logs';
    
    // 1. 상태 핑(Ping) 테스트
    if (action === 'ping' || action === 'status') {
      const counts = getTableCounts();
      return jsonResponse({
        success: true,
        app: 'Withsharing_DB',
        message: '구글 스프레드시트 데이터베이스 통신 정상',
        counts: counts
      });
    }
    
    // 2. 원격 자동 초기화 및 헤더 동기화 트리거
    if (action === 'init' || action === 'sync_headers') {
      const result = syncDatabaseHeaders();
      return jsonResponse(result);
    }
    
    // 3. 중복 데이터 일괄 정리 트리거
    if (action === 'cleanup') {
      const result = cleanupDuplicates();
      return jsonResponse(result);
    }

    // 4. 전체 데이터베이스 일괄 동기화 (sync/all)
    if (action === 'getAll') {
      const allData = {};
      for (const key of Object.keys(SCHEMAS)) {
        allData[key] = readSheetData(key);
      }
      return jsonResponse({
        success: true,
        app: 'Withsharing_DB',
        data: allData
      });
    }
    
    // 5. 개별 시트 데이터 조회
    const data = readSheetData(sheetName);
    return jsonResponse({
      success: true,
      sheet: sheetName,
      data: data
    });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * POST 요청 핸들러 (데이터 추가, 수정, 삭제, 일괄 동기화)
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      return jsonResponse({ success: false, error: 'Empty payload' });
    }
    
    const action = payload.action || 'create';
    let sheetName = payload.sheet || 'work_logs';
    const rawData = payload.data || {};

    // ⭐ 보안 서약 데이터 격리 규칙: 보안 서약(PASS-) 데이터는 절대로 work_logs에 저장하지 않고 security_logs로 강제 분리
    const isSecurityPledge = Boolean(
      rawData && (
        String(rawData.id || '').startsWith('PASS-') ||
        String(rawData.log_id || '').startsWith('PASS-') ||
        rawData.visitorName ||
        rawData.visitor_name ||
        rawData.visitor_phone ||
        rawData.pledge_terms ||
        rawData.docChecklist !== undefined ||
        rawData.gate_approved !== undefined ||
        rawData.pre_check_verified !== undefined
      )
    );

    if (isSecurityPledge) {
      sheetName = 'security_logs';
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    // 탭이 없으면 자동 생성
    if (!sheet) {
      initDatabase();
      sheet = ss.getSheetByName(sheetName);
    }
    
    // [0] 중복 데이터 일괄 정리 (Cleanup Duplicates)
    if (action === 'cleanup') {
      const result = cleanupDuplicates();
      return jsonResponse(result);
    }

    // [1] 데이터 추가 (Create / Upsert - 중복 생성 방지)
    if (action === 'create') {
      if (!rawData || typeof rawData !== 'object') {
        return jsonResponse({ success: false, error: '유효하지 않은 데이터입니다.' });
      }
      // 보안 및 무결성 검증: 사용자 계정 추가 시 필수 정보(username, name) 누락 시 생성 차단
      if (sheetName === 'users' && (!rawData.username || !rawData.name)) {
        return jsonResponse({ success: false, error: '유효하지 않은 사용자 데이터: username과 name은 필수 입력 항목입니다.' });
      }

      const item = normalizeObjectForSheet(sheetName, rawData);
      const keyField = (sheetName === 'users') ? 'username' : (sheetName === 'sites' ? 'name' : (item.log_id ? 'log_id' : 'id'));
      const keyValue = String(item[keyField] || item.log_id || item.id || '').trim();

      const targetHeaders = SCHEMAS[sheetName] || Object.keys(item);
      const headers = ensureHeaders(sheet, targetHeaders);
      const keyColIdx = headers.indexOf(keyField);

      // 이미 동일한 키(ID / username / log_id 등)가 시트에 존재하면 새 행을 만들지 않고 기존 행을 덮어씀 (중복 생성 원천 차단)
      if (keyValue && keyColIdx !== -1 && sheet.getLastRow() > 1) {
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          const currentVal = String(rows[i][keyColIdx] || '').trim();
          const isMatch = (sheetName === 'users')
            ? currentVal.toLowerCase() === keyValue.toLowerCase()
            : currentVal === keyValue;

          if (isMatch) {
            const rowNum = i + 1;
            for (const [k, val] of Object.entries(item)) {
              const colIdx = headers.indexOf(k);
              if (colIdx !== -1) {
                const cellVal = (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
                sheet.getRange(rowNum, colIdx + 1).setValue(cellVal);
              }
            }
            return jsonResponse({ success: true, message: 'Row updated in-place (deduplicated upsert)', data: item });
          }
        }
      }

      appendObjectRow(sheet, headers, item);
      return jsonResponse({ success: true, message: 'Row created', data: item });
    }
    
    // [2] 데이터 수정 (Update)
    if (action === 'update') {
      const id = payload.id;
      const patch = normalizeObjectForSheet(sheetName, payload.data || {});
      const keyField = payload.key || (sheetName === 'users' ? 'username' : (sheetName === 'sites' ? 'name' : (patch.log_id ? 'log_id' : 'id')));
      
      const targetHeaders = SCHEMAS[sheetName] || Object.keys(patch);
      const headers = ensureHeaders(sheet, targetHeaders);
      const rows = sheet.getDataRange().getValues();
      const keyColIdx = headers.indexOf(keyField);
      
      if (keyColIdx === -1) {
        return jsonResponse({ success: false, error: 'Key field not found: ' + keyField });
      }
      
      for (let i = 1; i < rows.length; i++) {
        const cellValue = String(rows[i][keyColIdx] || '').trim();
        const isMatch = (sheetName === 'users')
          ? cellValue.toLowerCase() === String(id).trim().toLowerCase()
          : cellValue === String(id).trim();

        if (isMatch) {
          const rowNum = i + 1;
          for (const [k, val] of Object.entries(patch)) {
            const colIdx = headers.indexOf(k);
            if (colIdx !== -1) {
              const cellVal = (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
              sheet.getRange(rowNum, colIdx + 1).setValue(cellVal);
            }
          }
          return jsonResponse({ success: true, message: 'Row updated', id: id });
        }
      }
      
      // 대상이 없으면 새로 추가
      appendObjectRow(sheet, headers, { ...patch, [keyField]: id });
      return jsonResponse({ success: true, message: 'Row inserted (upsert)', id: id });
    }
    
    // [3] 데이터 삭제 (Delete)
    if (action === 'delete') {
      const id = payload.id;
      const keyField = payload.key || 'id';
      const rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) return jsonResponse({ success: true, message: 'Sheet is empty' });
      
      const headers = rows[0];
      const keyColIdx = headers.indexOf(keyField);
      const altKeyColIdx = headers.indexOf('log_id');
      
      for (let i = 1; i < rows.length; i++) {
        const val1 = keyColIdx !== -1 ? String(rows[i][keyColIdx]) : '';
        const val2 = altKeyColIdx !== -1 ? String(rows[i][altKeyColIdx]) : '';
        if (val1 === String(id) || val2 === String(id)) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ success: true, message: 'Row deleted', id: id });
        }
      }
      return jsonResponse({ success: true, message: 'Item not found, treated as deleted' });
    }
    
    // [4] 일괄 데이터 덮어쓰기/마이그레이션 (Bulk Sync)
    if (action === 'bulk_sync' && Array.isArray(payload.data)) {
      const rawItems = payload.data;
      if (rawItems.length > 0) {
        const targetHeaders = SCHEMAS[sheetName] || Object.keys(rawItems[0]);
        const headers = ensureHeaders(sheet, targetHeaders);
        
        // 기존 행 모두 지우고 새로 작성
        if (sheet.getLastRow() > 1) {
          sheet.deleteRows(2, sheet.getLastRow() - 1);
        }
        rawItems.forEach(it => {
          const item = normalizeObjectForSheet(sheetName, it);
          appendObjectRow(sheet, headers, item);
        });
      }
      return jsonResponse({ success: true, count: rawItems.length, message: 'Bulk sync completed' });
    }
    
    // [5] 클라이언트(PC/스마트폰) 로컬 데이터 전체 일괄 업로드 (Upload All Collections from Client)
    if (action === 'upload_all' && payload.data && typeof payload.data === 'object') {
      const allData = payload.data;
      const results = {};
      let grandTotalAdded = 0;
      let grandTotalUpdated = 0;
      
      for (const [tableKey, rawItems] of Object.entries(allData)) {
        if (!Array.isArray(rawItems) || rawItems.length === 0) continue;
        
        let targetSheet = ss.getSheetByName(tableKey);
        if (!targetSheet) {
          targetSheet = ss.insertSheet(tableKey);
        }
        
        const targetHeaders = SCHEMAS[tableKey] || Object.keys(rawItems[0]);
        if (targetSheet.getLastRow() === 0) {
          targetSheet.appendRow(targetHeaders);
          formatHeaderRow(targetSheet, targetHeaders.length);
        }
        
        const headers = ensureHeaders(targetSheet, targetHeaders);
        const idColKey = (tableKey === 'users') ? 'username' : (headers.includes('log_id') ? 'log_id' : 'id');
        const idColIdx = headers.indexOf(idColKey);
        const existingRows = targetSheet.getDataRange().getValues();
        const existingIds = new Map();
        
        if (existingRows.length > 1 && idColIdx !== -1) {
          for (let r = 1; r < existingRows.length; r++) {
            const rowId = String(existingRows[r][idColIdx] || '').trim();
            if (rowId) existingIds.set(rowId, r + 1);
          }
        }
        
        let added = 0;
        let updated = 0;
        
        rawItems.forEach(rawItem => {
          if (!rawItem || typeof rawItem !== 'object') return;
          const it = normalizeObjectForSheet(tableKey, rawItem);
          const itemId = String(it[idColKey] || it.id || it.log_id || '').trim();
          
          if (itemId && existingIds.has(itemId)) {
            const rowNum = existingIds.get(itemId);
            for (const [k, val] of Object.entries(it)) {
              const colIdx = headers.indexOf(k);
              if (colIdx !== -1) {
                const cellVal = (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
                targetSheet.getRange(rowNum, colIdx + 1).setValue(cellVal);
              }
            }
            updated++;
            grandTotalUpdated++;
          } else {
            appendObjectRow(targetSheet, headers, it);
            if (itemId) existingIds.set(itemId, targetSheet.getLastRow());
            added++;
            grandTotalAdded++;
          }
        });
        
        results[tableKey] = { added, updated, total: rawItems.length };
      }
      
      return jsonResponse({
        success: true,
        message: '로컬 데이터 구글 시트 일괄 업로드 완료 (MySQL 스키마 정규화 적용)',
        grandTotalAdded: grandTotalAdded,
        grandTotalUpdated: grandTotalUpdated,
        results: results
      });
    }
    
    return jsonResponse({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// -------------------------------------------------------------
// 헬퍼 유틸리티 함수
// -------------------------------------------------------------

/**
 * 객체를 MySQL 테이블 표준 컬럼 형식으로 100% 매핑 및 정규화
 */
function normalizeObjectForSheet(sheetName, rawObj) {
  if (!rawObj || typeof rawObj !== 'object') return {};
  const obj = { ...rawObj };

  // 1. 사용자 계정 (security_user)
  if (sheetName === 'users') {
    return {
      id: obj.id || '',
      username: String(obj.username || obj.id || '').trim().toLowerCase(),
      password: obj.password || '',
      name: obj.name || obj.authorName || obj.userName || '',
      role: obj.role || '일반',
      division: obj.division || '',
      team: obj.team || obj.department || '',
      rank: obj.rank || '',
      siteId: obj.siteId || obj.site_id || '',
      phone: obj.phone || '',
      email: obj.email || '',
      education_date: obj.education_date || obj.educationDate || '',
      education_expiry_date: obj.education_expiry_date || obj.educationExpiryDate || '',
      education_name: obj.education_name || obj.educationName || '',
      trainings: (typeof obj.trainings === 'object' && obj.trainings !== null) ? JSON.stringify(obj.trainings) : String(obj.trainings || ''),
      created_at: obj.created_at || obj.createdAt || new Date().toISOString()
    };
  }

  // 2. 작업 현장 (security_site)
  if (sheetName === 'sites') {
    const sName = obj.name || '';
    const sAddr = obj.address || '';
    const fullSiteName = obj.site_name || obj.siteName || (sName && sAddr ? `${sName} ${sAddr}`.trim() : sName);
    return {
      id: obj.id || '',
      type: obj.type || '보안앱O',
      name: sName,
      address: sAddr,
      site_name: fullSiteName
    };
  }

  // 3. 업무 일지 (work_log)
  if (sheetName === 'work_logs') {
    const idVal = obj.log_id || obj.logId || obj.id || `LOG-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`;
    const lDate = obj.log_date || obj.logDate || obj.date || new Date().toISOString().split('T')[0];
    const sWith = obj.shared_with || obj.sharedWith || '';
    let isSh = 0;
    if (obj.is_shared !== undefined) isSh = obj.is_shared ? 1 : 0;
    else if (obj.isShared !== undefined) isSh = obj.isShared ? 1 : 0;

    return {
      id: idVal,
      log_id: idVal,
      name: obj.name || obj.authorName || obj.writerName || obj.userName || '',
      writer_id: obj.writer_id || obj.writerId || obj.authorUsername || obj.username || '',
      division: obj.division || obj.authorDivision || '',
      team: obj.team || obj.authorTeam || obj.writerTeam || obj.department || '',
      rank: obj.rank || obj.authorRank || obj.writerRank || '',
      role: obj.role || obj.authorRole || '일반',
      category: obj.category || obj.workType || '사내 업무',
      sub_category: obj.sub_category || obj.subCategory || '',
      due_date: obj.due_date || obj.dueDate || '',
      site_name: obj.site_name || obj.siteName || obj.site || '',
      log_date: lDate,
      title: obj.title || '업무 일지',
      tasks_done: obj.tasks_done || obj.tasksDone || obj.details || obj.content || '',
      is_shared: isSh,
      shared_with: (typeof sWith === 'object' && sWith !== null) ? JSON.stringify(sWith) : String(sWith || ''),
      shared_at: obj.shared_at || obj.sharedAt || '',
      created_at: obj.created_at || obj.createdAt || new Date().toISOString()
    };
  }

  // 4. 보안 서약 (security_log)
  if (sheetName === 'security_logs') {
    const idVal = obj.log_id || obj.logId || obj.id || `PASS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const docChk = obj.docChecklist || {};
    const nowStr = new Date().toLocaleString('ko-KR', { hour12: false });
    return {
      id: idVal,
      log_id: idVal,
      parent_log_id: obj.parent_log_id || obj.parentLogId || obj.parentPledgeId || '',
      name: obj.name || obj.visitorName || obj.visitor_name || obj.userName || '서약자',
      division: obj.division || '',
      role: obj.role || '일반',
      site_name: obj.site_name || obj.siteName || obj.site || '',
      purpose: obj.purpose || obj.purposeType || obj.customPurpose || '',
      visitor_phone: obj.visitor_phone || obj.visitorPhone || obj.phone || '',
      team: obj.team || obj.visitor_team || obj.visitorTeam || obj.department || '',
      rank: obj.rank || obj.visitor_rank || obj.visitorRank || '',
      mdm_verified: (obj.mdm_verified !== undefined ? obj.mdm_verified : obj.mdmVerified) ? 1 : 0,
      gate_approved: (obj.gate_approved !== undefined ? obj.gate_approved : docChk.gateApproved) ? 1 : 0,
      doc_sec_verified: (obj.doc_sec_verified !== undefined ? obj.doc_sec_verified : docChk.docSecVerified) ? 1 : 0,
      pre_check_verified: (obj.pre_check_verified !== undefined ? obj.pre_check_verified : docChk.preCheckVerified) ? 1 : 0,
      pledge_terms: obj.pledge_terms || obj.pledgeTerms || '',
      signature_date: obj.signature_date || obj.signatureDate || obj.signedAt || obj.date || nowStr,
      status: obj.status || '승인완료'
    };
  }

  // 5. 주간 업무 보고서 (weekly_report)
  if (sheetName === 'weekly_reports') {
    const rId = obj.report_id || obj.reportId || obj.id || `weekly_${Date.now()}`;
    const sWith = obj.shared_with || obj.sharedWith || '';
    return {
      id: rId,
      report_id: rId,
      weekly_monday: obj.weekly_monday || obj.weeklyMonday || new Date().toISOString().split('T')[0],
      week_text: obj.week_text || obj.weekText || '',
      author_name: obj.author_name || obj.authorName || obj.name || '',
      author_username: obj.author_username || obj.authorUsername || obj.writerId || obj.username || '',
      author_team: obj.author_team || obj.authorTeam || obj.team || '',
      author_rank: obj.author_rank || obj.authorRank || obj.rank || '',
      author_division: obj.author_division || obj.authorDivision || obj.division || '',
      author_role: obj.author_role || obj.authorRole || obj.role || '일반',
      main_tasks: obj.main_tasks || obj.mainTasks || '',
      info_sharing: obj.info_sharing || obj.infoSharing || '',
      work_support: obj.work_support || obj.workSupport || obj.teamCoop || '',
      etc_tasks: obj.etc_tasks || obj.etcTasks || '',
      shared_with: (typeof sWith === 'object' && sWith !== null) ? JSON.stringify(sWith) : String(sWith || ''),
      shared_at: obj.shared_at || obj.sharedAt || '',
      created_at: obj.created_at || obj.createdAt || new Date().toISOString()
    };
  }

  // 6. 교육 수료 일지 (edu_log)
  if (sheetName === 'edu_logs') {
    const eId = obj.edu_id || obj.eduId || obj.id || `EDU-${Date.now()}`;
    return {
      id: eId,
      edu_id: eId,
      user_id: obj.user_id || obj.userId || obj.username || '',
      name: obj.name || obj.authorName || obj.userName || '',
      division: obj.division || obj.authorDivision || '',
      team: obj.team || obj.authorTeam || '',
      rank: obj.rank || obj.authorRank || '',
      category: obj.category || '법정',
      title: obj.title || '',
      completion_date: obj.completion_date || obj.completionDate || obj.date || new Date().toISOString().split('T')[0],
      expiry_date: obj.expiry_date || obj.expiryDate || '',
      memo: obj.memo || obj.notes || '',
      created_at: obj.created_at || obj.createdAt || new Date().toISOString()
    };
  }

  return obj;
}

function readSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const list = [];
  const keyMap = new Map();
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj = {};
    let hasData = false;
    
    headers.forEach((h, colIdx) => {
      let val = row[colIdx];
      // JSON 객체/배열 형태 자동 역직렬화
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch (e) {}
      }
      obj[h] = val;
      if (val !== '' && val !== null && val !== undefined) hasData = true;
    });
    
    if (hasData) {
      // ⭐ work_logs 조회 시 과거 혼입된 보안 서약(PASS-) 행은 업무 일지 목록에서 자동 제외
      if (sheetName === 'work_logs') {
        const idVal = String(obj.id || obj.log_id || '').trim();
        if (idVal.startsWith('PASS-') || obj.visitorName || obj.visitor_name || obj.pledge_terms || obj.docChecklist !== undefined) {
          continue;
        }

        // 호환성 별칭 매핑 (MySQL 표준 컬럼 -> 프론트엔드 카멜케이스)
        if (!obj.details && obj.tasks_done) obj.details = obj.tasks_done;
        if (!obj.siteName && obj.site_name) obj.siteName = obj.site_name;
        if (!obj.date && obj.log_date) obj.date = obj.log_date;
        if (!obj.authorName && obj.name) obj.authorName = obj.name;
        if (!obj.writerName && obj.name) obj.writerName = obj.name;
        if (!obj.authorUsername && obj.writer_id) obj.authorUsername = obj.writer_id;
        if (!obj.writerId && obj.writer_id) obj.writerId = obj.writer_id;
        if (!obj.username && obj.writer_id) obj.username = obj.writer_id;
        if (!obj.writer_id && obj.writerId) obj.writer_id = obj.writerId;
        if (!obj.writer_id && obj.authorUsername) obj.writer_id = obj.authorUsername;
        if (!obj.writer_id && obj.username) obj.writer_id = obj.username;
        if (!obj.authorTeam && obj.team) obj.authorTeam = obj.team;
        if (!obj.authorRank && obj.rank) obj.authorRank = obj.rank;
        if (!obj.authorDivision && obj.division) obj.authorDivision = obj.division;
        if (!obj.authorRole && obj.role) obj.authorRole = obj.role;
        if (obj.is_shared !== undefined && obj.isShared === undefined) obj.isShared = Boolean(obj.is_shared);
        if (!obj.subCategory && obj.sub_category) obj.subCategory = obj.sub_category;
        if (!obj.dueDate && obj.due_date) obj.dueDate = obj.due_date;
      } else if (sheetName === 'security_logs') {
        // 호환성 별칭 매핑 (MySQL 표준 컬럼 -> 프론트엔드 카멜케이스)
        if (!obj.visitorName && obj.name) obj.visitorName = obj.name;
        if (!obj.userName && obj.name) obj.userName = obj.name;
        if (!obj.siteName && obj.site_name) obj.siteName = obj.site_name;
        if (!obj.visitorPhone && obj.visitor_phone) obj.visitorPhone = obj.visitor_phone;
        if (!obj.phone && obj.visitor_phone) obj.phone = obj.visitor_phone;
        if (!obj.visitorTeam && obj.team) obj.visitorTeam = obj.team;
        if (!obj.visitorRank && obj.rank) obj.visitorRank = obj.rank;
        if (!obj.signatureDate && obj.signature_date) obj.signatureDate = obj.signature_date;
        if (!obj.signedAt && obj.signature_date) obj.signedAt = obj.signature_date;
        if (!obj.date && obj.signature_date) obj.date = obj.signature_date;
        if (obj.mdm_verified !== undefined && obj.mdmVerified === undefined) obj.mdmVerified = Boolean(obj.mdm_verified);
        if (!obj.docChecklist) {
          obj.docChecklist = {
            gateApproved: Boolean(obj.gate_approved),
            docSecVerified: Boolean(obj.doc_sec_verified),
            preCheckVerified: Boolean(obj.pre_check_verified)
          };
        }
        if (!obj.pledgeTerms && obj.pledge_terms) obj.pledgeTerms = obj.pledge_terms;
      } else if (sheetName === 'sites') {
        if (!obj.siteName && obj.site_name) obj.siteName = obj.site_name;
      } else if (sheetName === 'weekly_reports') {
        if (!obj.authorName && obj.author_name) obj.authorName = obj.author_name;
        if (!obj.authorUsername && obj.author_username) obj.authorUsername = obj.author_username;
        if (!obj.authorTeam && obj.author_team) obj.authorTeam = obj.author_team;
        if (!obj.authorRank && obj.author_rank) obj.authorRank = obj.author_rank;
        if (!obj.authorDivision && obj.author_division) obj.authorDivision = obj.author_division;
        if (!obj.authorRole && obj.author_role) obj.authorRole = obj.author_role;
        if (!obj.weeklyMonday && obj.weekly_monday) obj.weeklyMonday = obj.weekly_monday;
        if (!obj.weekText && obj.week_text) obj.weekText = obj.week_text;
        if (!obj.mainTasks && obj.main_tasks) obj.mainTasks = obj.main_tasks;
        if (!obj.infoSharing && obj.info_sharing) obj.infoSharing = obj.info_sharing;
        if (!obj.workSupport && obj.work_support) obj.workSupport = obj.work_support;
        if (!obj.etcTasks && obj.etc_tasks) obj.etcTasks = obj.etc_tasks;
      } else if (sheetName === 'edu_logs') {
        if (!obj.eduId && obj.edu_id) obj.eduId = obj.edu_id;
        if (!obj.userId && obj.user_id) obj.userId = obj.user_id;
        if (!obj.completionDate && obj.completion_date) obj.completionDate = obj.completion_date;
        if (!obj.expiryDate && obj.expiry_date) obj.expiryDate = obj.expiry_date;
        if (!obj.notes && obj.memo) obj.notes = obj.memo;
      }

      // 키별 중복 방지: 시트에 기존에 누적된 중복 행이 있더라도 가장 최신(아래쪽) 행 데이터만 반환
      let key = '';
      if (sheetName === 'users') {
        key = String(obj.username || obj.id || '').trim().toLowerCase();
      } else if (sheetName === 'sites') {
        const namePart = String(obj.name || obj.site_name || '').trim();
        const addrPart = String(obj.address || '').trim();
        key = namePart && addrPart ? (namePart + '::' + addrPart) : String(obj.id || '');
      } else {
        key = String(obj.log_id || obj.id || '').trim();
      }

      if (key) {
        if (sheetName === 'users' && keyMap.has(key)) {
          const prev = keyMap.get(key);
          keyMap.set(key, {
            ...prev,
            ...obj,
            name: obj.name || prev.name || '',
            role: (obj.role === '개발자' || prev.role === '개발자') ? '개발자' : (obj.role || prev.role || '일반'),
            division: obj.division || prev.division || '',
            team: obj.team || prev.team || '',
            rank: obj.rank || prev.rank || '',
            siteId: obj.siteId || prev.siteId || '',
            phone: obj.phone || prev.phone || '',
            email: obj.email || prev.email || '',
            password: prev.password || obj.password || ''
          });
        } else {
          keyMap.set(key, obj);
        }
      } else {
        list.push(obj);
      }
    }
  }

  if (keyMap.size > 0) {
    return Array.from(keyMap.values()).concat(list);
  }
  return list;
}

/**
 * 🧹 스프레드시트 내 중복 데이터 전 시트 자동 정리 함수
 * (중복 행 발견 시 가장 최근/마지막 행만 보존하고 이전 중복 행들을 실제 시트에서 일괄 삭제)
 */
function cleanupDuplicates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const results = {};
  let grandTotalDeleted = 0;

  for (const sheetName of Object.keys(SCHEMAS)) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() <= 2) {
      results[sheetName] = 0;
      continue;
    }

    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const seen = new Set();
    const rowsToDelete = [];

    // 역순(아래에서 위로) 탐색하여 가장 마지막(최신) 행을 보존하고 이전 중복 행 삭제 대상 등록
    for (let r = rows.length - 1; r >= 1; r--) {
      const row = rows[r];
      let key = '';

      if (sheetName === 'users') {
        const uIdx = headers.indexOf('username');
        const nameIdx = headers.indexOf('name');
        const username = uIdx !== -1 ? String(row[uIdx] || '').trim().toLowerCase() : '';
        const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';

        // 이름이 누락된 유령/중복 계정 행은 최우선 삭제 대상 등록
        if (!name) {
          rowsToDelete.push(r + 1);
          continue;
        }
        key = username;
      } else if (sheetName === 'sites') {
        const nameIdx = headers.indexOf('name');
        const addrIdx = headers.indexOf('address');
        const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
        const addr = addrIdx !== -1 ? String(row[addrIdx] || '').trim() : '';
        key = name && addr ? (name + '::' + addr) : (headers.indexOf('id') !== -1 ? String(row[headers.indexOf('id')] || '').trim() : '');
      } else if (sheetName === 'work_logs') {
        const idIdx = headers.indexOf('id');
        const logIdIdx = headers.indexOf('log_id');
        const id = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';
        const logId = logIdIdx !== -1 ? String(row[logIdIdx] || '').trim() : '';

        // ⭐ work_logs에 잘못 저장된 보안 서약(PASS-) 행은 최우선 삭제 대상 등록 (security_logs와 철저히 분리)
        if (id.startsWith('PASS-') || logId.startsWith('PASS-')) {
          rowsToDelete.push(r + 1);
          continue;
        }
        key = logId || id;
      } else {
        const idIdx = headers.indexOf('id');
        const logIdIdx = headers.indexOf('log_id');
        const id = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';
        const logId = logIdIdx !== -1 ? String(row[logIdIdx] || '').trim() : '';
        key = logId || id;
      }

      if (!key) continue;

      if (seen.has(key)) {
        rowsToDelete.push(r + 1); // 1-indexed row number
      } else {
        seen.add(key);
      }
    }

    // 아래에서 위로 행을 삭제하여 행 번호 뒤틀림 방지
    let deletedCount = 0;
    rowsToDelete.forEach(rowNum => {
      try {
        sheet.deleteRow(rowNum);
        deletedCount++;
      } catch (e) {}
    });

    results[sheetName] = deletedCount;
    grandTotalDeleted += deletedCount;
  }

  Logger.log('🧹 중복 데이터 정리 완료: 총 ' + grandTotalDeleted + '개 중복 행 삭제');
  return {
    success: true,
    message: `스프레드시트 중복 데이터 정리 완료: 총 ${grandTotalDeleted}개의 중복 행이 안전하게 삭제되었습니다.`,
    totalDeleted: grandTotalDeleted,
    details: results
  };
}

function appendObjectRow(sheet, headers, rawObj) {
  const obj = normalizeObjectForSheet(sheet.getName(), rawObj);
  const row = headers.map(h => {
    const v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  });
  sheet.appendRow(row);
}

function ensureHeaders(sheet, keys) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(keys);
    return keys;
  }
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const missing = keys.filter(k => !headers.includes(k));
  if (missing.length > 0) {
    const startCol = headers.length + 1;
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
    headers.push(...missing);
  }
  return headers;
}

function getTableCounts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const counts = {};
  for (const name of Object.keys(SCHEMAS)) {
    const s = ss.getSheetByName(name);
    counts[name] = s ? Math.max(0, s.getLastRow() - 1) : 0;
  }
  return counts;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
