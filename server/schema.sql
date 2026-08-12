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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 작업 현장 정보 테이블 (security_site)
CREATE TABLE IF NOT EXISTS security_site (
  id VARCHAR(100) PRIMARY KEY COMMENT 'site-000 형식 현장 ID',
  type VARCHAR(100) DEFAULT '보안어플O' COMMENT '분류 (보안어플O / 보안어플X)',
  name VARCHAR(200) NOT NULL COMMENT '회사명 / 사업장명',
  address VARCHAR(255) DEFAULT '' COMMENT '사업장 위치'
);

-- 3. 보안서약 관리 테이블 (security_log)
CREATE TABLE IF NOT EXISTS security_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_id VARCHAR(100) UNIQUE COMMENT '고유 로그 ID (PASS-YYYY-000)',
  name VARCHAR(100) NOT NULL COMMENT '서약자 성명',
  division VARCHAR(100) DEFAULT '' COMMENT '서약자 사업부',
  role VARCHAR(50) DEFAULT '' COMMENT '서약자 권한/역할',
  site VARCHAR(200) DEFAULT '' COMMENT '출입 현장명',
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
  writer_name VARCHAR(100) NOT NULL COMMENT '작성자 성명',
  writer_id VARCHAR(100) DEFAULT '' COMMENT '작성자 ID',
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

-- ==========================================
-- 초기 데이터 (Seed Data)
-- ==========================================

-- 1. 기본 관리자 및 사용자 계정 추가 (SHA-256 암호화된 비밀번호)
INSERT INTO security_user (username, password, name, role, division, team, `rank`, siteId, phone, email)
VALUES 
  ('admin', 'd68e2e25808044e471e01da6bf4ef8dc8fd56de3c4fa590b34b86b7c86fef899', '이원배', '개발자', '영업/운영사업부', '운영1팀', '대리', 'ALL', '010-9885-0393', 'wblee@withtech.co.kr'),
  ('wblee', 'd68e2e25808044e471e01da6bf4ef8dc8fd56de3c4fa590b34b86b7c86fef899', '이원배', '일반', '영업/운영사업부', '운영1팀', '대리', 'SITE-001', '010-9885-0393', 'wblee@withtech.co.kr')
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  name = VALUES(name),
  role = VALUES(role),
  division = VALUES(division),
  team = VALUES(team),
  `rank` = VALUES(`rank`),
  siteId = VALUES(siteId),
  phone = VALUES(phone),
  email = VALUES(email);

-- 2. 기본 작업 현장 데이터 추가
INSERT INTO security_site (id, type, name, address)
VALUES 
  ('site-001', '보안어플O', '삼성전자 평택캠퍼스 P4 라인', '경기도 평택시 고덕면 삼성로 114'),
  ('site-002', '보안어플O', 'SK하이닉스 이천 M16 공장', '경기도 이천시 부발읍 경충대로 2091'),
  ('site-003', '보안어플X', '위드텍 본사 통합관제센터', '대전광역시 유성구 테크노2로 42')
ON DUPLICATE KEY UPDATE
  type = VALUES(type),
  name = VALUES(name),
  address = VALUES(address);
