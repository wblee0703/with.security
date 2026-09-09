/**
 * ==============================================================================
 * Withsharing_DB - 구글 스프레드시트 데이터베이스 전용 Apps Script
 * ==============================================================================
 * 
 * [배포 및 사용 방법 (1분 소요)]
 * 1. 생성하신 'Withsharing_DB' 구글 스프레드시트 열기
 * 2. 상단 메뉴 [확장 프로그램] > [Apps Script] 클릭
 * 3. 기존 코드를 모두 지우고 이 파일의 전체 코드를 그대로 붙여넣기
 * 4. 상단 툴바의 함수 선택 목록에서 'initDatabase' 선택 후 [실행] 클릭
 *    -> 필요한 모든 탭(users, sites, work_logs 등)과 헤더, 초기 데이터가 100% 자동 생성됩니다!
 * 5. 우측 상단 [배포] > [새 배포] 클릭
 *    - 유형: '웹 앱' (톱니바퀴 아이콘 클릭)
 *    - 설명: Withsharing_DB v1
 *    - 다음 사용자로 실행: '나'
 *    - 액세스 권한이 있는 사용자: '모든 사용자(Anyone)' (반드시 '모든 사용자' 선택!)
 * 6. [배포] 버튼 클릭 후 생성된 [웹 앱 URL] 복사
 * 7. 앱의 [사용자 설정] > [백엔드 DB API 서버 주소]에 붙여넣고 [저장 & 잠금] 클릭!
 * ==============================================================================
 */

// 테이블별 컬럼 스키마 정의
const SCHEMAS = {
  users: [
    'id', 'username', 'password', 'name', 'role', 'division', 'team',
    'rank', 'siteId', 'phone', 'email', 'education_date', 'education_expiry_date',
    'education_name', 'trainings', 'created_at'
  ],
  sites: [
    'id', 'type', 'name', 'address', 'site_name', 'siteName'
  ],
  work_logs: [
    'id', 'date', 'userName', 'rank', 'team', 'siteName', 'workType',
    'startTime', 'endTime', 'content', 'signature', 'createdAt'
  ],
  security_logs: [
    'id', 'date', 'siteName', 'inspectorName', 'checkResult', 'notes',
    'signature', 'createdAt'
  ],
  weekly_reports: [
    'id', 'year', 'weekNumber', 'title', 'writer', 'siteName', 'summary', 'createdAt'
  ],
  edu_logs: [
    'id', 'userId', 'username', 'name', 'category', 'title', 'instructor',
    'date', 'hours', 'score', 'result', 'notes', 'createdAt'
  ],
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
    site_name: '삼성전자 평택캠퍼스 P4 라인 경기도 평택시 고덕면 삼성로 114',
    siteName: '삼성전자 평택캠퍼스 P4 라인 경기도 평택시 고덕면 삼성로 114'
  },
  {
    id: 'site-002',
    type: '보안앱O',
    name: 'SK하이닉스 이천 M16 공장',
    address: '경기도 이천시 부발읍 경충대로 2091',
    site_name: 'SK하이닉스 이천 M16 공장 경기도 이천시 부발읍 경충대로 2091',
    siteName: 'SK하이닉스 이천 M16 공장 경기도 이천시 부발읍 경충대로 2091'
  },
  {
    id: 'site-003',
    type: '보안앱X',
    name: '일반 협력사 물류센터 (보안앱 예외)',
    address: '경기도 용인시 처인구 백암면 원설로 123',
    site_name: '일반 협력사 물류센터 (보안앱 예외) 경기도 용인시 처인구 백암면 원설로 123',
    siteName: '일반 협력사 물류센터 (보안앱 예외) 경기도 용인시 처인구 백암면 원설로 123'
  }
];

/**
 * 🚀 [100% 자동 초기화 함수]
 * Apps Script 상단에서 'initDatabase'를 선택하고 [실행]을 누르면
 * 모든 시트 탭, 1행 헤더(디자인 서식 포함), 초기 데이터가 자동 세팅됩니다!
 */
function initDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  for (const [sheetName, headers] of Object.entries(SCHEMAS)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // 1행에 헤더가 없으면 자동 생성
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      
      // 프리미엄 네이비 헤더 디자인 적용
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#1e293b')
                 .setFontColor('#ffffff')
                 .setFontWeight('bold')
                 .setHorizontalAlignment('center')
                 .setVerticalAlignment('middle');
      
      sheet.setRowHeight(1, 38);
      sheet.setFrozenRows(1); // 1행 틀 고정
      
      // 초기 기본 데이터 삽입
      if (sheetName === 'users') {
        INITIAL_USERS.forEach(u => appendObjectRow(sheet, headers, u));
      } else if (sheetName === 'sites') {
        INITIAL_SITES.forEach(s => appendObjectRow(sheet, headers, s));
      }
      
      // 열 너비 자동 맞춤
      try {
        sheet.autoResizeColumns(1, headers.length);
      } catch (e) {}
    }
  }
  
  // 기본 생성되었던 빈 '시트1' 또는 'Sheet1' 정리
  const defaultSheet = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }
  
  Logger.log('✅ Withsharing_DB 전체 시트 탭 및 헤더 초기화 완료!');
  return { success: true, message: 'Withsharing_DB 초기화가 성공적으로 완료되었습니다.' };
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
    
    // 2. 원격 자동 초기화 트리거
    if (action === 'init') {
      const result = initDatabase();
      return jsonResponse(result);
    }
    
    // 3. 전체 데이터베이스 일괄 동기화 (sync/all)
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
    
    // 4. 개별 시트 데이터 조회
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
    const sheetName = payload.sheet || 'work_logs';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    // 탭이 없으면 자동 생성
    if (!sheet) {
      initDatabase();
      sheet = ss.getSheetByName(sheetName);
    }
    
    // [1] 데이터 추가 (Create)
    if (action === 'create') {
      const item = payload.data || {};
      if (!item.id && sheetName !== 'users') {
        item.id = 'gen_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      }
      if (!item.createdAt && !item.created_at) {
        item.createdAt = new Date().toISOString();
      }
      
      const headers = ensureHeaders(sheet, Object.keys(item));
      appendObjectRow(sheet, headers, item);
      return jsonResponse({ success: true, message: 'Row created', data: item });
    }
    
    // [2] 데이터 수정 (Update)
    if (action === 'update') {
      const id = payload.id;
      const patch = payload.data || {};
      const keyField = payload.key || 'id';
      
      const headers = ensureHeaders(sheet, Object.keys(patch));
      const rows = sheet.getDataRange().getValues();
      const keyColIdx = headers.indexOf(keyField);
      
      if (keyColIdx === -1) {
        return jsonResponse({ success: false, error: 'Key field not found: ' + keyField });
      }
      
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][keyColIdx]) === String(id)) {
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
      if (keyColIdx === -1) return jsonResponse({ success: false, error: 'Key not found' });
      
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][keyColIdx]) === String(id)) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ success: true, message: 'Row deleted', id: id });
        }
      }
      return jsonResponse({ success: true, message: 'Item not found, treated as deleted' });
    }
    
    // [4] 일괄 데이터 덮어쓰기/마이그레이션 (Bulk Sync)
    if (action === 'bulk_sync' && Array.isArray(payload.data)) {
      const items = payload.data;
      if (items.length > 0) {
        const allKeys = Object.keys(items[0]);
        const headers = ensureHeaders(sheet, allKeys);
        
        // 기존 행 모두 지우고 새로 작성
        if (sheet.getLastRow() > 1) {
          sheet.deleteRows(2, sheet.getLastRow() - 1);
        }
        items.forEach(it => appendObjectRow(sheet, headers, it));
      }
      return jsonResponse({ success: true, count: items.length, message: 'Bulk sync completed' });
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
        
        if (targetSheet.getLastRow() === 0 && SCHEMAS[tableKey]) {
          targetSheet.appendRow(SCHEMAS[tableKey]);
          const hr = targetSheet.getRange(1, 1, 1, SCHEMAS[tableKey].length);
          hr.setBackground('#1e293b').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
          targetSheet.setRowHeight(1, 38);
          targetSheet.setFrozenRows(1);
        }
        
        const keySet = new Set();
        rawItems.forEach(it => {
          if (it && typeof it === 'object') Object.keys(it).forEach(k => keySet.add(k));
        });
        const headers = ensureHeaders(targetSheet, Array.from(keySet));
        
        const idColKey = (tableKey === 'users') ? 'username' : 'id';
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
        
        rawItems.forEach(it => {
          if (!it || typeof it !== 'object') return;
          const itemId = String(it[idColKey] || '').trim();
          
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
        message: '로컬 데이터 구글 시트 일괄 업로드 완료',
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

function readSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const list = [];
  
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
    
    if (hasData) list.push(obj);
  }
  return list;
}

function appendObjectRow(sheet, headers, obj) {
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
