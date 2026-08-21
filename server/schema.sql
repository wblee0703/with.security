-- ==========================================
-- WithSecurity MySQL Database Schema
-- Database Name: dbwithtech002
-- ==========================================

CREATE DATABASE IF NOT EXISTS dbwithtech002 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dbwithtech002;

-- 구 버전 미사용 테이블 정리
DROP TABLE IF EXISTS checklists;
DROP TABLE IF EXISTS vault;
DROP TABLE IF EXISTS otp;
DROP TABLE IF EXISTS incidents;

-- 1. 사용자 계정 정보 테이블 (security_user)
CREATE TABLE IF NOT EXISTS security_user (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE COMMENT '사용자 아이디',
  password VARCHAR(255) DEFAULT '' COMMENT '암호화된 비밀번호',
  name VARCHAR(100) NOT NULL COMMENT '성명',
  role VARCHAR(50) DEFAULT '일반' COMMENT '권한 (개발자, 관리자, 일반 등)',
  division VARCHAR(100) DEFAULT '' COMMENT '사업부 (영업/운영사업부 등)',
  team VARCHAR(100) DEFAULT '' COMMENT '소속팀 (운영1팀 등)',
  `rank` VARCHAR(50) DEFAULT '' COMMENT '직급 (대리, 과장 등)',
  siteId VARCHAR(100) DEFAULT '' COMMENT '소속 현장 ID',
  phone VARCHAR(50) DEFAULT '' COMMENT '연락처',
  email VARCHAR(100) DEFAULT '' COMMENT '이메일 주소',
  education_date VARCHAR(50) DEFAULT '' COMMENT '보안교육 수료일',
  education_expiry_date VARCHAR(50) DEFAULT '' COMMENT '보안교육 만료일',
  education_name VARCHAR(150) DEFAULT '' COMMENT '보안교육 과정명',
  trainings TEXT COMMENT '다건 교육 이수 목록 JSON',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 작업 현장 정보 테이블 (security_site)
CREATE TABLE IF NOT EXISTS security_site (
  id VARCHAR(100) PRIMARY KEY COMMENT 'site-000 형식 현장 ID',
  type VARCHAR(100) DEFAULT '보안앱O' COMMENT '분류 (보안앱O / 보안앱X)',
  name VARCHAR(200) NOT NULL COMMENT '회사명 / 사업장명',
  address VARCHAR(255) DEFAULT '' COMMENT '사업장 위치',
  site_name VARCHAR(255) DEFAULT '' COMMENT '사업장 전체명'
);

-- 3. 보안서약 관리 테이블 (security_log)
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

-- 4. 업무일지 관리 테이블 (work_log)
CREATE TABLE IF NOT EXISTS work_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_id VARCHAR(100) UNIQUE COMMENT '고유 일지 ID',
  `name` VARCHAR(100) NOT NULL COMMENT '작성자 성명',
  writer_id VARCHAR(100) DEFAULT '' COMMENT '작성자 계정 ID',
  division VARCHAR(100) DEFAULT '' COMMENT '해당 계정 사업부',
  `team` VARCHAR(100) DEFAULT '' COMMENT '해당 계정 소속팀',
  `rank` VARCHAR(50) DEFAULT '' COMMENT '해당 계정 직급',
  `role` VARCHAR(50) DEFAULT '일반' COMMENT '해당 계정 권한',
  category VARCHAR(50) DEFAULT '사내 업무' COMMENT '업무 분류 (사내 업무 / 출장 업무)',
  site_name VARCHAR(255) DEFAULT '' COMMENT '출장 사업장명',
  log_date DATE NOT NULL COMMENT '업무일지 작성 날짜',
  title VARCHAR(200) NOT NULL COMMENT '업무일지 제목',
  tasks_done TEXT COMMENT '금일 수행한 업무 내용',
  is_shared TINYINT(1) DEFAULT 0 COMMENT '업무 공유 여부',
  shared_with TEXT COMMENT '공유 대상 목록 JSON',
  shared_at VARCHAR(100) DEFAULT '' COMMENT '공유 시각',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. 주간 업무 관리 테이블 (weekly_report)
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

-- 6. 교육수료 관리 테이블 (edu_log)
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


-- ==========================================
-- 초기 데이터 (Seed Data)
-- ==========================================

-- 1. 기본 관리자 및 사용자 계정 추가 (비밀번호: .env ADMIN_DEFAULT_PASSWORD / withtech123!)
INSERT INTO security_user (username, password, name, role, division, team, `rank`, siteId, phone, email)
VALUES 
  ('admin', 'withtech123!', '이원배', '개발자', '영업/운영사업부', '운영1팀', '대리', 'ALL', '010-9885-0393', 'wblee@withtech.co.kr'),
  ('wblee', 'withtech123!', '이원배', '일반', '영업/운영사업부', '운영1팀', '대리', 'SITE-001', '010-9885-0393', 'wblee@withtech.co.kr')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role),
  division = VALUES(division),
  team = VALUES(team),
  `rank` = VALUES(`rank`),
  siteId = VALUES(siteId),
  phone = VALUES(phone),
  email = VALUES(email);
