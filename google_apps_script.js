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

/**
 * 구글 스프레드시트 상단 메뉴 자동 등록
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🛡️ Withsharing DB 관리')
    .addItem('🚀 데이터베이스 자동 초기화 (initDatabase)', 'initDatabase')
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
    
    // 2. 원격 자동 초기화 트리거
    if (action === 'init') {
      const result = initDatabase();
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
    const sheetName = payload.sheet || 'work_logs';
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
      const item = payload.data || {};
      const keyField = (sheetName === 'users') ? 'username' : (sheetName === 'sites' ? 'name' : 'id');
      const keyValue = String(item[keyField] || item.id || item.log_id || '').trim();

      const headers = ensureHeaders(sheet, Object.keys(item));
      const keyColIdx = headers.indexOf(keyField);

      // 이미 동일한 키(ID / username 등)가 시트에 존재하면 새 행을 만들지 않고 기존 행을 덮어씀 (중복 생성 원천 차단)
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

      if (!item.id && sheetName !== 'users') {
        item.id = 'gen_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      }
      if (!item.createdAt && !item.created_at) {
        item.createdAt = new Date().toISOString();
      }
      
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
      // 키별 중복 방지: 시트에 기존에 누적된 중복 행이 있더라도 가장 최신(아래쪽) 행 데이터만 반환
      let key = '';
      if (sheetName === 'users') {
        key = String(obj.username || obj.id || '').trim().toLowerCase();
      } else if (sheetName === 'sites') {
        const namePart = String(obj.name || obj.site_name || obj.siteName || '').trim();
        const addrPart = String(obj.address || '').trim();
        key = namePart && addrPart ? (namePart + '::' + addrPart) : String(obj.id || '');
      } else {
        key = String(obj.id || obj.log_id || '').trim();
      }

      if (key) {
        keyMap.set(key, obj);
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
        const idIdx = headers.indexOf('id');
        const username = uIdx !== -1 ? String(row[uIdx] || '').trim().toLowerCase() : '';
        const id = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';
        key = username || id;
      } else if (sheetName === 'sites') {
        const nameIdx = headers.indexOf('name');
        const addrIdx = headers.indexOf('address');
        const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
        const addr = addrIdx !== -1 ? String(row[addrIdx] || '').trim() : '';
        key = name && addr ? (name + '::' + addr) : (headers.indexOf('id') !== -1 ? String(row[headers.indexOf('id')] || '').trim() : '');
      } else {
        const idIdx = headers.indexOf('id');
        const logIdIdx = headers.indexOf('log_id');
        const id = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';
        const logId = logIdIdx !== -1 ? String(row[logIdIdx] || '').trim() : '';
        key = id || logId;
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
