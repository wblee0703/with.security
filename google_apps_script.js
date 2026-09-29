/**
 * ==============================================================================
 * Withsharing_DB - 구글 스프레드시트 데이터베이스 전용 Apps Script
 * ==============================================================================
 * 
 * [Withsharing_DB 클라우드 데이터베이스 스키마 & Google Drive 사진 자동 저장 v3]
 * 1. 생성하신 'Withsharing_DB' 구글 스프레드시트 열기
 * 2. 상단 메뉴 [확장 프로그램] > [Apps Script] 클릭
 * 3. 기존 코드를 모두 지우고 이 파일의 전체 코드를 그대로 붙여넣기
 * 4. 상단 툴바의 함수 선택 목록에서 'syncDatabaseHeaders' (또는 'initDatabase') 선택 후 [실행] 클릭
 *    -> 필요한 모든 탭(users, sites, work_logs, security_logs, tbms 등)의 컬럼이
 *       표준 컬럼 및 사진 링크(photo_url)와 100% 동일한 헤더와 서식으로 즉시 자동 동기화됩니다!
 * 5. 우측 상단 [배포] > [새 배포] 클릭
 *    - 유형: '웹 앱' (톱니바퀴 아이콘 클릭)
 *    - 설명: Withsharing_DB Google Drive Photos v3
 *    - 다음 사용자로 실행: '나'
 *    - 액세스 권한이 있는 사용자: '모든 사용자(Anyone)' (반드시 '모든 사용자' 선택!)
 * 6. [배포] 버튼 클릭 후 생성된 [웹 앱 URL] 복사
 * 7. 앱의 [사용자 설정] > [백엔드 DB API 서버 주소]에 붙여넣고 [저장 & 잠금] 클릭!
 *    -> TBM 현장 사진이 Google Drive('WithSharing_TBM_Photos' 폴더)에 파일로 자동 저장되며,
 *       스프레드시트에 바로보기 URL이 연동되어 용량 제한 없이 안전하게 영구 보존됩니다!
 * ==============================================================================
 */

// 테이블별 컬럼 스키마 정의 (Withsharing_DB 표준 컬럼 체계)
const SCHEMAS = {
  // 1. 사용자 계정 정보 (MySQL: security_user)
  users: [
    'id', 'username', 'password', 'name', 'role', 'division', 'team',
    'rank', 'siteId', 'phone', 'email', 'created_at'
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
  // 5-1. 일일 업무 보고서 (daily_reports) - id 단일화 및 공유자/공유대상 분리 컬럼 관리
  daily_reports: [
    'id', 'daily_date', 'author_name', 'author_username',
    'author_team', 'author_rank', 'author_division', 'author_role',
    'issues', 'today_tasks', 'tomorrow_plan',
    'shared_by', 'shared_with', 'shared_at',
    'created_at', 'updated_at'
  ],
  // 6. 교육 수료 관리 (MySQL: edu_log)
  edu_logs: [
    'id', 'edu_id', 'user_id', 'name', 'division', 'team', 'rank', 'category',
    'title', 'completion_date', 'validity_period', 'expiry_date', 'memo', 'created_at'
  ],
  // 7. 부가 테이블 (선택 관리)
  checklists: [
    'id', 'site', 'status', 'createdAt', 'data'
  ],
  tbms: [
    'id', 'tbm_type', 'date', 'site', 'site_address', 'work_title', 'work_category',
    'leader_division', 'leader_team', 'leader_name', 'leader_rank', 'leader_phone',
    'attendees', 'absentees', 'work_content',
    'check_list', 'status', 'photo_url', 'created_at', 'updated_at'
  ],
  vault: [
    'id', 'category', 'title', 'encryptedData', 'updatedAt'
  ],
  incidents: [
    'id', 'reportedAt', 'title', 'severity', 'description'
  ],
  // 8. 시스템 업데이트 공지사항 (notices)
  notices: [
    'id', 'title', 'version', 'content', 'author_name', 'author_username', 'is_active', 'created_at', 'updated_at'
  ]
};

/**
 * 🚀 [100% 자동 초기화 및 스키마 동기화 함수]
 */
function initDatabase() {
  return syncDatabaseHeaders();
}

/**
 * 🔄 구글 스프레드시트 컬럼 헤더 100% 동기화 함수
 * - 각 시트의 1행 헤더를 최신 표준 스키마로 완벽 재정렬
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
      // 데이터가 없는 경우: 1행 헤더만 갱신
      sheet.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
      formatHeaderRow(sheet, targetHeaders.length);

      // 필요없는 잉여 열(컬럼) 자동 삭제
      const maxCols = sheet.getMaxColumns();
      if (maxCols > targetHeaders.length) {
        try { sheet.deleteColumns(targetHeaders.length + 1, maxCols - targetHeaders.length); } catch (e) { }
      }

      report[sheetName] = '헤더 생성 완료';
      continue;
    }

    // 기존 데이터가 있는 경우: 기존 행 데이터를 보존하면서 1행 헤더 및 열 안전 정렬
    const existingValues = sheet.getRange(1, 1, lastRow, Math.max(lastCol, 1)).getValues();
    const oldHeaders = existingValues[0].map(h => String(h || '').trim());
    const dataRows = existingValues.slice(1);

    // 1행 헤더를 새 표준 스키마로 즉시 교체
    sheet.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
    formatHeaderRow(sheet, targetHeaders.length);

    // 컬럼 매핑: 구버전 헤더 위치에서 신규 표준 헤더 위치로 값 안전 재배치
    const reorderedRows = dataRows.map(row => {
      return targetHeaders.map(th => {
        const idx = oldHeaders.indexOf(th);
        if (idx !== -1) return row[idx];
        // 대소문자 무시 매칭
        const lowerIdx = oldHeaders.map(h => h.toLowerCase()).indexOf(th.toLowerCase());
        if (lowerIdx !== -1) return row[lowerIdx];
        return '';
      });
    });

    if (reorderedRows.length > 0) {
      sheet.getRange(2, 1, reorderedRows.length, targetHeaders.length).setValues(reorderedRows);
    }

    // 스키마 컬럼 수 이후의 잉여 열만 안전하게 삭제 (데이터 손실 없음)
    const maxCols = sheet.getMaxColumns();
    if (maxCols > targetHeaders.length) {
      try { sheet.deleteColumns(targetHeaders.length + 1, maxCols - targetHeaders.length); } catch (e) { }
    }

    try { sheet.autoResizeColumns(1, targetHeaders.length); } catch (e) { }
    report[sheetName] = `${reorderedRows.length}건 데이터 컬럼 안전 재정렬 완료`;
  }

  // 기본 생성되었던 빈 '시트1' 또는 'Sheet1' 정리
  const defaultSheet = ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) { }
  }

  // 사용자 시트 비밀번호 단방향 암호화 및 순차 ID 일괄 점검
  try { enforcePasswordHashingInSheet(); } catch (e) { }
  try { enforceNumericUserIds(); } catch (e) { }
  // 시트 내 누적된 빈 행 및 중복 데이터 일괄 정리 자동 실행
  try { cleanupDuplicates(); } catch (e) { }

  Logger.log('✅ Withsharing_DB 컬럼 헤더 100% 동기화 완료!');
  return {
    success: true,
    message: '스프레드시트의 모든 시트 컬럼이 100% 동일하게 동기화되었습니다.',
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
    .addItem('🔄 전체 시트 헤더 & 스키마 동기화 (syncDatabaseHeaders)', 'syncDatabaseHeaders')
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
    let sheetName = params.sheet || 'work_logs';
    if (sheetName === 'tbm') sheetName = 'tbms';

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
    if (sheetName === 'tbm') sheetName = 'tbms';
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

    // [0-1] 헤더 동기화 및 잉여 열 정리 (Sync Database Headers)
    if (action === 'sync_headers' || action === 'init') {
      const result = syncDatabaseHeaders();
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

      // TBM 무결성 검증: 빈 껍데기 요청(사업장, 작업명, 주관자 모두 부재)은 신규 생성 원천 차단
      if (sheetName === 'tbms') {
        const sCheck = String(rawData.site || rawData.siteName || rawData.site_name || '').trim();
        const tCheck = String(rawData.workTitle || rawData.work_title || rawData.title || '').trim();
        const lCheck = String(rawData.leaderName || rawData.leader_name || rawData.leader || '').trim();
        if (!sCheck && !tCheck && !lCheck) {
          return jsonResponse({ success: false, error: '유효하지 않은 TBM 데이터: 사업장, 작업명, 주관자 중 최소 1개 이상 필요합니다.' });
        }
      }

      const item = normalizeObjectForSheet(sheetName, rawData);
      const keyField = (sheetName === 'users') ? 'username' : (sheetName === 'sites' ? 'id' : (item.log_id ? 'log_id' : 'id'));
      const keyValue = String(item[keyField] || item.log_id || item.id || '').trim();

      const targetHeaders = SCHEMAS[sheetName] || Object.keys(item);
      const headers = ensureHeaders(sheet, targetHeaders);
      const keyColIdx = headers.indexOf(keyField);
      const idColIdx = headers.indexOf('id');
      const logIdColIdx = headers.indexOf('log_id');
      const siteAddrColIdx = (sheetName === 'sites') ? headers.indexOf('address') : -1;

      // 이미 동일한 키(ID / username / log_id 등)가 시트에 존재하면 새 행을 만들지 않고 기존 행을 덮어씀 (중복 생성 원천 차단)
      if (sheet.getLastRow() > 1) {
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          let isMatch = false;

          if (sheetName === 'users' && keyColIdx !== -1) {
            const currentVal = String(rows[i][keyColIdx] || '').trim();
            isMatch = currentVal.toLowerCase() === keyValue.toLowerCase();
          } else if (sheetName === 'sites') {
            const rowId = idColIdx !== -1 ? String(rows[i][idColIdx] || '').trim() : '';
            const nameColIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('site_name');
            const rowName = nameColIdx !== -1 ? String(rows[i][nameColIdx] || '').trim().toLowerCase() : '';
            const rowAddr = siteAddrColIdx !== -1 ? String(rows[i][siteAddrColIdx] || '').trim().toLowerCase() : '';

            const targetId = String(item.id || keyValue).trim();
            const itemName = String(item.name || item.site_name || '').trim().toLowerCase();
            const itemAddr = String(item.address || '').trim().toLowerCase();

            // 1. ID가 일치하면 동일 사업장으로 판정
            const idMatched = Boolean(targetId && rowId && rowId === targetId);
            // 2. 사업장 식별 규칙 (User Rule #7): 반드시 사업장명(name)과 사업장 주소(address)의 조합으로 고유성을 식별
            const compositeMatched = Boolean(itemName && itemAddr && rowName === itemName && rowAddr === itemAddr);

            isMatch = idMatched || compositeMatched;
          } else if (sheetName === 'work_logs') {
            const rowId = idColIdx !== -1 ? String(rows[i][idColIdx] || '').trim() : '';
            const rowLogId = logIdColIdx !== -1 ? String(rows[i][logIdColIdx] || '').trim() : '';
            const targetId = String(item.id || '').trim();
            const targetLogId = String(item.log_id || '').trim();
            const idMatched = Boolean(
              (targetId && (rowId === targetId || rowLogId === targetId)) ||
              (targetLogId && (rowId === targetLogId || rowLogId === targetLogId))
            );

            const writerIdx = headers.indexOf('writer_id');
            const nameIdx = headers.indexOf('name');
            const dateIdx = headers.indexOf('log_date');
            const titleIdx = headers.indexOf('title');
            const rowWriter = writerIdx !== -1 ? String(rows[i][writerIdx] || '').trim().toLowerCase() : '';
            const rowName = nameIdx !== -1 ? String(rows[i][nameIdx] || '').trim().toLowerCase() : '';
            const rowDate = dateIdx !== -1 ? formatKstDate(rows[i][dateIdx], true) : '';
            const rowTitle = titleIdx !== -1 ? String(rows[i][titleIdx] || '').trim().toLowerCase() : '';

            const itemWriter = String(item.writer_id || item.authorUsername || item.name || '').trim().toLowerCase();
            const itemName = String(item.name || '').trim().toLowerCase();
            const itemDate = formatKstDate(item.log_date || item.date || '', true);
            const origDate = formatKstDate(rawData.original_date || rawData._originalDate || rawData.originalDate || '', true);
            const itemTitle = String(item.title || '').trim().toLowerCase();

            const writerMatched = Boolean(
              (itemWriter && (rowWriter === itemWriter || rowName === itemWriter)) ||
              (itemName && (rowName === itemName || rowWriter === itemName))
            );

            const compositeMatched = Boolean(
              writerMatched && itemTitle && rowTitle === itemTitle &&
              (rowDate === itemDate || (origDate && rowDate === origDate))
            );

            isMatch = idMatched || compositeMatched;
          } else if (sheetName === 'security_logs') {
            const rowId = idColIdx !== -1 ? String(rows[i][idColIdx] || '').trim() : '';
            const rowLogId = logIdColIdx !== -1 ? String(rows[i][logIdColIdx] || '').trim() : '';
            const targetId = String(item.id || item.log_id || keyValue).trim();
            const idMatched = Boolean(targetId && (rowId === targetId || rowLogId === targetId));

            const phoneIdx = headers.indexOf('visitor_phone');
            const dateIdx = headers.indexOf('signature_date');
            const rowPhone = phoneIdx !== -1 ? String(rows[i][phoneIdx] || '').replace(/\D/g, '') : '';
            const rowDate = dateIdx !== -1 ? String(rows[i][dateIdx] || '').trim() : '';

            const itemPhone = String(item.visitor_phone || item.visitorPhone || item.phone || '').replace(/\D/g, '');
            const itemDate = String(item.signature_date || item.signatureDate || item.date || '').trim();

            const visitorMatched = Boolean(itemPhone && itemDate && rowPhone === itemPhone && rowDate === itemDate);

            isMatch = idMatched || visitorMatched;
          } else if (sheetName === 'tbms') {
            const rowId = idColIdx !== -1 ? String(rows[i][idColIdx] || '').trim() : '';
            const targetId = String(item.id || keyValue).trim();
            const idMatched = Boolean(targetId && rowId && rowId === targetId);

            if (idMatched) {
              // 1. ID가 일치하면 무조건 동일 레코드 수정으로 판정 (새 행 증식 원천 방지)
              isMatch = true;
            } else {
              // 2. ID가 일치하지 않거나 없는 경우: 복합 키(일자 8자리 + 사업장 + 팀/주관자 + 구분)로 매칭
              const dateIdx = headers.indexOf('date');
              const siteIdx = headers.indexOf('site');
              const leaderIdx = headers.indexOf('leader_name');
              let typeIdx = headers.indexOf('tbm_type');
              if (typeIdx === -1) typeIdx = headers.indexOf('tbmType');
              if (typeIdx === -1) typeIdx = headers.indexOf('구분');

              const rowDateRaw = dateIdx !== -1 ? (rows[i][dateIdx] instanceof Date ? formatKstDate(rows[i][dateIdx], true) : String(rows[i][dateIdx] || '')) : '';
              const rowDateNorm = rowDateRaw.replace(/\D/g, '').slice(0, 8);
              const itemDateNorm = String(item.date || '').replace(/\D/g, '').slice(0, 8);

              const rowSite = siteIdx !== -1 ? String(rows[i][siteIdx] || '').trim().toLowerCase() : '';
              const rowLeader = leaderIdx !== -1 ? String(rows[i][leaderIdx] || '').trim().toLowerCase() : '';
              const rawRowType = typeIdx !== -1 ? String(rows[i][typeIdx] || '').trim().toLowerCase() : '';

              const itemSite = String(item.site || '').trim().toLowerCase();
              const itemLeader = String(item.leader_name || '').trim().toLowerCase();
              const rawItemType = String(item.tbm_type || item.tbmType || item['구분'] || (String(item.id || '').startsWith('tbm_post_') ? 'post' : ((item.postCheck && item.postCheck.isCompleted) ? 'post' : 'pre'))).trim().toLowerCase();

              const normalizeType = function (val, idHint) {
                if (idHint) {
                  if (String(idHint).startsWith('tbm_add_')) return 'additional';
                  if (String(idHint).startsWith('tbm_post_')) return 'post';
                  if (String(idHint).startsWith('tbm_pre_')) return 'pre';
                }
                if (!val) return '';
                if (val.indexOf('추가') !== -1 || val === 'additional') return 'additional';
                if (val.indexOf('후') !== -1 || val === 'post') return 'post';
                if (val.indexOf('전') !== -1 || val === 'pre') return 'pre';
                return val;
              };

              const normRowType = normalizeType(rawRowType, rowId);
              const normItemType = normalizeType(rawItemType, item.id);

              const compositeMatched = Boolean(
                itemDateNorm && itemSite && itemLeader && normItemType &&
                rowDateNorm === itemDateNorm && rowSite === itemSite && rowLeader === itemLeader &&
                normRowType === normItemType
              );

              isMatch = compositeMatched;
            }
          } else if (sheetName === 'daily_reports') {
            const rowId = idColIdx !== -1 ? String(rows[i][idColIdx] || '').trim() : '';
            const rowReportId = headers.indexOf('report_id') !== -1 ? String(rows[i][headers.indexOf('report_id')] || '').trim() : '';
            const targetId = String(item.id || item.report_id || keyValue).trim();
            const idMatched = Boolean(targetId && (rowId === targetId || rowReportId === targetId));

            const dateColIdx = headers.indexOf('daily_date');
            const authorColIdx = headers.indexOf('author_username');
            const rDate = dateColIdx !== -1 ? formatKstDate(rows[i][dateColIdx], true) : '';
            const rAuthor = authorColIdx !== -1 ? String(rows[i][authorColIdx] || '').trim().toLowerCase() : '';
            const iDate = formatKstDate(item.daily_date, true);
            const iAuthor = String(item.author_username || item.authorUsername || '').trim().toLowerCase();
            const compositeMatched = Boolean(iDate && iAuthor && rDate === iDate && rAuthor === iAuthor);

            isMatch = idMatched || compositeMatched;
          } else {
            const rowId = idColIdx !== -1 ? String(rows[i][idColIdx] || '').trim() : '';
            const rowLogId = logIdColIdx !== -1 ? String(rows[i][logIdColIdx] || '').trim() : '';
            const targetId = String(item.id || item.log_id || keyValue).trim();
            isMatch = Boolean(targetId && (rowId === targetId || rowLogId === targetId));
          }

          if (isMatch) {
            const rowNum = i + 1;
            const currentRow = rows[i];
            if (sheetName === 'users') {
              const idCol = headers.indexOf('id');
              if (idCol !== -1 && currentRow[idCol] && !isNaN(parseInt(currentRow[idCol], 10)) && parseInt(currentRow[idCol], 10) > 0) {
                item.id = parseInt(currentRow[idCol], 10);
              }
            }
            const updatedRow = headers.map((h, colIdx) => {
              // TBM 구분 컬럼은 무조건 '업무 전' / '업무 후' / '추가 TBM' 한글로 완벽 보장
              if (sheetName === 'tbms' && (h === 'tbm_type' || h === 'tbmType' || h === '구분')) {
                if (normItemType === 'additional' || String(item.id || '').startsWith('tbm_add_') || String(item.tbm_type || item.tbmType || item['구분'] || '').includes('추가') || String(item.work_title || item.workTitle || '').includes('추가')) {
                  return '추가 TBM';
                }
                return (normItemType === 'post' || String(item.id || '').startsWith('tbm_post_')) ? '업무 후' : '업무 전';
              }
              const val = item[h];
              if (val !== undefined && val !== null && val !== '') {
                return (typeof val === 'object') ? JSON.stringify(val) : val;
              }
              // 새 값이 비어있고 기존 행에 값이 이미 채워져 있다면 기존 값 보존 (기본정보 증발 원천 방지)
              const existingVal = currentRow[colIdx];
              if (existingVal !== undefined && existingVal !== null && existingVal !== '') {
                return existingVal;
              }
              return (val !== undefined && val !== null) ? val : '';
            });
            sheet.getRange(rowNum, 1, 1, headers.length).setValues([updatedRow]);

            // 일자 변경(드래그 이동) 시 기존 일자(origDate) 또는 동일 ID/일지 중복 행이 있다면 완전 삭제하여 과거 일자로 부활하는 현상 차단
            if (sheetName === 'work_logs') {
              const origDate = formatKstDate(rawData.original_date || rawData._originalDate || rawData.originalDate || '', true);
              const itemDate = formatKstDate(item.log_date || item.date || '', true);
              const targetId = String(item.id || '').trim();
              const targetLogId = String(item.log_id || '').trim();
              const itemWriter = String(item.writer_id || item.authorUsername || item.name || '').trim().toLowerCase();
              const itemName = String(item.name || '').trim().toLowerCase();
              const itemTitle = String(item.title || '').trim().toLowerCase();
              const dateIdx = headers.indexOf('log_date');
              const writerIdx = headers.indexOf('writer_id');
              const nameIdx = headers.indexOf('name');
              const titleIdx = headers.indexOf('title');

              const rowsToDelete = [];
              for (let j = rows.length - 1; j >= 1; j--) {
                if (j === i) continue; // 방금 수정한 대상 행은 보존
                const jRow = rows[j];
                const jId = idColIdx !== -1 ? String(jRow[idColIdx] || '').trim() : '';
                const jLogId = logIdColIdx !== -1 ? String(jRow[logIdColIdx] || '').trim() : '';
                const jRowDate = dateIdx !== -1 ? formatKstDate(jRow[dateIdx], true) : '';
                const jRowWriter = writerIdx !== -1 ? String(jRow[writerIdx] || '').trim().toLowerCase() : '';
                const jRowName = nameIdx !== -1 ? String(jRow[nameIdx] || '').trim().toLowerCase() : '';
                const jRowTitle = titleIdx !== -1 ? String(jRow[titleIdx] || '').trim().toLowerCase() : '';

                const idMatches = Boolean(
                  (targetId && (jId === targetId || jLogId === targetId)) ||
                  (targetLogId && (jId === targetLogId || jLogId === targetLogId))
                );

                const compMatches = Boolean(
                  ((jRowWriter && (jRowWriter === itemWriter || jRowName === itemWriter)) || (jRowName && (jRowName === itemName || jRowWriter === itemName))) &&
                  jRowTitle === itemTitle &&
                  (origDate ? (jRowDate === origDate || jRowDate === itemDate) : (jRowDate === itemDate))
                );

                if (idMatches || compMatches) {
                  rowsToDelete.push(j + 1); // 1-indexed row number
                }
              }

              // 아래에서 위로 삭제하여 행 번호 변동 방지
              rowsToDelete.sort((a, b) => b - a).forEach(rNum => {
                try { sheet.deleteRow(rNum); } catch (e) { }
              });
            }

            SpreadsheetApp.flush();
            return jsonResponse({ success: true, message: 'Row updated in-place (deduplicated upsert)', data: item });
          }
        }
      }

      // 일자 이동 대상인데 기존 행을 루프에서 찾지 못한 경우, origDate에 해당 일지가 있다면 덮어쓰기 우선 적용
      const origDate = formatKstDate(rawData.original_date || rawData._originalDate || rawData.originalDate || '', true);
      const itemDate = formatKstDate(item.log_date || item.date || '', true);
      if (sheetName === 'work_logs' && origDate && origDate !== itemDate && sheet.getLastRow() > 1) {
        const rows = sheet.getDataRange().getValues();
        const dateIdx = headers.indexOf('log_date');
        const writerIdx = headers.indexOf('writer_id');
        const nameIdx = headers.indexOf('name');
        const titleIdx = headers.indexOf('title');
        const itemWriter = String(item.writer_id || item.authorUsername || item.name || '').trim().toLowerCase();
        const itemName = String(item.name || '').trim().toLowerCase();
        const itemTitle = String(item.title || '').trim().toLowerCase();
        const targetId = String(item.id || '').trim();
        const targetLogId = String(item.log_id || '').trim();

        for (let i = rows.length - 1; i >= 1; i--) {
          const rId = idColIdx !== -1 ? String(rows[i][idColIdx] || '').trim() : '';
          const rLogId = logIdColIdx !== -1 ? String(rows[i][logIdColIdx] || '').trim() : '';
          const rDate = dateIdx !== -1 ? formatKstDate(rows[i][dateIdx], true) : '';
          const rWriter = writerIdx !== -1 ? String(rows[i][writerIdx] || '').trim().toLowerCase() : '';
          const rName = nameIdx !== -1 ? String(rows[i][nameIdx] || '').trim().toLowerCase() : '';
          const rTitle = titleIdx !== -1 ? String(rows[i][titleIdx] || '').trim().toLowerCase() : '';

          const idMatch = Boolean((targetId && (rId === targetId || rLogId === targetId)) || (targetLogId && (rId === targetLogId || rLogId === targetLogId)));
          const compMatch = Boolean(((rWriter && (rWriter === itemWriter || rName === itemWriter)) || (rName && (rName === itemName || rWriter === itemName))) && rTitle === itemTitle && (rDate === origDate || rDate === itemDate));

          if (idMatch || compMatch) {
            const updatedRow = headers.map((h, colIdx) => {
              if (item[h] !== undefined) {
                const val = item[h];
                return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
              }
              return rows[i][colIdx] !== undefined ? rows[i][colIdx] : '';
            });
            sheet.getRange(i + 1, 1, 1, headers.length).setValues([updatedRow]);
            SpreadsheetApp.flush();
            return jsonResponse({ success: true, message: 'Existing row on origDate updated with new date', data: item });
          }
        }
      }

      if (sheetName === 'users') {
        const numId = parseInt(item.id, 10);
        if (isNaN(numId) || numId <= 0 || String(item.id).trim() !== String(numId)) {
          item.id = getNextUserId(sheet);
        } else {
          item.id = numId;
        }
      }

      appendObjectRow(sheet, headers, item);
      SpreadsheetApp.flush();
      if (sheetName === 'users') {
        try { enforcePasswordHashingInSheet(); } catch (e) { }
        try { enforceNumericUserIds(); } catch (e) { }
      }
      return jsonResponse({ success: true, message: 'Row created', data: item });
    }

    // [2] 데이터 수정 (Update)
    if (action === 'update') {
      const id = payload.id;
      const patch = normalizeObjectForSheet(sheetName, payload.data || {});
      const keyField = payload.key || (sheetName === 'users' ? 'username' : (sheetName === 'sites' ? 'id' : (patch.log_id ? 'log_id' : 'id')));

      const targetHeaders = SCHEMAS[sheetName] || Object.keys(patch);
      const headers = ensureHeaders(sheet, targetHeaders);
      const keyColIdx = headers.indexOf(keyField);
      const idColIdx = headers.indexOf('id');
      const logIdColIdx = headers.indexOf('log_id');
      const rows = sheet.getLastRow() > 1 ? sheet.getDataRange().getValues() : [];

      if (keyColIdx === -1 && idColIdx === -1 && logIdColIdx === -1) {
        return jsonResponse({ success: false, error: 'Key field not found: ' + keyField });
      }

      for (let i = 1; i < rows.length; i++) {
        const cellValue = keyColIdx !== -1 ? String(rows[i][keyColIdx] || '').trim() : '';
        const idVal = idColIdx !== -1 ? String(rows[i][idColIdx] || '').trim() : '';
        const logIdVal = logIdColIdx !== -1 ? String(rows[i][logIdColIdx] || '').trim() : '';
        const targetStr = String(id).trim();

        const isMatch = (sheetName === 'users')
          ? (cellValue.toLowerCase() === targetStr.toLowerCase())
          : (cellValue === targetStr || (idVal && idVal === targetStr) || (logIdVal && logIdVal === targetStr));

        if (isMatch) {
          const rowNum = i + 1;
          const currentRow = rows[i];
          if (sheetName === 'users') {
            const idCol = headers.indexOf('id');
            if (idCol !== -1 && currentRow[idCol] && !isNaN(parseInt(currentRow[idCol], 10)) && parseInt(currentRow[idCol], 10) > 0) {
              patch.id = parseInt(currentRow[idCol], 10);
            }
          }
          const updatedRow = [...rows[i]];
          for (const [k, val] of Object.entries(patch)) {
            const colIdx = headers.indexOf(k);
            if (colIdx !== -1) {
              const cellVal = (typeof val === 'object' && val !== null) ? JSON.stringify(val) : val;
              updatedRow[colIdx] = cellVal;
            }
          }
          sheet.getRange(rowNum, 1, 1, headers.length).setValues([updatedRow]);
          SpreadsheetApp.flush();
          if (sheetName === 'users') {
            try { enforcePasswordHashingInSheet(); } catch (e) { }
            try { enforceNumericUserIds(); } catch (e) { }
          }
          return jsonResponse({ success: true, message: 'Row updated', id: id });
        }
      }

      // 대상이 없으면 새로 추가
      if (sheetName === 'users') {
        const numId = parseInt(patch.id, 10);
        if (isNaN(numId) || numId <= 0 || String(patch.id).trim() !== String(numId)) {
          patch.id = getNextUserId(sheet);
        } else {
          patch.id = numId;
        }
      }
      appendObjectRow(sheet, headers, { ...patch, [keyField]: id });
      SpreadsheetApp.flush();
      if (sheetName === 'users') {
        try { enforcePasswordHashingInSheet(); } catch (e) { }
        try { enforceNumericUserIds(); } catch (e) { }
      }
      return jsonResponse({ success: true, message: 'Row inserted (upsert)', id: id });
    }

    // [3] 데이터 삭제 (Delete)
    if (action === 'delete') {
      const id = String(payload.id || '').trim();
      const keyField = payload.key || 'id';
      const meta = payload.meta || payload.data || {};
      const rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) return jsonResponse({ success: true, message: 'Sheet is empty' });

      const headers = rows[0];
      const keyColIdx = headers.indexOf(keyField);
      const altKeyColIdx = headers.indexOf('log_id');
      const eduIdColIdx = headers.indexOf('edu_id');
      const titleColIdx = headers.indexOf('title');
      const compDateColIdx = headers.indexOf('completion_date');
      const userColIdx = headers.indexOf('user_id');
      const nameColIdx = headers.indexOf('name');

      const targetTitle = String(meta.title || '').trim().toLowerCase();
      const targetComp = formatKstDate(meta.completionDate || meta.completion_date || '', true);
      const targetUser = String(meta.userId || meta.user_id || meta.username || '').trim().toLowerCase();
      const targetName = String(meta.name || '').trim().toLowerCase();

      let deletedCount = 0;
      for (let i = rows.length - 1; i >= 1; i--) {
        const val1 = keyColIdx !== -1 ? String(rows[i][keyColIdx] || '').trim() : '';
        const val2 = altKeyColIdx !== -1 ? String(rows[i][altKeyColIdx] || '').trim() : '';
        const valEdu = eduIdColIdx !== -1 ? String(rows[i][eduIdColIdx] || '').trim() : '';

        let isMatch = Boolean(id && (val1 === id || val2 === id || valEdu === id));

        // edu_logs의 경우 제목 + 수료일 (+ 사용자) 복합 조건으로도 확실한 삭제 지원
        if (!isMatch && sheetName === 'edu_logs' && targetTitle && targetComp) {
          const rowTitle = titleColIdx !== -1 ? String(rows[i][titleColIdx] || '').trim().toLowerCase() : '';
          const rowComp = compDateColIdx !== -1 ? formatKstDate(rows[i][compDateColIdx], true) : '';
          const rowUser = userColIdx !== -1 ? String(rows[i][userColIdx] || '').trim().toLowerCase() : '';
          const rowName = nameColIdx !== -1 ? String(rows[i][nameColIdx] || '').trim().toLowerCase() : '';

          const titleMatched = (rowTitle === targetTitle);
          const compMatched = (rowComp === targetComp);
          const userMatched = (!targetUser && !targetName) ||
            (targetUser && (rowUser === targetUser || rowName === targetUser)) ||
            (targetName && (rowName === targetName || rowUser === targetName));

          if (titleMatched && compMatched && userMatched) {
            isMatch = true;
          }
        }

        // work_logs의 경우 ID 불일치 시 (제목 + 일자 + 작성자) 복합 조건으로도 확실한 삭제 지원
        if (!isMatch && sheetName === 'work_logs') {
          const wTitle = String(meta.title || targetTitle || '').trim().toLowerCase();
          const wDate = formatKstDate(meta.date || meta.log_date || '', true);
          const wWriter = String(meta.writer_id || meta.writerId || meta.authorUsername || meta.name || targetUser || targetName || '').trim().toLowerCase();

          const dateIdx = headers.indexOf('log_date') !== -1 ? headers.indexOf('log_date') : headers.indexOf('date');
          const writerIdx = headers.indexOf('writer_id') !== -1 ? headers.indexOf('writer_id') : headers.indexOf('name');

          const rowTitle = titleColIdx !== -1 ? String(rows[i][titleColIdx] || '').trim().toLowerCase() : '';
          const rowDate = dateIdx !== -1 ? formatKstDate(rows[i][dateIdx], true) : '';
          const rowWriter = writerIdx !== -1 ? String(rows[i][writerIdx] || '').trim().toLowerCase() : '';

          const titleMatched = Boolean(wTitle && rowTitle === wTitle);
          const dateMatched = Boolean(!wDate || rowDate === wDate);
          const writerMatched = Boolean(!wWriter || rowWriter === wWriter || rowWriter.includes(wWriter) || wWriter.includes(rowWriter));

          if (titleMatched && dateMatched && writerMatched) {
            isMatch = true;
          }
        }

        if (isMatch) {
          sheet.deleteRow(i + 1);
          deletedCount++;
        }
      }
      SpreadsheetApp.flush();
      return jsonResponse({ success: true, message: 'Rows deleted: ' + deletedCount, id: id, count: deletedCount });
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

      try { enforcePasswordHashingInSheet(); } catch (e) { }
      try { enforceNumericUserIds(); } catch (e) { }

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
// 구글 드라이브(Google Drive) 사진 자동 저장 헬퍼 함수
// -------------------------------------------------------------

// Global request cache to avoid duplicate Google Drive uploads within the same request execution
var _driveSaveCache = {};
var _targetDriveFolder = null;

/**
 * 📷 Google Drive에 Base64 이미지를 자동 저장하고 영구 공유 URL을 반환하는 함수
 */
function saveBase64ImageToDrive(dataUrl, fileName, folderName) {
  try {
    if (!dataUrl || typeof dataUrl !== 'string') {
      return null;
    }

    // 1. 이미 http/https 웹 URL인 경우 그대로 반환
    if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
      return {
        fileId: '',
        name: fileName || 'photo.jpg',
        viewUrl: dataUrl,
        url: dataUrl,
        thumbnailUrl: dataUrl,
        size: 0
      };
    }

    if (!dataUrl.startsWith('data:image')) {
      return null;
    }

    // 2. 요청 내 중복 업로드 방지 메모리 캐시 확인
    var cacheKey = dataUrl.substring(0, 100) + '_' + dataUrl.length;
    if (_driveSaveCache[cacheKey]) {
      return _driveSaveCache[cacheKey];
    }

    // 3. DataURL 고속 안전 파싱 (정규식 대신 indexOf/substring 사용으로 대용량 Base64 문자열 파싱 100% 보장)
    var marker = ';base64,';
    var markerIdx = dataUrl.indexOf(marker);
    if (markerIdx === -1) {
      return null;
    }

    var contentType = dataUrl.substring(5, markerIdx); // 'data:'.length === 5
    var rawBase64 = dataUrl.substring(markerIdx + marker.length);
    var cleanBase64 = rawBase64.replace(/\s+/g, '');
    var decodedBytes = Utilities.base64Decode(cleanBase64);

    var ext = 'jpg';
    if (contentType.indexOf('png') !== -1) ext = 'png';
    else if (contentType.indexOf('webp') !== -1) ext = 'webp';
    else if (contentType.indexOf('gif') !== -1) ext = 'gif';

    var timeStr = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd_HHmmss');
    var randomSuffix = Math.floor(1000 + Math.random() * 9000);
    var safeName = fileName ? (fileName.replace(/\.[^/.]+$/, '') + '_' + timeStr + '.' + ext) : ('tbm_' + timeStr + '_' + randomSuffix + '.' + ext);

    var blob = Utilities.newBlob(decodedBytes, contentType, safeName);

    // 4. 구글 드라이브 전용 폴더 (WithSharing_TBM_Photos) 조회/생성
    if (!_targetDriveFolder) {
      _targetDriveFolder = getOrCreateDriveFolder(folderName || 'WithSharing_TBM_Photos');
    }
    var targetFolder = _targetDriveFolder;

    // 5. 파일 생성 및 누구나 링크로 보기 권한 부여
    var file = targetFolder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) { }

    var fileId = file.getId();
    var viewUrl = file.getUrl();
    var directCdnUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
    var thumbnailUrl = directCdnUrl;

    var resultInfo = {
      fileId: fileId,
      name: safeName,
      viewUrl: viewUrl,
      url: directCdnUrl,
      thumbnailUrl: thumbnailUrl,
      size: decodedBytes.length
    };

    _driveSaveCache[cacheKey] = resultInfo;
    return resultInfo;
  } catch (err) {
    Logger.log('Drive image save error: ' + err.toString());
    return null;
  }
}

/**
 * 📁 구글 드라이브 폴더 생성 또는 기존 폴더 반환
 */
function getOrCreateDriveFolder(folderName) {
  try {
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      return folders.next();
    }
    return DriveApp.createFolder(folderName);
  } catch (err) {
    Logger.log('getOrCreateDriveFolder error: ' + err.toString());
    return DriveApp.getRootFolder();
  }
}

// -------------------------------------------------------------
// 헬퍼 유틸리티 함수
// -------------------------------------------------------------

/**
 * 비밀번호 SHA-256 단방향 솔트 해시 변환 (스프레드시트 내 비밀번호 원본 노출 원천 차단)
 */
function hashPasswordInGas(plain) {
  if (!plain) return '';
  const str = String(plain).trim();
  if (/^[a-f0-9]{64}$/i.test(str)) {
    return str.toLowerCase();
  }
  const salted = "WithSecurity_SALT_2026_" + str;
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salted, Utilities.Charset.UTF_8);
  let hex = '';
  for (let i = 0; i < rawHash.length; i++) {
    let byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    let byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    hex += byteHex;
  }
  return hex;
}

/**
 * 🔢 users 시트에서 사용 가능한 다음 순차 숫자 ID 번호 반환
 */
function getNextUserId(sheet) {
  try {
    if (!sheet || sheet.getLastRow() <= 1) return 1;
    const range = sheet.getDataRange();
    const rows = range.getValues();
    const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
    const idIdx = headers.indexOf('id');
    if (idIdx === -1) return sheet.getLastRow();
    let maxId = 0;
    for (let i = 1; i < rows.length; i++) {
      const val = parseInt(rows[i][idIdx], 10);
      if (!isNaN(val) && val > maxId) {
        maxId = val;
      }
    }
    return maxId > 0 ? maxId + 1 : (sheet.getLastRow() > 1 ? sheet.getLastRow() : 1);
  } catch (e) {
    return 1;
  }
}

/**
 * 🔢 users 시트 내 모든 사용자의 id를 순차적인 숫자(1, 2, 3...)로 자동 정규화
 */
function enforceNumericUserIds() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('users');
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, count: 0 };

    const range = sheet.getDataRange();
    const rows = range.getValues();
    const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
    const idIdx = headers.indexOf('id');
    if (idIdx === -1) return { success: true, count: 0 };

    let modified = false;
    const seenIds = new Set();
    const invalidRowIndices = [];

    // 1단계: 유효한 양의 정수 ID 수집
    for (let r = 1; r < rows.length; r++) {
      const raw = rows[r][idIdx];
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num > 0 && String(raw).trim() === String(num) && !seenIds.has(num)) {
        seenIds.add(num);
      } else {
        invalidRowIndices.push(r);
      }
    }

    // 2단계: 숫자가 아니거나 비어있거나 중복된 id 행에 1부터 순차적인 고유 번호 자동 할당
    let nextNum = 1;
    for (const r of invalidRowIndices) {
      while (seenIds.has(nextNum)) {
        nextNum++;
      }
      rows[r][idIdx] = nextNum;
      seenIds.add(nextNum);
      modified = true;
      nextNum++;
    }

    if (modified) {
      range.setValues(rows);
      SpreadsheetApp.flush();
      Logger.log('🔢 사용자 id 숫자(1, 2, 3...) 자동 정리 완료: ' + invalidRowIndices.length + '건 교정');
    }
    return { success: true, count: invalidRowIndices.length };
  } catch (err) {
    Logger.log('enforceNumericUserIds error: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * 🔒 스프레드시트 users 시트 내 모든 행의 비밀번호를 즉시 SHA-256 해시값으로 변환
 * (password, passward, passwordHash, 비밀번호 컬럼 등 모든 별칭 컬럼 자동 검출 및 일괄 암호화)
 */
function enforcePasswordHashingInSheet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('users');
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, count: 0 };

    const range = sheet.getDataRange();
    const rows = range.getValues();
    const headers = rows[0].map(h => String(h || '').trim().toLowerCase());

    const passIndices = [];
    headers.forEach((h, idx) => {
      if (h === 'password' || h === 'passward' || h === 'passwordhash' || h === 'password_hash' || h === '비밀번호' || h === '패스워드') {
        passIndices.push(idx);
      }
    });

    if (passIndices.length === 0) return { success: true, count: 0 };

    let convertedCount = 0;
    for (let r = 1; r < rows.length; r++) {
      for (const pIdx of passIndices) {
        const cellVal = String(rows[r][pIdx] || '').trim();
        if (cellVal && !/^[a-f0-9]{64}$/i.test(cellVal)) {
          rows[r][pIdx] = hashPasswordInGas(cellVal);
          convertedCount++;
        }
      }
    }

    if (convertedCount > 0) {
      range.setValues(rows);
      SpreadsheetApp.flush();
      Logger.log('🔒 사용자 비밀번호 ' + convertedCount + '건 SHA-256 해시값으로 즉시 암호화 완료');
    }
    return { success: true, count: convertedCount };
  } catch (err) {
    Logger.log('enforcePasswordHashingInSheet error: ' + err.toString());
    return { success: false, error: err.toString() };
  }
}

/**
 * ⚡ 사용자가 스프레드시트에서 직접 비밀번호를 입력하거나 수정할 때 실시간 SHA-256 자동 암호화
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    if (sheet.getName() !== 'users') return;
    const row = e.range.getRow();
    if (row <= 1) return;

    const col = e.range.getColumn();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h || '').trim().toLowerCase());
    const headerName = headers[col - 1] || '';

    if (headerName === 'password' || headerName === 'passward' || headerName === 'passwordhash' || headerName === 'password_hash' || headerName === '비밀번호' || headerName === '패스워드') {
      const val = String(e.value || e.range.getValue() || '').trim();
      if (val && !/^[a-f0-9]{64}$/i.test(val)) {
        e.range.setValue(hashPasswordInGas(val));
      }
    }
  } catch (err) {
    Logger.log('onEdit password hash error: ' + err.toString());
  }
}


/**
 * 👥 TBM 참석자를 구글 스프레드시트용 간결 포맷("이름 직급, 이름 직급")으로 변환
 * (사업부 TBM 특성상 팀/전화번호 등 불필요한 부가정보 제외)
 */
function formatAttendeesForSheet(rawAtts) {
  if (!rawAtts) return '';
  var list = rawAtts;
  if (typeof list === 'string') {
    var trimmed = list.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try { list = JSON.parse(trimmed); } catch (e) { return trimmed; }
    } else {
      return trimmed;
    }
  }
  if (!Array.isArray(list)) list = [list];

  return list.map(function (a) {
    if (!a) return '';
    if (typeof a === 'string') return a.trim();
    var name = String(a.name || '').trim();
    if (!name) return '';
    var rank = String(a.rank || '').trim();
    return rank ? (name + ' ' + rank) : name;
  }).filter(Boolean).join(', ');
}

/**
 * 🚫 TBM 미참석자를 구글 스프레드시트용 포맷("이름 직급 [이유], ...")으로 변환
 */
function formatAbsenteesForSheet(rawAbs) {
  if (!rawAbs) return '';
  var list = rawAbs;
  if (typeof list === 'string') {
    var trimmed = list.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try { list = JSON.parse(trimmed); } catch (e) { return trimmed; }
    } else {
      return trimmed;
    }
  }
  if (!Array.isArray(list)) list = [list];

  return list.map(function (a) {
    if (!a) return '';
    if (typeof a === 'string') return a.trim();
    var name = String(a.name || '').trim();
    if (!name) return '';
    var rank = String(a.rank || '').trim();
    var reason = String(a.reason || '').trim();
    var nameRank = rank ? (name + ' ' + rank) : name;
    return reason ? (nameRank + ' [' + reason + ']') : nameRank;
  }).filter(Boolean).join(', ');
}

// TBM 점검 항목 한글 매핑 맵 (실제 사용자가 체크 가능한 19개 표준 점검 항목)
var TBM_CHECKLIST_LABELS = {
  // 작업 전 안전 점검 항목 (7개)
  teamSafetySlogan: '팀 안전구호',
  prePpeCheck: '작업전 보호구 확인',
  businessTripSafety: '출장자 안전수칙',
  hazardPredictionTraining: '위험예지 훈련',
  dangerPointCheck: '위험점 확인',
  emergencyResponseCheck: '비상대응 절차 확인',
  safetyDocTraining: '안전문서 교육',

  // 4대 사후 안전·보안 점검 항목 (4개)
  cleanupCheck: '현장 정리정돈',
  toolRecoveryCheck: '공구·자재 회수',
  securityMediaCheck: '보안매체·문서 점검',
  powerSafetyCheck: '잔류 전원·화기 확인',

  // 작업 후 안전 점검 항목 (8개)
  sitePatrolCheck: '현장 순회 점검',
  stopWorkAuthority: '작업 중지권 시행',
  nearMissDiscovery: '아차사고 및 잠재위험 발굴',
  fiveSThreeRCheck: '5S3정 및 청소상태',
  workerInterview: '작업자 인터뷰',
  siteImprovementActivity: '현장 개선 활동',
  emergencyEvacuationDrill: '비상대피훈련',
  safetyEducation: '교육'
};

// 한글 라벨 -> 점검 항목 키 역매핑 맵 (띄어쓰기 및 기호 변형 100% 수용)
var LABEL_TO_CHECKLIST_KEY = {
  '팀 안전구호': 'teamSafetySlogan',
  '팀안전구호': 'teamSafetySlogan',
  '작업전 보호구 확인': 'prePpeCheck',
  '작업 전 보호구 확인': 'prePpeCheck',
  '작업전보호구확인': 'prePpeCheck',
  '출장자 안전수칙': 'businessTripSafety',
  '출장자안전수칙': 'businessTripSafety',
  '위험예지 훈련': 'hazardPredictionTraining',
  '위험예지훈련': 'hazardPredictionTraining',
  '위험점 확인': 'dangerPointCheck',
  '위험점확인': 'dangerPointCheck',
  '비상대응 절차 확인': 'emergencyResponseCheck',
  '비상대응절차확인': 'emergencyResponseCheck',
  '안전문서 교육': 'safetyDocTraining',
  '안전문서교육': 'safetyDocTraining',

  '현장 정리정돈': 'cleanupCheck',
  '현장정리정돈': 'cleanupCheck',
  '공구·자재 회수': 'toolRecoveryCheck',
  '공구 자재 회수': 'toolRecoveryCheck',
  '공구자재회수': 'toolRecoveryCheck',
  '보안매체·문서 점검': 'securityMediaCheck',
  '보안매체 문서 점검': 'securityMediaCheck',
  '보안매체문서점검': 'securityMediaCheck',
  '잔류 전원·화기 확인': 'powerSafetyCheck',
  '잔류 전원 화기 확인': 'powerSafetyCheck',
  '잔류전원화기확인': 'powerSafetyCheck',

  '현장 순회 점검': 'sitePatrolCheck',
  '현장순회점검': 'sitePatrolCheck',
  '작업 중지권 시행': 'stopWorkAuthority',
  '작업중지권 시행': 'stopWorkAuthority',
  '작업중지권시행': 'stopWorkAuthority',
  '아차사고 및 잠재위험 발굴': 'nearMissDiscovery',
  '아차사고및잠재위험발굴': 'nearMissDiscovery',
  '5S3정 및 청소상태': 'fiveSThreeRCheck',
  '작업자 인터뷰': 'workerInterview',
  '작업자인터뷰': 'workerInterview',
  '현장 개선 활동': 'siteImprovementActivity',
  '현장개선활동': 'siteImprovementActivity',
  '비상대피훈련': 'emergencyEvacuationDrill',
  '비상 대피 훈련': 'emergencyEvacuationDrill',
  '교육': 'safetyEducation'
};

// 점검 항목 유효 라벨 변환기 (띄어쓰기, 기호, 영문 키를 표준 한글 라벨로 100% 매핑)
function getChecklistLabel(val) {
  if (!val) return '';
  var s = String(val).trim();
  if (TBM_CHECKLIST_LABELS[s]) return TBM_CHECKLIST_LABELS[s];
  if (LABEL_TO_CHECKLIST_KEY[s]) {
    var key = LABEL_TO_CHECKLIST_KEY[s];
    return TBM_CHECKLIST_LABELS[key] || s;
  }

  // 공백 및 기호 제거 정규화 매칭
  var cleanNorm = s.replace(/[\s·・ㆍ_\-\/\\]+/g, '').toLowerCase();
  for (var k in TBM_CHECKLIST_LABELS) {
    if (k.toLowerCase() === cleanNorm) return TBM_CHECKLIST_LABELS[k];
    var lbl = TBM_CHECKLIST_LABELS[k];
    var normLbl = lbl.replace(/[\s·・ㆍ_\-\/\\]+/g, '').toLowerCase();
    if (cleanNorm === normLbl) return lbl;
  }
  for (var l in LABEL_TO_CHECKLIST_KEY) {
    var normL = l.replace(/[\s·・ㆍ_\-\/\\]+/g, '').toLowerCase();
    if (cleanNorm === normL) {
      var mappedKey = LABEL_TO_CHECKLIST_KEY[l];
      return TBM_CHECKLIST_LABELS[mappedKey] || l;
    }
  }
  return s;
}

/**
 * 📋 TBM 점검 체크리스트를 구글 스프레드시트용 텍스트("항목1, 항목2, ...")로 통합 변환
 * (사용자가 실제로 체크한 점검 항목만 정확하게 기록하며, 임의 문구나 전달사항/note는 제외)
 */
function formatCheckListForSheet(preChk, postChk, isPost, isAdditional) {
  var items = [];

  // 1. 작업 전 점검 항목 (업무 전 TBM, 추가 TBM, 또는 전/후 통합 TBM)
  if (preChk) {
    if (typeof preChk === 'string') {
      try { preChk = JSON.parse(preChk); } catch (e) { preChk = {}; }
    }
    if (preChk && typeof preChk === 'object') {
      if (Array.isArray(preChk.selectedItems)) {
        preChk.selectedItems.forEach(function (item) {
          var label = getChecklistLabel(item);
          if (label && items.indexOf(label) === -1) items.push(label);
        });
      }
      Object.keys(TBM_CHECKLIST_LABELS).forEach(function (k) {
        if (preChk[k] === true || preChk[k] === 1 || preChk[k] === 'true') {
          var label = TBM_CHECKLIST_LABELS[k];
          if (label && items.indexOf(label) === -1) items.push(label);
        }
      });
    }
  }

  // 2. 작업 후 점검 항목 (업무 후 TBM 또는 사후 점검이 완료된 경우에만 체크된 항목 추가)
  // (※ 추가 TBM은 업무 전 사전 점검이므로 사후 점검 항목을 추가하지 않음)
  if (postChk && !isAdditional) {
    if (typeof postChk === 'string') {
      try { postChk = JSON.parse(postChk); } catch (e) { postChk = {}; }
    }
    if (postChk && typeof postChk === 'object') {
      var isPostCompleted = Boolean(isPost || postChk.isCompleted);
      if (isPostCompleted) {
        // 4대 사후 안전·보안 점검 (실제 체크된 경우에만)
        if (postChk.cleanupCheck === true || postChk.cleanupCheck === 1 || postChk.cleanupCheck === 'true') {
          if (items.indexOf('현장 정리정돈') === -1) items.push('현장 정리정돈');
        }
        if (postChk.toolRecoveryCheck === true || postChk.toolRecoveryCheck === 1 || postChk.toolRecoveryCheck === 'true') {
          if (items.indexOf('공구·자재 회수') === -1) items.push('공구·자재 회수');
        }
        if (postChk.securityMediaCheck === true || postChk.securityMediaCheck === 1 || postChk.securityMediaCheck === 'true') {
          if (items.indexOf('보안매체·문서 점검') === -1) items.push('보안매체·문서 점검');
        }
        if (postChk.powerSafetyCheck === true || postChk.powerSafetyCheck === 1 || postChk.powerSafetyCheck === 'true') {
          if (items.indexOf('잔류 전원·화기 확인') === -1) items.push('잔류 전원·화기 확인');
        }

        if (Array.isArray(postChk.selectedItems)) {
          postChk.selectedItems.forEach(function (item) {
            var label = getChecklistLabel(item);
            if (label && items.indexOf(label) === -1) items.push(label);
          });
        }
        Object.keys(TBM_CHECKLIST_LABELS).forEach(function (k) {
          if (postChk[k] === true || postChk[k] === 1 || postChk[k] === 'true') {
            var label = TBM_CHECKLIST_LABELS[k];
            if (label && items.indexOf(label) === -1) items.push(label);
          }
        });
      }
    }
  }

  return items.filter(Boolean).join(', ');
}

/**
 * 객체를 MySQL 테이블 표준 컬럼 형식으로 100% 매핑 및 정규화
 */
function normalizeObjectForSheet(sheetName, rawObj) {
  if (!rawObj || typeof rawObj !== 'object') return {};
  const obj = { ...rawObj };

  // 1. 사용자 계정 (security_user) - id는 순차 숫자, 비밀번호는 무조건 SHA-256 해시로만 기록 (L~O열 교육 필드 제외)
  if (sheetName === 'users') {
    let passVal = String(obj.password || obj.passwordHash || obj.passward || obj.password_hash || obj['비밀번호'] || '').trim();
    if (passVal) {
      passVal = hashPasswordInGas(passVal);
    }
    const rawId = obj.id;
    const numId = parseInt(rawId, 10);
    const validId = (!isNaN(numId) && numId > 0 && String(rawId).trim() === String(numId)) ? numId : '';

    return {
      id: validId,
      username: String(obj.username || '').trim().toLowerCase(),
      password: passVal,
      passward: passVal,
      passwordHash: passVal,
      name: obj.name || obj.authorName || obj.userName || '',
      role: obj.role || '일반',
      division: obj.division || '',
      team: obj.team || obj.department || '',
      rank: obj.rank || '',
      siteId: obj.siteId || obj.site_id || '',
      phone: obj.phone || '',
      email: obj.email || '',
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
    const idVal = obj.log_id || obj.logId || obj.id || `LOG-${Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMddHHmmss')}`;
    const rawLogDate = obj.log_date || obj.logDate || obj.date;
    const lDate = rawLogDate ? formatKstDate(rawLogDate, true) : Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    const rawDueDate = obj.due_date || obj.dueDate || '';
    const dDate = rawDueDate ? formatKstDate(rawDueDate, true) : '';
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
      due_date: dDate,
      site_name: obj.site_name || obj.siteName || obj.site || '',
      log_date: lDate,
      title: obj.title || '업무 일지',
      tasks_done: obj.tasks_done || obj.tasksDone || obj.details || obj.content || '',
      is_shared: isSh,
      shared_with: (typeof sWith === 'object' && sWith !== null) ? JSON.stringify(sWith) : String(sWith || ''),
      shared_at: obj.shared_at || obj.sharedAt || '',
      created_at: obj.created_at || obj.createdAt || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss')
    };
  }

  // 4. 보안 서약 (security_log)
  if (sheetName === 'security_logs') {
    const idVal = obj.log_id || obj.logId || obj.id || `PASS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const docChk = obj.docChecklist || {};
    const nowStr = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
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
      weekly_monday: formatKstDate(obj.weekly_monday || obj.weeklyMonday, true) || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'),
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
      created_at: obj.created_at || obj.createdAt || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss')
    };
  }

  // 5-1. 일일 업무 보고서 (daily_reports) - id 단일화 및 공유자/공유대상 분리 컬럼
  if (sheetName === 'daily_reports') {
    const dDate = formatKstDate(obj.daily_date || obj.dailyDate || obj.date, true) || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    const uName = obj.author_username || obj.authorUsername || obj.writerId || obj.username || 'user';
    const dId = obj.id || obj.report_id || obj.reportId || `daily-rep-${uName}-${dDate}`;
    const nowStr = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

    let sharedWithStr = '';
    if (Array.isArray(obj.shared_with || obj.sharedWith)) {
      sharedWithStr = (obj.shared_with || obj.sharedWith).join(', ');
    } else if (obj.shared_with || obj.sharedWith) {
      sharedWithStr = String(obj.shared_with || obj.sharedWith);
    }

    return {
      id: dId,
      daily_date: dDate,
      author_name: obj.author_name || obj.authorName || obj.name || '',
      author_username: uName,
      author_team: obj.author_team || obj.authorTeam || obj.team || '',
      author_rank: obj.author_rank || obj.authorRank || obj.rank || '',
      author_division: obj.author_division || obj.authorDivision || obj.division || '',
      author_role: obj.author_role || obj.authorRole || obj.role || '일반',
      issues: obj.issues || obj.special_notes || obj.specialNotes || '',
      today_tasks: obj.today_tasks || obj.todayTasks || '',
      tomorrow_plan: obj.tomorrow_plan || obj.tomorrowPlan || '',
      shared_by: obj.shared_by || obj.sharedBy || '',
      shared_with: sharedWithStr,
      shared_at: obj.shared_at || obj.sharedAt || '',
      created_at: obj.created_at || obj.createdAt || nowStr,
      updated_at: obj.updated_at || obj.updatedAt || nowStr
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
      completion_date: formatKstDate(obj.completion_date || obj.completionDate || obj.date, true) || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'),
      validity_period: String(obj.validity_period || obj.validityPeriod || '12'),
      expiry_date: formatKstDate(obj.expiry_date || obj.expiryDate, true),
      memo: obj.memo || obj.notes || '',
      created_at: obj.created_at || obj.createdAt || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss')
    };
  }

  // 7. TBM (tbms)
  if (sheetName === 'tbms') {
    const idVal = obj.id || obj.tbm_id || obj.tbmId || `TBM-${Date.now()}`;
    const rawDate = obj.date || obj.log_date || obj.logDate || '';
    const dVal = rawDate ? formatKstDate(rawDate, true) : Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    let atts = obj.attendees || [];
    let abs = obj.absentees || [];
    const postChkForAbs = obj.postCheck || obj.post_check || {};
    if ((!abs || (Array.isArray(abs) && abs.length === 0)) && postChkForAbs && Array.isArray(postChkForAbs.absentees) && postChkForAbs.absentees.length > 0) {
      abs = postChkForAbs.absentees;
    }

    const allDriveUrls = [];

    // 사진 단일 항목 안전 처리 헬퍼 (문자열 URL, base64, 객체 형태 모두 완벽 대응 및 구글 드라이브 업로드)
    function processPhotoItem(p, defaultName) {
      if (!p) return null;
      var dataUrl = '';
      var pName = defaultName || 'tbm_photo.jpg';
      var pId = '';
      var pTaken = '';
      var pSize = 0;
      var pUrl = '';
      var pViewUrl = '';
      var pThumb = '';

      if (typeof p === 'string') {
        dataUrl = p.trim();
      } else if (typeof p === 'object') {
        dataUrl = String(p.dataUrl || p.url || p.viewUrl || '').trim();
        pName = p.name || defaultName;
        pId = p.id || '';
        pTaken = p.takenAt || p.timestamp || '';
        pSize = p.size || 0;
        pUrl = p.url || '';
        pViewUrl = p.viewUrl || '';
        pThumb = p.thumbnailUrl || '';
      }

      var driveInfo = null;
      if (dataUrl) {
        if (dataUrl.startsWith('data:image')) {
          driveInfo = saveBase64ImageToDrive(dataUrl, pName, 'WithSharing_TBM_Photos');
        } else if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
          pUrl = dataUrl;
          pViewUrl = dataUrl;
        }
      }

      var finalUrl = (driveInfo && driveInfo.url) || pUrl || pViewUrl || pThumb || '';
      var finalViewUrl = (driveInfo && driveInfo.viewUrl) || pViewUrl || finalUrl;
      var finalThumb = (driveInfo && driveInfo.thumbnailUrl) || pThumb || finalUrl;

      var urlToRecord = finalViewUrl || finalUrl;
      if (urlToRecord && allDriveUrls.indexOf(urlToRecord) === -1) {
        allDriveUrls.push(urlToRecord);
      }

      return {
        id: pId || ('photo_' + Date.now()),
        name: pName,
        size: (driveInfo && driveInfo.size) || pSize,
        takenAt: pTaken,
        timestamp: pTaken,
        driveFileId: (driveInfo && driveInfo.fileId) || '',
        url: finalUrl,
        viewUrl: finalViewUrl,
        thumbnailUrl: finalThumb
      };
    }

    // 1. pre_check photos 구글 드라이브 자동 저장 및 URL 변환
    let preChk = obj.preCheck || obj.pre_check || {};
    if (typeof preChk === 'string') {
      try { preChk = JSON.parse(preChk); } catch (e) { preChk = {}; }
    }
    if (preChk && typeof preChk === 'object') {
      preChk = { ...preChk };
      if (Array.isArray(preChk.photos)) {
        preChk.photos = preChk.photos.map(function (p, pIdx) {
          return processPhotoItem(p, 'tbm_pre_' + dVal + '_' + (pIdx + 1) + '.jpg');
        }).filter(Boolean);
      }
    }

    // 2. post_check photos 구글 드라이브 자동 저장 및 URL 변환
    let postChk = obj.postCheck || obj.post_check || {};
    if (typeof postChk === 'string') {
      try { postChk = JSON.parse(postChk); } catch (e) { postChk = {}; }
    }
    if (postChk && typeof postChk === 'object') {
      postChk = { ...postChk };
      if (Array.isArray(postChk.photos)) {
        postChk.photos = postChk.photos.map(function (p, pIdx) {
          return processPhotoItem(p, 'tbm_post_' + dVal + '_' + (pIdx + 1) + '.jpg');
        }).filter(Boolean);
      }
    }

    // 3. additional_tbms photos 구글 드라이브 자동 저장 및 URL 변환
    let addTbms = obj.additional_tbms || obj.additionalTbms || [];
    if (typeof addTbms === 'string') {
      try { addTbms = JSON.parse(addTbms); } catch (e) { addTbms = []; }
    }
    if (Array.isArray(addTbms)) {
      addTbms = addTbms.map(function (a, aIdx) {
        let photosList = Array.isArray(a.photos) ? a.photos : [];
        if (photosList.length === 0 && a.photo) {
          photosList = [a.photo];
        }
        const mappedPhotos = photosList.map(function (p, pIdx) {
          return processPhotoItem(p, 'tbm_add_' + dVal + '_' + (aIdx + 1) + '_' + (pIdx + 1) + '.jpg');
        }).filter(Boolean);

        return {
          ...a,
          photo: mappedPhotos[0]?.viewUrl || mappedPhotos[0]?.url || '',
          photos: mappedPhotos
        };
      });
    }

    // 4. root photos 구글 드라이브 자동 저장 및 URL 변환
    if (Array.isArray(obj.photos)) {
      obj.photos.forEach(function (p, pIdx) {
        processPhotoItem(p, 'tbm_photo_' + dVal + '_' + (pIdx + 1) + '.jpg');
      });
    }

    // 5. 이미 photo_url 또는 photo_urls가 전달된 경우 추가 합산
    const incomingPhotoStr = String(obj.photo_url || obj.photoUrl || obj.photo_urls || obj.photoUrls || obj.photo || '').trim();
    if (incomingPhotoStr) {
      const rawUrls = incomingPhotoStr.split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
      rawUrls.forEach(function (u) {
        if (u && allDriveUrls.indexOf(u) === -1) allDriveUrls.push(u);
      });
    }

    function safeJsonStringifyForSheet(dataObj, maxLen) {
      if (!dataObj) return '{}';
      let json = JSON.stringify(dataObj);
      if (json.length <= maxLen) return json;

      try {
        const copy = JSON.parse(JSON.stringify(dataObj));
        if (Array.isArray(copy.photos)) {
          copy.photos = copy.photos.map(function (p) {
            return {
              id: p.id || '',
              name: p.name || '',
              size: p.size || 0,
              takenAt: p.takenAt || p.timestamp || '',
              url: p.url || p.viewUrl || '',
              viewUrl: p.viewUrl || p.url || '',
              thumbnailUrl: p.thumbnailUrl || p.url || ''
            };
          });
        }
        json = JSON.stringify(copy);
        if (json.length <= maxLen) return json;
      } catch (e) { }

      try {
        const minimal = {
          isCompleted: Boolean(dataObj.isCompleted),
          selectedItems: Array.isArray(dataObj.selectedItems) ? dataObj.selectedItems : [],
          photoCount: Array.isArray(dataObj.photos) ? dataObj.photos.length : 0,
          photos: (Array.isArray(dataObj.photos) ? dataObj.photos : []).map(function (p) {
            return { id: p.id || '', name: p.name || '', url: p.url || p.viewUrl || '' };
          })
        };
        json = JSON.stringify(minimal);
        if (json.length <= maxLen) return json;
      } catch (e) { }

      return '{}';
    }

    // 기본 정보 완벽 추출 (모든 필드명 변형 수용)
    const siteVal = String(obj.site || obj.siteName || obj.site_name || '').trim();
    const siteAddrVal = String(obj.siteAddress || obj.site_address || obj.address || '').trim();
    const workTitleVal = String(obj.workTitle || obj.work_title || obj.title || '').trim();
    const workCatVal = String(obj.workCategory || obj.work_category || '일반작업').trim();
    const leaderDivVal = String(obj.leaderDivision || obj.leader_division || obj.division || '').trim();
    const leaderTeamVal = String(obj.leaderTeam || obj.leader_team || obj.team || obj.department || '').trim();
    const leaderNameVal = String(obj.leaderName || obj.leader_name || obj.leader || '').trim();
    const leaderRankVal = String(obj.leaderRank || obj.leader_rank || obj.rank || '대리').trim();
    const leaderPhoneVal = String(obj.leaderPhone || obj.leader_phone || obj.phone || '').trim();
    const rawType = String(obj.tbm_type || obj.tbmType || obj['구분'] || '').trim().toLowerCase();
    let isPost = false;
    let isAdditional = Boolean(
      String(idVal).startsWith('tbm_add_') ||
      rawType.indexOf('추가') !== -1 ||
      rawType === 'additional' ||
      String(obj.work_title || obj.workTitle || '').includes('추가') ||
      (obj.parent_tbm_id && String(obj.parent_tbm_id).trim() !== '') ||
      (obj.parentTbmId && String(obj.parentTbmId).trim() !== '')
    );
    if (isAdditional) {
      isPost = false;
    } else if (String(idVal).startsWith('tbm_post_')) {
      isPost = true;
    } else if (String(idVal).startsWith('tbm_pre_')) {
      isPost = false;
    } else if (rawType.indexOf('후') !== -1 || rawType === 'post') {
      isPost = true;
    } else if (rawType.indexOf('전') !== -1 || rawType === 'pre') {
      isPost = false;
    } else {
      isPost = Boolean(postChk && postChk.isCompleted && (!preChk || !preChk.isCompleted));
    }
    const tbmTypeVal = isAdditional ? '추가 TBM' : (isPost ? '업무 후' : '업무 전');

    // 전달 사항 및 지도 내역 또는 추가 TBM 작업 내용/특이사항 우선 반영하여 work_content 컬럼에 100% 저장
    const preNotes = (preChk && preChk.notes) ? String(preChk.notes).trim() : '';
    const postNotes = (postChk && (postChk.handoverNotes || postChk.notes)) ? String(postChk.handoverNotes || postChk.notes).trim() : '';
    const rootNotes = String(obj.notes || '').trim();
    let workContentVal = String(obj.work_content || obj.workContent || obj.content || '').trim();
    if (!workContentVal) {
      if (isAdditional) {
        workContentVal = rootNotes || preNotes || postNotes;
      } else if (isPost) {
        workContentVal = postNotes || preNotes || rootNotes;
      } else {
        workContentVal = preNotes || postNotes || rootNotes;
      }
    }

    // 📋 점검 체크리스트(check_list): 클라이언트 전달값과 preCheck/postCheck 점검항목을 합산하여 100% 보존
    let checkListStr = '';
    const incomingCheckList = String(obj.check_list || obj.checkList || obj.checklist || obj['Check List'] || obj['체크리스트'] || '').trim();
    const computedCheckList = formatCheckListForSheet(preChk, postChk, isPost, isAdditional);
    const combinedValidLabels = [];

    const addLabelTokens = function (str) {
      if (!str) return;
      const tokens = str.split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
      tokens.forEach(function (tok) {
        const lbl = getChecklistLabel(tok) || tok;
        if (lbl && combinedValidLabels.indexOf(lbl) === -1) {
          combinedValidLabels.push(lbl);
        }
      });
    };

    addLabelTokens(incomingCheckList);
    addLabelTokens(computedCheckList);
    checkListStr = combinedValidLabels.join(', ');

    const photoUrlsStr = allDriveUrls.join('\n');
    const statusVal = String(obj.status || (isPost ? 'ALL_COMPLETED' : 'PRE_COMPLETED')).trim() || 'PRE_COMPLETED';

    return {
      // 정규화 완료 플래그 (중복 업로드 방지)
      _isNormalized: true,

      // 1. 식별자 및 일자
      id: idVal,
      tbm_id: idVal,
      tbmId: idVal,
      date: dVal,
      log_date: dVal,
      logDate: dVal,

      // 2. 사업장 정보 (양방향 매핑)
      site: siteVal,
      site_name: siteVal,
      siteName: siteVal,
      site_address: siteAddrVal,
      siteAddress: siteAddrVal,
      address: siteAddrVal,

      // 3. 작업 정보 (양방향 매핑)
      work_title: workTitleVal,
      workTitle: workTitleVal,
      title: workTitleVal,
      work_category: workCatVal,
      workCategory: workCatVal,

      // 4. 주관자 정보 (양방향 매핑)
      leader_division: leaderDivVal,
      leaderDivision: leaderDivVal,
      division: leaderDivVal,
      leader_team: leaderTeamVal,
      leaderTeam: leaderTeamVal,
      team: leaderTeamVal,
      department: leaderTeamVal,
      leader_name: leaderNameVal,
      leaderName: leaderNameVal,
      leader: leaderNameVal,
      leader_rank: leaderRankVal,
      leaderRank: leaderRankVal,
      rank: leaderRankVal,
      leader_phone: leaderPhoneVal,
      leaderPhone: leaderPhoneVal,
      phone: leaderPhoneVal,

      // 5. 참석자 및 미참석자 (이름 직급만 기록, 미참석자는 이름 직급 [이유])
      attendees: formatAttendeesForSheet(atts),
      absentees: formatAbsenteesForSheet(abs),

      // 6. TBM 구분 및 작업 내용 (양방향 매핑 - 스프레드시트 컬럼 헤더가 tbm_type, tbmType, 구분 중 어느 것이든 무조건 한글 '추가 TBM' / '업무 후' / '업무 전' 고정 기록)
      tbm_type: tbmTypeVal,
      tbmType: tbmTypeVal,
      구분: tbmTypeVal,
      work_content: workContentVal,
      workContent: workContentVal,
      content: workContentVal,

      // 7. 점검 체크리스트(통합 Check List) & 사진(photo_url) & 상태
      check_list: checkListStr,
      checkList: checkListStr,
      checklist: checkListStr,
      'Check List': checkListStr,
      '체크리스트': checkListStr,
      status: statusVal,
      photo_url: photoUrlsStr,
      photo_urls: photoUrlsStr,
      photoUrls: photoUrlsStr,
      photoUrl: photoUrlsStr,
      photo: photoUrlsStr,
      photos: photoUrlsStr,

      // 8. 타임스탬프
      created_at: obj.createdAt || obj.created_at || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
      createdAt: obj.createdAt || obj.created_at || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
      updated_at: obj.updatedAt || obj.updated_at || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
      updatedAt: obj.updatedAt || obj.updated_at || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss')
    };
  }

  // 8. 시스템 업데이트 공지사항 (notices)
  if (sheetName === 'notices') {
    const idVal = obj.id || `NOTICE-${Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMddHHmmss')}`;
    return {
      id: idVal,
      title: obj.title || '시스템 업데이트 공지',
      version: obj.version || 'v1.0.0',
      content: obj.content || '',
      author_name: obj.author_name || obj.authorName || obj.name || '관리자',
      author_username: obj.author_username || obj.authorUsername || obj.username || 'admin',
      is_active: (obj.is_active !== undefined ? (obj.is_active ? 1 : 0) : (obj.isActive !== undefined ? (obj.isActive ? 1 : 0) : 1)),
      created_at: obj.created_at || obj.createdAt || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
      updated_at: obj.updated_at || obj.updatedAt || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss')
    };
  }

  return obj;
}

/**
 * 한국 표준시(Asia/Seoul, KST) 기준 날짜 및 시간 포맷팅 헬퍼
 * - 구글 시트 내부 Date 객체 또는 타임존 시차(UTC 등)로 인해 날짜가 1일씩 앞당겨지거나 밀리는 현상 원천 방지
 */
function formatKstDate(rawVal, isDateOnly) {
  if (!rawVal && rawVal !== 0) return '';
  if (rawVal instanceof Date) {
    if (isDateOnly) {
      return Utilities.formatDate(rawVal, 'Asia/Seoul', 'yyyy-MM-dd');
    }
    const full = Utilities.formatDate(rawVal, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
    return full.endsWith('00:00:00') ? Utilities.formatDate(rawVal, 'Asia/Seoul', 'yyyy-MM-dd') : full;
  }
  const str = String(rawVal).trim();
  if (!str) return '';
  // ISO 문자열이나 UTC(Z) 포함 시 Date로 파싱하여 한국 시간 기준 변환
  if (str.includes('T') || str.endsWith('Z')) {
    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return isDateOnly
          ? Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd')
          : Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
      }
    } catch (e) { }
  }
  if (isDateOnly) {
    const m = str.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
    if (m) {
      return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    }
  }
  return str;
}

function readSheetData(sheetName) {
  if (sheetName === 'tbm') sheetName = 'tbms';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const range = sheet.getDataRange();
  const rows = range.getValues();
  const displayRows = range.getDisplayValues();
  const headers = rows[0];
  const list = [];
  const keyMap = new Map();

  const DATE_ONLY_COLS = [
    'log_date', 'due_date', 'date', 'weekly_monday', 'daily_date',
    'completion_date', 'expiry_date'
  ];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const displayRow = displayRows[i] || [];
    const obj = {};
    let hasData = false;

    headers.forEach((h, colIdx) => {
      let val = row[colIdx];
      const isDateOnly = DATE_ONLY_COLS.includes(h);

      // Date 객체 변환 (무조건 한국 표준시 Asia/Seoul KST 기준 yyyy-MM-dd 포맷)
      if (val instanceof Date) {
        val = formatKstDate(val, isDateOnly);
      } else if (isDateOnly && val) {
        val = formatKstDate(val, true);
      }

      // JSON 객체/배열 형태 자동 역직렬화
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch (e) { }
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
      } else if (sheetName === 'daily_reports') {
        if (!obj.reportId && obj.id) obj.reportId = obj.id;
        if (!obj.id && obj.report_id) obj.id = obj.report_id;
        if (!obj.dailyDate && obj.daily_date) obj.dailyDate = obj.daily_date;
        if (!obj.authorName && obj.author_name) obj.authorName = obj.author_name;
        if (!obj.authorUsername && obj.author_username) obj.authorUsername = obj.author_username;
        if (!obj.authorTeam && obj.author_team) obj.authorTeam = obj.author_team;
        if (!obj.authorRank && obj.author_rank) obj.authorRank = obj.author_rank;
        if (!obj.authorDivision && obj.author_division) obj.authorDivision = obj.author_division;
        if (!obj.authorRole && obj.author_role) obj.authorRole = obj.author_role;
        if (!obj.issues && (obj.special_notes || obj.specialNotes)) obj.issues = obj.special_notes || obj.specialNotes;
        if (!obj.todayTasks && obj.today_tasks) obj.todayTasks = obj.today_tasks;
        if (!obj.tomorrowPlan && obj.tomorrow_plan) obj.tomorrowPlan = obj.tomorrow_plan;
        if (!obj.sharedBy && obj.shared_by) obj.sharedBy = obj.shared_by;
        if (!obj.sharedWith && obj.shared_with) obj.sharedWith = obj.shared_with;
        if (!obj.sharedAt && obj.shared_at) obj.sharedAt = obj.shared_at;
        if (!obj.createdAt && obj.created_at) obj.createdAt = obj.created_at;
        if (!obj.updatedAt && obj.updated_at) obj.updatedAt = obj.updated_at;
      } else if (sheetName === 'edu_logs') {
        if (!obj.eduId && obj.edu_id) obj.eduId = obj.edu_id;
        if (!obj.userId && obj.user_id) obj.userId = obj.user_id;
        const normComp = formatKstDate(obj.completion_date || obj.completionDate || '', true);
        const normExp = formatKstDate(obj.expiry_date || obj.expiryDate || '', true);
        obj.completion_date = normComp;
        obj.completionDate = normComp;
        obj.expiry_date = normExp;
        obj.expiryDate = normExp;
        if (!obj.notes && obj.memo) obj.notes = obj.memo;
      } else if (sheetName === 'tbms') {
        if (!obj.id && obj.tbm_id) obj.id = obj.tbm_id;
        if (!obj.id && obj.tbmId) obj.id = obj.tbmId;
        if (!obj.date && obj.log_date) obj.date = obj.log_date;
        if (!obj.date && obj.logDate) obj.date = obj.logDate;
        if (!obj.site && obj.siteName) obj.site = obj.siteName;
        if (!obj.site && obj.site_name) obj.site = obj.site_name;
        if (!obj.siteName && obj.site) obj.siteName = obj.site;
        if (!obj.siteAddress && obj.site_address) obj.siteAddress = obj.site_address;
        if (!obj.siteAddress && obj.address) obj.siteAddress = obj.address;
        if (!obj.workTitle && obj.work_title) obj.workTitle = obj.work_title;
        if (!obj.workTitle && obj.title) obj.workTitle = obj.title;
        if (!obj.workCategory && obj.work_category) obj.workCategory = obj.work_category;
        if (!obj.leaderDivision && obj.leader_division) obj.leaderDivision = obj.leader_division;
        if (!obj.leaderDivision && obj.division) obj.leaderDivision = obj.division;
        if (!obj.leaderTeam && obj.leader_team) obj.leaderTeam = obj.leader_team;
        if (!obj.leaderTeam && obj.team) obj.leaderTeam = obj.team;
        if (!obj.leaderName && (obj.leader_name || obj.leader)) obj.leaderName = obj.leader_name || obj.leader;
        if (!obj.leaderRank && obj.leader_rank) obj.leaderRank = obj.leader_rank;
        if (!obj.leaderRank && obj.rank) obj.leaderRank = obj.rank;
        if (!obj.leaderPhone && obj.leader_phone) obj.leaderPhone = obj.leader_phone;
        if (!obj.leaderPhone && obj.phone) obj.leaderPhone = obj.phone;
        if (!obj.workContent && (obj.work_content || obj.content)) obj.workContent = obj.work_content || obj.content;

        const rawTypeStr = String(obj.tbm_type || obj.tbmType || obj['구분'] || '').trim().toLowerCase();
        const isAddType = rawTypeStr.indexOf('추가') !== -1 || rawTypeStr === 'additional' || String(obj.id || '').startsWith('tbm_add_') || String(obj.work_title || obj.workTitle || '').includes('추가');
        const isPostType = !isAddType && (rawTypeStr.indexOf('후') !== -1 || rawTypeStr === 'post' || String(obj.id || '').startsWith('tbm_post_'));

        obj.tbm_type = isAddType ? '추가 TBM' : (isPostType ? '업무 후' : '업무 전');
        obj.tbmType = isAddType ? 'additional' : (isPostType ? 'post' : 'pre');
        obj['구분'] = obj.tbm_type;

        if (!obj.status) {
          obj.status = isAddType ? 'ADDITIONAL_COMPLETED' : (isPostType ? 'ALL_COMPLETED' : 'PRE_COMPLETED');
        }

        if (!obj.photo_url && obj.photo_urls) obj.photo_url = obj.photo_urls;
        if (!obj.photo_urls && obj.photo_url) obj.photo_urls = obj.photo_url;
        if (!obj.photoUrl && obj.photo_url) obj.photoUrl = obj.photo_url;
        const pUrls = String(obj.photo_url || obj.photo_urls || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        if (pUrls.length > 0 && (!Array.isArray(obj.photos) || obj.photos.length === 0)) {
          obj.photos = pUrls.map((u, pIdx) => ({ id: `photo_${pIdx + 1}`, url: u, viewUrl: u }));
        }
        if (!obj.createdAt && obj.created_at) obj.createdAt = obj.created_at;
        if (!obj.updatedAt && obj.updated_at) obj.updatedAt = obj.updated_at;

        // 불필요한 레거시 컬럼 속성 완전 제거 (클라이언트로의 누출 방지)
        delete obj.work_area;
        delete obj.workArea;
        delete obj.tools_used;
        delete obj.toolsUsed;
        delete obj.pre_check;
        delete obj.preCheck;
        delete obj.post_check;
        delete obj.postCheck;
        delete obj.additional_tbms;
        delete obj.additionalTbms;
      }

      // 키별 중복 방지: 시트에 기존에 누적된 중복 행이 있더라도 가장 최신(아래쪽) 행 데이터만 반환
      let key = '';
      if (sheetName === 'users') {
        key = String(obj.username || obj.id || '').trim().toLowerCase();
      } else if (sheetName === 'sites') {
        const namePart = String(obj.name || obj.site_name || '').trim();
        const addrPart = String(obj.address || '').trim();
        key = namePart && addrPart ? (namePart + '::' + addrPart) : String(obj.id || '');
      } else if (sheetName === 'work_logs') {
        let idVal = String(obj.log_id || obj.id || '').trim();
        const writerVal = String(obj.writer_id || obj.authorUsername || obj.name || '').trim().toLowerCase();
        const dateVal = String(obj.log_date || obj.date || '').trim();
        const titleVal = String(obj.title || '').trim().toLowerCase();
        if (!idVal) {
          idVal = `LOG-${writerVal || 'ROW'}-${dateVal.replace(/\D/g, '') || i}`;
          obj.id = idVal;
          obj.log_id = idVal;
        }
        // 고유 ID를 최우선 키로 삼아 일자 변경 시 과거 일자 유령 행이 아닌 최신 행만 단일 반환
        key = idVal || ((writerVal && titleVal) ? `WORK::${writerVal}::${titleVal}` : `WORK_ROW_${i}`);
      } else if (sheetName === 'security_logs') {
        let idVal = String(obj.log_id || obj.id || '').trim();
        const visitorVal = String(obj.visitor_phone || obj.visitorPhone || obj.phone || '').replace(/\D/g, '');
        const dateVal = String(obj.signature_date || obj.signatureDate || obj.date || '').trim();
        if (!idVal) {
          idVal = `PASS-${visitorVal || 'VISITOR'}-${dateVal.replace(/\D/g, '') || i}`;
          obj.id = idVal;
          obj.log_id = idVal;
        }
        key = (visitorVal && dateVal) ? `SEC::${visitorVal}::${dateVal}` : idVal;
      } else if (sheetName === 'tbms') {
        const idVal = String(obj.id || obj.tbm_id || obj.tbmId || '').trim();
        const dateVal = String(obj.date || obj.log_date || '').trim();
        const siteVal = String(obj.site || obj.siteName || '').trim();
        const leaderVal = String(obj.leaderName || obj.leader || '').trim();
        const typeVal = String(obj.tbm_type || obj.tbmType || '').trim().toLowerCase();
        key = idVal || (dateVal && siteVal ? `TBM::${dateVal}::${siteVal}::${leaderVal}::${typeVal}` : '');
      } else if (sheetName === 'edu_logs') {
        const uVal = String(obj.user_id || obj.userId || obj.name || '').trim().toLowerCase();
        const tVal = String(obj.title || '').trim().toLowerCase();
        const cVal = formatKstDate(obj.completion_date || obj.completionDate || '', true);
        const idVal = String(obj.edu_id || obj.eduId || obj.id || '').trim();

        // 무효하거나 더미/레거시 유령 행은 원천 제외
        if (!tVal || tVal === '사내 정기 정보보안 및 안전 교육' || idVal.startsWith('EDU-INIT-') || idVal.startsWith('EDU-LEGACY-')) {
          continue;
        }

        key = (uVal && tVal && cVal) ? `EDU::${uVal}::${tVal}::${cVal}` : (idVal || `EDU_ROW_${i}`);
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
            password: obj.password || prev.password || '',
            passward: obj.password || prev.password || '',
            passwordHash: obj.password || prev.password || ''
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
    let resultList = Array.from(keyMap.values()).concat(list);
    if (sheetName === 'edu_logs') {
      resultList.sort(function (a, b) {
        var expA = String(a.expiry_date || a.expiryDate || '').trim();
        var expB = String(b.expiry_date || b.expiryDate || '').trim();
        if (expA && !expB) return -1;
        if (!expA && expB) return 1;
        if (expA && expB && expA !== expB) return expA.localeCompare(expB);
        return String(b.completion_date || b.completionDate || '').localeCompare(String(a.completion_date || a.completionDate || ''));
      });
    }
    return resultList;
  }
  if (sheetName === 'edu_logs' && Array.isArray(list)) {
    list.sort(function (a, b) {
      var expA = String(a.expiry_date || a.expiryDate || '').trim();
      var expB = String(b.expiry_date || b.expiryDate || '').trim();
      if (expA && !expB) return -1;
      if (!expA && expB) return 1;
      if (expA && expB && expA !== expB) return expA.localeCompare(expB);
      return String(b.completion_date || b.completionDate || '').localeCompare(String(a.completion_date || a.completionDate || ''));
    });
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
        const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : headers.indexOf('site_name');
        const addrIdx = headers.indexOf('address');
        const idIdx = headers.indexOf('id');
        const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim().toLowerCase() : '';
        const addr = addrIdx !== -1 ? String(row[addrIdx] || '').trim().toLowerCase() : '';
        const id = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';
        key = (name && addr) ? `SITE::${name}::${addr}` : (id ? `SITE_ID::${id}` : '');
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

        const writerIdx = headers.indexOf('writer_id');
        const dateIdx = headers.indexOf('log_date');
        const titleIdx = headers.indexOf('title');
        const writerVal = writerIdx !== -1 ? String(row[writerIdx] || '').trim().toLowerCase() : '';
        const dateVal = dateIdx !== -1 ? formatKstDate(row[dateIdx], true) : '';
        const titleVal = titleIdx !== -1 ? String(row[titleIdx] || '').trim().toLowerCase() : '';

        key = logId || id || ((writerVal && titleVal) ? `WORK::${writerVal}::${titleVal}` : '');
      } else if (sheetName === 'security_logs') {
        const phoneIdx = headers.indexOf('visitor_phone');
        const dateIdx = headers.indexOf('signature_date');
        const phone = phoneIdx !== -1 ? String(row[phoneIdx] || '').replace(/\D/g, '') : '';
        const date = dateIdx !== -1 ? String(row[dateIdx] || '').trim() : '';

        const idIdx = headers.indexOf('id');
        const logIdIdx = headers.indexOf('log_id');
        const id = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';
        const logId = logIdIdx !== -1 ? String(row[logIdIdx] || '').trim() : '';

        key = (phone && date) ? `SEC::${phone}::${date}` : (logId || id);
      } else if (sheetName === 'tbms') {
        const idIdx = headers.indexOf('id');
        const dateIdx = headers.indexOf('date');
        const siteIdx = headers.indexOf('site');
        const leaderIdx = headers.indexOf('leader_name');
        const titleIdx = headers.indexOf('work_title');
        let typeIdx = headers.indexOf('tbm_type');
        if (typeIdx === -1) typeIdx = headers.indexOf('구분');

        const id = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';
        const rawDate = dateIdx !== -1 ? (row[dateIdx] instanceof Date ? formatKstDate(row[dateIdx], true) : String(row[dateIdx] || '')) : '';
        const dVal = rawDate.replace(/\D/g, '').slice(0, 8);
        const sVal = siteIdx !== -1 ? String(row[siteIdx] || '').trim().toLowerCase() : '';
        const lVal = leaderIdx !== -1 ? String(row[leaderIdx] || '').trim().toLowerCase() : '';
        const titleVal = titleIdx !== -1 ? String(row[titleIdx] || '').trim().toLowerCase() : '';
        const rawType = typeIdx !== -1 ? String(row[typeIdx] || '').trim().toLowerCase() : '';
        const tVal = (rawType.indexOf('추가') !== -1 || rawType === 'additional' || id.startsWith('tbm_add_')) ? 'additional' : ((rawType.indexOf('후') !== -1 || rawType === 'post' || id.startsWith('tbm_post_')) ? 'post' : 'pre');

        // 사업장, 주관자, 작업명이 모두 비어있는 유령/빈 행은 즉시 삭제 대상 등록 (시트에 빈 행 무한 증식 차단)
        if (!sVal && !lVal && !titleVal) {
          rowsToDelete.push(r + 1);
          continue;
        }

        // 동일 일자, 사업장, 주관자, 구분인 경우 가장 최신(아래쪽) 1행만 보존하고 이전 중복 행 삭제
        key = (dVal && sVal && lVal) ? `TBM::${dVal}::${sVal}::${lVal}::${tVal}` : (id || `TBM_ROW_${r}`);
      } else if (sheetName === 'edu_logs') {
        const titleIdx = headers.indexOf('title');
        const compDateIdx = headers.indexOf('completion_date');
        const userIdx = headers.indexOf('user_id');
        const nameIdx = headers.indexOf('name');
        const eduIdIdx = headers.indexOf('edu_id');
        const idIdx = headers.indexOf('id');

        const titleVal = titleIdx !== -1 ? String(row[titleIdx] || '').trim().toLowerCase() : '';
        const compVal = compDateIdx !== -1 ? formatKstDate(row[compDateIdx], true) : '';
        const userVal = userIdx !== -1 ? String(row[userIdx] || '').trim().toLowerCase() : '';
        const nameVal = nameIdx !== -1 ? String(row[nameIdx] || '').trim().toLowerCase() : '';
        const eduId = eduIdIdx !== -1 ? String(row[eduIdIdx] || '').trim() : '';
        const id = idIdx !== -1 ? String(row[idIdx] || '').trim() : '';

        // 유령 데이터 / 빈 행 / 레거시 더미 데이터는 즉시 삭제 대상 지정
        if (!titleVal || titleVal === '사내 정기 정보보안 및 안전 교육' || eduId.startsWith('EDU-INIT-') || eduId.startsWith('EDU-LEGACY-') || id.startsWith('EDU-INIT-') || id.startsWith('EDU-LEGACY-')) {
          rowsToDelete.push(r + 1);
          continue;
        }

        const uVal = userVal || nameVal;
        key = (uVal && titleVal && compVal) ? `EDU::${uVal}::${titleVal}::${compVal}` : (eduId || id);
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
        // 시트에 이미 평문으로 적혀있는 비밀번호가 있다면 안전하게 SHA-256 해시값으로 즉시 치환
        if (sheetName === 'users') {
          const passIdx = headers.indexOf('password');
          if (passIdx !== -1) {
            const curPass = String(row[passIdx] || '').trim();
            if (curPass && !/^[a-f0-9]{64}$/i.test(curPass)) {
              sheet.getRange(r + 1, passIdx + 1).setValue(hashPasswordInGas(curPass));
            }
          }
        }
      }
    }

    // 아래에서 위로 행을 삭제하여 행 번호 뒤틀림 방지
    let deletedCount = 0;
    rowsToDelete.forEach(rowNum => {
      try {
        sheet.deleteRow(rowNum);
        deletedCount++;
      } catch (e) { }
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
  const sheetName = sheet.getName();
  const obj = (rawObj && rawObj._isNormalized) ? rawObj : normalizeObjectForSheet(sheetName, rawObj);
  if (sheetName === 'users') {
    const numId = parseInt(obj.id, 10);
    if (isNaN(numId) || numId <= 0 || String(obj.id).trim() !== String(numId)) {
      obj.id = getNextUserId(sheet);
    } else {
      obj.id = numId;
    }
  }
  const row = headers.map(h => {
    if (sheetName === 'tbms' && (h === 'tbm_type' || h === 'tbmType' || h === '구분')) {
      const rawT = String(obj[h] || obj.tbm_type || obj.tbmType || obj['구분'] || '').trim().toLowerCase();
      if (rawT.indexOf('추가') !== -1 || rawT === 'additional' || String(obj.id || '').startsWith('tbm_add_') || String(obj.work_title || obj.workTitle || '').includes('추가')) {
        return '추가 TBM';
      }
      return (rawT.indexOf('후') !== -1 || rawT === 'post' || String(obj.id || '').startsWith('tbm_post_')) ? '업무 후' : '업무 전';
    }
    const v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  });
  sheet.appendRow(row);
}

function ensureHeaders(sheet, keys) {
  const sheetName = sheet.getName();
  const schema = SCHEMAS[sheetName];
  const targetKeys = schema || keys;

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(targetKeys);
    formatHeaderRow(sheet, targetKeys.length);
    return targetKeys;
  }

  // 스키마가 정의된 시트의 경우: 1행 헤더를 무조건 표준 스키마로 강제 정렬하고 잉여 컬럼(U~Y 등) 즉시 완전 삭제
  if (schema) {
    sheet.getRange(1, 1, 1, schema.length).setValues([schema]);
    formatHeaderRow(sheet, schema.length);
    const maxCols = sheet.getMaxColumns();
    if (maxCols > schema.length) {
      const extraCols = maxCols - schema.length;
      try {
        sheet.getRange(1, schema.length + 1, Math.max(sheet.getMaxRows(), 1), extraCols).clear();
        sheet.deleteColumns(schema.length + 1, extraCols);
      } catch (e) {
        Logger.log('ensureHeaders deleteColumns warning: ' + e.message);
      }
    }
    return schema;
  }

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
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
