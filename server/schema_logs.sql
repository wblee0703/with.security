-- ========================================================
-- WithSecurity Dedicated Log Tables (security_log & work_log)
-- 기존 데이터베이스의 다른 테이블/데이터는 전혀 건드리지 않고
-- 보안서약(security_log) 및 업무일지(work_log)만 새로 생성합니다.
-- ========================================================

-- 1. 보안서약 관리 테이블 (security_log)
CREATE TABLE IF NOT EXISTS security_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_id VARCHAR(100) UNIQUE COMMENT '고유 로그 ID (UUID 등)',
  user_name VARCHAR(100) NOT NULL COMMENT '서약자 성명',
  user_id VARCHAR(100) DEFAULT '' COMMENT '서약자 ID 또는 사번',
  pledge_title VARCHAR(200) NOT NULL COMMENT '보안서약서 제목',
  pledge_content TEXT COMMENT '서약서 내용',
  signature_data LONGTEXT COMMENT '서명 이미지 Base64 또는 데이터',
  ip_address VARCHAR(50) DEFAULT '' COMMENT '서약 당시 IP 주소',
  agreed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '서약 일시',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 업무일지 관리 테이블 (work_log)
CREATE TABLE IF NOT EXISTS work_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_id VARCHAR(100) UNIQUE COMMENT '고유 일지 ID (UUID 등)',
  writer_name VARCHAR(100) NOT NULL COMMENT '작성자 성명',
  writer_id VARCHAR(100) DEFAULT '' COMMENT '작성자 ID 또는 사번',
  site_name VARCHAR(200) DEFAULT '' COMMENT '작업 현장명',
  log_date DATE NOT NULL COMMENT '업무일지 작성 날짜',
  title VARCHAR(200) NOT NULL COMMENT '업무일지 제목',
  tasks_done TEXT COMMENT '금일 수행한 업무 내용',
  issues_found TEXT COMMENT '특이사항 및 안전 점검 이슈',
  weather VARCHAR(50) DEFAULT '' COMMENT '날씨 정보',
  status VARCHAR(50) DEFAULT 'SUBMITTED' COMMENT '상태 (DRAFT, SUBMITTED, APPROVED)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
