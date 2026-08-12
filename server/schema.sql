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
  password VARCHAR(255) NOT NULL COMMENT '암호화된 비밀번호',
  name VARCHAR(100) NOT NULL COMMENT '성명',
  role VARCHAR(50) DEFAULT 'worker' COMMENT '권한 (admin, worker 등)',
  siteId VARCHAR(100) DEFAULT '' COMMENT '소속 현장 ID',
  phone VARCHAR(50) DEFAULT '' COMMENT '연락처',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 작업 현장 정보 테이블 (security_site)
CREATE TABLE IF NOT EXISTS security_site (
  id VARCHAR(100) PRIMARY KEY COMMENT '현장 고유 ID',
  name VARCHAR(200) NOT NULL COMMENT '현장명',
  type VARCHAR(50) DEFAULT 'general' COMMENT '현장 유형',
  address VARCHAR(255) DEFAULT '' COMMENT '현장 주소',
  manager VARCHAR(100) DEFAULT '' COMMENT '현장 관리자 성명',
  contact VARCHAR(50) DEFAULT '' COMMENT '연락처',
  status VARCHAR(50) DEFAULT 'ACTIVE' COMMENT '가동 상태',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 보안서약 관리 테이블 (security_log)
CREATE TABLE IF NOT EXISTS security_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_id VARCHAR(100) UNIQUE COMMENT '고유 로그 ID',
  user_name VARCHAR(100) NOT NULL COMMENT '서약자 성명',
  user_id VARCHAR(100) DEFAULT '' COMMENT '서약자 ID',
  pledge_title VARCHAR(200) NOT NULL COMMENT '서약서 제목',
  pledge_content TEXT COMMENT '서약서 내용',
  signature_data LONGTEXT COMMENT '서명 이미지 Base64',
  ip_address VARCHAR(50) DEFAULT '' COMMENT '서약 당시 IP 주소',
  agreed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '서약 일시',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
