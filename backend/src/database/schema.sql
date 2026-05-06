-- ============================================================
-- Neutara Deployment Management System
-- MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS neutara_deployment
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE neutara_deployment;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)      NOT NULL PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  email         VARCHAR(255)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(50)   NOT NULL CHECK (role IN ('dev','qa','infra','admin','viewer')),
  team          VARCHAR(100)  DEFAULT NULL,
  avatar_url    TEXT          DEFAULT NULL,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  last_login    DATETIME      DEFAULT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  job_id       VARCHAR(100) NOT NULL,
  job_name     VARCHAR(255) NOT NULL,
  project_name VARCHAR(255) DEFAULT NULL,
  jenkins_url  TEXT         DEFAULT NULL,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_jobs_job_id (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BRANCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  branch_name  VARCHAR(255) NOT NULL,
  project_name VARCHAR(255) DEFAULT NULL,
  is_active    TINYINT(1)   NOT NULL DEFAULT 1,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DEPLOYMENT REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS deployment_requests (
  id               CHAR(36)      NOT NULL PRIMARY KEY,
  deployment_title VARCHAR(500)  NOT NULL,
  project_name     VARCHAR(255)  NOT NULL,
  job_id           VARCHAR(100)  DEFAULT NULL,
  branch_name      VARCHAR(255)  NOT NULL,
  environment      VARCHAR(50)   NOT NULL,
  ticket_link      TEXT          DEFAULT NULL,
  description      TEXT          NOT NULL,
  priority         VARCHAR(20)   NOT NULL CHECK (priority IN ('low','medium','high','critical')),
  raised_by        CHAR(36)      NOT NULL,
  status           VARCHAR(50)   NOT NULL DEFAULT 'draft'
                   CHECK (status IN (
                     'draft','pending_qa_approval','qa_approved','rejected_by_qa',
                     'pending_infra_deployment','deployment_in_progress','deployment_completed',
                     'deployment_failed','pending_dev_acknowledgment',
                     'successfully_completed','issue_raised'
                   )),
  submitted_at     DATETIME      DEFAULT NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dr_raised_by FOREIGN KEY (raised_by) REFERENCES users(id),
  KEY idx_dr_status      (status),
  KEY idx_dr_raised_by   (raised_by),
  KEY idx_dr_environment (environment),
  KEY idx_dr_priority    (priority),
  KEY idx_dr_created_at  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- QA APPROVALS
-- ============================================================
CREATE TABLE IF NOT EXISTS deployment_qa_approvals (
  id              CHAR(36)    NOT NULL PRIMARY KEY,
  deployment_id   CHAR(36)    NOT NULL,
  qa_user_id      CHAR(36)    NOT NULL,
  qa_ticket_link  TEXT        DEFAULT NULL,
  qa_description  TEXT        DEFAULT NULL,
  qa_comments     TEXT        NOT NULL,
  approval_status VARCHAR(20) NOT NULL CHECK (approval_status IN ('approved','rejected','sent_back')),
  approved_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_qa_deployment FOREIGN KEY (deployment_id) REFERENCES deployment_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_qa_user       FOREIGN KEY (qa_user_id)    REFERENCES users(id),
  KEY idx_qa_deployment_id (deployment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INFRA LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS deployment_infra_logs (
  id                       CHAR(36)    NOT NULL PRIMARY KEY,
  deployment_id            CHAR(36)    NOT NULL,
  infra_user_id            CHAR(36)    NOT NULL,
  deployment_notes         TEXT        NOT NULL,
  screenshot_path          TEXT        DEFAULT NULL,
  screenshot_original_name VARCHAR(255) DEFAULT NULL,
  deployment_status        VARCHAR(20) NOT NULL CHECK (deployment_status IN ('in_progress','success','failed')),
  completion_comments      TEXT        DEFAULT NULL,
  started_at               DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at             DATETIME    DEFAULT NULL,
  created_at               DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_infra_deployment FOREIGN KEY (deployment_id) REFERENCES deployment_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_infra_user       FOREIGN KEY (infra_user_id) REFERENCES users(id),
  KEY idx_infra_deployment_id (deployment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ACKNOWLEDGMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS deployment_acknowledgments (
  id                     CHAR(36)    NOT NULL PRIMARY KEY,
  deployment_id          CHAR(36)    NOT NULL,
  acknowledged_by        CHAR(36)    NOT NULL,
  acknowledgment_comment TEXT        NOT NULL,
  status                 VARCHAR(20) NOT NULL DEFAULT 'acknowledged'
                         CHECK (status IN ('acknowledged','issue_raised')),
  acknowledged_at        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ack_deployment FOREIGN KEY (deployment_id)   REFERENCES deployment_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_ack_user       FOREIGN KEY (acknowledged_by) REFERENCES users(id),
  KEY idx_ack_deployment_id (deployment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            CHAR(36)    NOT NULL PRIMARY KEY,
  deployment_id CHAR(36)    DEFAULT NULL,
  action        VARCHAR(255) NOT NULL,
  performed_by  CHAR(36)    DEFAULT NULL,
  old_status    VARCHAR(50) DEFAULT NULL,
  new_status    VARCHAR(50) DEFAULT NULL,
  comment       TEXT        DEFAULT NULL,
  metadata      JSON        DEFAULT NULL,
  ip_address    VARCHAR(45) DEFAULT NULL,
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_deployment FOREIGN KEY (deployment_id) REFERENCES deployment_requests(id) ON DELETE SET NULL,
  KEY idx_audit_deployment_id (deployment_id),
  KEY idx_audit_created_at    (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id            CHAR(36)    NOT NULL PRIMARY KEY,
  user_id       CHAR(36)    NOT NULL,
  deployment_id CHAR(36)    DEFAULT NULL,
  title         VARCHAR(500) NOT NULL,
  message       TEXT        NOT NULL,
  type          VARCHAR(20) NOT NULL CHECK (type IN ('info','success','warning','error')),
  is_read       TINYINT(1)  NOT NULL DEFAULT 0,
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user       FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_deployment FOREIGN KEY (deployment_id) REFERENCES deployment_requests(id) ON DELETE SET NULL,
  KEY idx_notif_user_id (user_id),
  KEY idx_notif_is_read  (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED DATA  (password = Admin@123)
-- ============================================================
INSERT INTO users (id, name, email, password_hash, role, team) VALUES
  (UUID(), 'Admin User',      'admin@neutara.com', '$2a$10$tZ2ourCNMUxQfoiDhBxDee/1ibM3vTJgiGwV3B9TLCjDF4mKMAfA6', 'admin', 'Management'),
  (UUID(), 'Dev User',        'dev@neutara.com',   '$2a$10$tZ2ourCNMUxQfoiDhBxDee/1ibM3vTJgiGwV3B9TLCjDF4mKMAfA6', 'dev',   'Development'),
  (UUID(), 'QA Engineer',     'qa@neutara.com',    '$2a$10$tZ2ourCNMUxQfoiDhBxDee/1ibM3vTJgiGwV3B9TLCjDF4mKMAfA6', 'qa',    'Quality Assurance'),
  (UUID(), 'Infra Engineer',  'infra@neutara.com', '$2a$10$tZ2ourCNMUxQfoiDhBxDee/1ibM3vTJgiGwV3B9TLCjDF4mKMAfA6', 'infra', 'Infrastructure'),
  (UUID(), 'Project Manager', 'pm@neutara.com',    '$2a$10$tZ2ourCNMUxQfoiDhBxDee/1ibM3vTJgiGwV3B9TLCjDF4mKMAfA6', 'viewer','Management')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

INSERT IGNORE INTO jobs (id, job_id, job_name, project_name) VALUES
  (UUID(), 'JOB-001', 'Build & Deploy API Service',   'Neutara Platform'),
  (UUID(), 'JOB-002', 'Deploy Frontend Application',  'Neutara Platform'),
  (UUID(), 'JOB-003', 'Database Migration Job',       'Neutara Platform'),
  (UUID(), 'JOB-004', 'Integration Test Suite',       'Neutara Platform'),
  (UUID(), 'JOB-005', 'Mobile App Build',             'Neutara Mobile');

INSERT IGNORE INTO branches (id, branch_name, project_name) VALUES
  (UUID(), 'main',               'Neutara Platform'),
  (UUID(), 'develop',            'Neutara Platform'),
  (UUID(), 'release/v2.0',       'Neutara Platform'),
  (UUID(), 'feature/auth-module','Neutara Platform'),
  (UUID(), 'hotfix/critical-bug','Neutara Platform'),
  (UUID(), 'staging',            'Neutara Mobile');
