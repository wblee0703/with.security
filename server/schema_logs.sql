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
  site_name VARCHAR(255) DEFAULT 'SEC 평택사업장' COMMENT '출입 현장명',
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
