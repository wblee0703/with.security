-- ========================================================
-- WithSecurity Dedicated Log Tables (security_log & work_log)
-- ========================================================

-- 1. 보안서약 관리 테이블 (security_log)
CREATE TABLE IF NOT EXISTS security_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_id VARCHAR(100) UNIQUE COMMENT '고유 로그 ID (PASS-YYYY-000)',
  parent_log_id VARCHAR(100) DEFAULT '' COMMENT '최초 서약 ID (동행 등록 시 원본 서약 ID)',
  name VARCHAR(100) NOT NULL COMMENT '서약자 성명',
  division VARCHAR(100) DEFAULT '' COMMENT '서약자 사업부',
  role VARCHAR(50) DEFAULT '' COMMENT '서약자 권한/역할',
  site_name VARCHAR(255) DEFAULT '' COMMENT '출입 현장명',
  purpose VARCHAR(255) DEFAULT '' COMMENT '방문/출입 목적',
  visitor_phone VARCHAR(50) DEFAULT '' COMMENT '방문자 연락처',
  team VARCHAR(100) DEFAULT '' COMMENT '방문자 소속팀',
  rank VARCHAR(50) DEFAULT '' COMMENT '방문자 직급',
  mdm_verified TINYINT(1) DEFAULT 0 COMMENT '보안앱 검수여부',
  gate_approved TINYINT(1) DEFAULT 0 COMMENT '게이트 승인여부',
  doc_sec_verified TINYINT(1) DEFAULT 0 COMMENT '서류보안 확인여부',
  pre_check_verified TINYINT(1) DEFAULT 0 COMMENT '사전점검 완료여부',
  pledge_terms TEXT COMMENT '보안서약 준수 약관 전문',
  signature_date VARCHAR(100) DEFAULT '' COMMENT '서명 완료 날짜 및 시간',
  status VARCHAR(50) DEFAULT '승인완료' COMMENT '서약 처리 상태'
);

-- 2. 업무일지 관리 테이블 (work_log)
CREATE TABLE IF NOT EXISTS work_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_id VARCHAR(100) UNIQUE COMMENT '고유 일지 ID (LOG-YYYYMMDD-000)',
  log_date DATE NOT NULL COMMENT '업무일지 작성 날짜',
  name VARCHAR(100) NOT NULL COMMENT '작성자 성명',
  team VARCHAR(100) DEFAULT '' COMMENT '작성자 소속팀',
  rank VARCHAR(50) DEFAULT '' COMMENT '작성자 직급',
  division VARCHAR(100) DEFAULT '' COMMENT '작성자 사업부',
  role VARCHAR(50) DEFAULT '' COMMENT '작성자 권한/역할',
  category VARCHAR(100) DEFAULT '일반 업무' COMMENT '업무 분류',
  site_name VARCHAR(255) DEFAULT '' COMMENT '출장지/사업장명',
  title VARCHAR(200) NOT NULL COMMENT '업무일지 제목',
  tasks_done TEXT COMMENT '금일 수행한 업무 내용',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. 주간 업무 관리 테이블 (weekly_report) - 주요 내용, 정보 공유, 업무 지원, 기타 업무 컬럼별 분리 저장
CREATE TABLE IF NOT EXISTS weekly_report (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id VARCHAR(120) UNIQUE COMMENT '고유 주간보고 ID (weekly-rep-username-YYYY-MM-DD)',
  weekly_monday DATE NOT NULL COMMENT '해당 주차 월요일 날짜',
  week_text VARCHAR(100) DEFAULT '' COMMENT '주차 표기 (예: 2026년 8월 3주차)',
  author_name VARCHAR(100) NOT NULL COMMENT '작성자 성명',
  author_username VARCHAR(100) DEFAULT '' COMMENT '작성자 아이디',
  author_team VARCHAR(100) DEFAULT '' COMMENT '작성자 소속팀',
  author_rank VARCHAR(50) DEFAULT '' COMMENT '작성자 직급',
  author_division VARCHAR(100) DEFAULT '' COMMENT '작성자 사업부',
  author_role VARCHAR(50) DEFAULT '' COMMENT '작성자 권한/역할',
  main_tasks TEXT COMMENT '1. 주요 내용',
  info_sharing TEXT COMMENT '2. 정보 공유',
  work_support TEXT COMMENT '3. 업무 지원',
  etc_tasks TEXT COMMENT '4. 기타 업무',
  shared_with TEXT COMMENT '공유 대상 목록 JSON',
  shared_at VARCHAR(100) DEFAULT '' COMMENT '공유 시각',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. 교육수료 관리 테이블 (edu_log)
CREATE TABLE IF NOT EXISTS edu_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  edu_id VARCHAR(100) UNIQUE COMMENT '고유 교육 로그 ID (EDU-타임스탬프-난수)',
  user_id VARCHAR(100) DEFAULT '' COMMENT '사용자 아이디 (username)',
  name VARCHAR(100) NOT NULL COMMENT '이수자 성명',
  division VARCHAR(100) DEFAULT '' COMMENT '이수자 사업부',
  team VARCHAR(100) DEFAULT '' COMMENT '이수자 소속팀',
  `rank` VARCHAR(50) DEFAULT '' COMMENT '이수자 직급',
  category VARCHAR(100) DEFAULT '법정' COMMENT '교육 구분 (SKHynix, Samsung, LGD, 법정, 기타 등)',
  title VARCHAR(200) NOT NULL COMMENT '교육 과정명',
  completion_date DATE NOT NULL COMMENT '교육 수료일 (이수일)',
  expiry_date DATE NOT NULL COMMENT '교육 만료일',
  memo VARCHAR(255) DEFAULT '' COMMENT '비고 / 수료증 번호 / 메모',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

