-- ============================================================
-- Neutara Deployment Management System
-- PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL CHECK (role IN ('dev','qa','infra','admin','viewer')),
  team          VARCHAR(100),
  avatar_url    TEXT,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  last_login    TIMESTAMP,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       VARCHAR(100) NOT NULL UNIQUE,
  job_name     VARCHAR(255) NOT NULL,
  project_name VARCHAR(255),
  jenkins_url  TEXT,
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BRANCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_name  VARCHAR(255) NOT NULL,
  project_name VARCHAR(255),
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DEPLOYMENT REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS deployment_requests (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number   VARCHAR(20)  UNIQUE,
  deployment_title VARCHAR(500) NOT NULL,
  project_name     VARCHAR(255) NOT NULL,
  job_id           VARCHAR(100),
  branch_name      VARCHAR(255) NOT NULL,
  environment      VARCHAR(50)  NOT NULL,
  ticket_link      TEXT,
  description      TEXT         NOT NULL,
  priority         VARCHAR(20)  NOT NULL CHECK (priority IN ('low','medium','high','critical')),
  raised_by        UUID         NOT NULL REFERENCES users(id),
  status           VARCHAR(50)  NOT NULL DEFAULT 'draft'
                   CHECK (status IN (
                     'draft','pending_qa_approval','qa_approved','rejected_by_qa',
                     'pending_infra_deployment','deployment_in_progress','deployment_completed',
                     'deployment_failed','pending_dev_acknowledgment',
                     'successfully_completed','issue_raised'
                   )),
  submitted_at          TIMESTAMP,
  risk_level            VARCHAR(20),
  downtime_required     BOOLEAN      NOT NULL DEFAULT false,
  db_migration          BOOLEAN      NOT NULL DEFAULT false,
  requested_deploy_date TIMESTAMP,
  extra_meta            JSONB,
  created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add columns if upgrading an existing database
ALTER TABLE deployment_requests ADD COLUMN IF NOT EXISTS request_number        VARCHAR(20) UNIQUE;
ALTER TABLE deployment_requests ADD COLUMN IF NOT EXISTS risk_level            VARCHAR(20);
ALTER TABLE deployment_requests ADD COLUMN IF NOT EXISTS downtime_required     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE deployment_requests ADD COLUMN IF NOT EXISTS db_migration          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE deployment_requests ADD COLUMN IF NOT EXISTS requested_deploy_date TIMESTAMP;
ALTER TABLE deployment_requests ADD COLUMN IF NOT EXISTS extra_meta            JSONB;

CREATE INDEX IF NOT EXISTS idx_dr_status ON deployment_requests(status);
CREATE INDEX IF NOT EXISTS idx_dr_raised_by ON deployment_requests(raised_by);
CREATE INDEX IF NOT EXISTS idx_dr_environment ON deployment_requests(environment);
CREATE INDEX IF NOT EXISTS idx_dr_priority ON deployment_requests(priority);
CREATE INDEX IF NOT EXISTS idx_dr_created_at ON deployment_requests(created_at);

-- ============================================================
-- QA APPROVALS
-- ============================================================
CREATE TABLE IF NOT EXISTS deployment_qa_approvals (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  deployment_id   UUID         NOT NULL REFERENCES deployment_requests(id) ON DELETE CASCADE,
  qa_user_id      UUID         NOT NULL REFERENCES users(id),
  qa_ticket_link  TEXT,
  qa_description  TEXT,
  qa_comments     TEXT         NOT NULL,
  approval_status VARCHAR(20)  NOT NULL CHECK (approval_status IN ('approved','rejected','sent_back')),
  approved_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qa_deployment_id ON deployment_qa_approvals(deployment_id);

-- ============================================================
-- INFRA LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS deployment_infra_logs (
  id                       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  deployment_id            UUID         NOT NULL REFERENCES deployment_requests(id) ON DELETE CASCADE,
  infra_user_id            UUID         NOT NULL REFERENCES users(id),
  deployment_notes         TEXT         NOT NULL,
  screenshot_path          TEXT,
  screenshot_original_name VARCHAR(255),
  deployment_status        VARCHAR(20)  NOT NULL CHECK (deployment_status IN ('in_progress','success','failed')),
  completion_comments      TEXT,
  started_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at             TIMESTAMP,
  created_at               TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_infra_deployment_id ON deployment_infra_logs(deployment_id);

-- ============================================================
-- ACKNOWLEDGMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS deployment_acknowledgments (
  id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  deployment_id          UUID         NOT NULL REFERENCES deployment_requests(id) ON DELETE CASCADE,
  acknowledged_by        UUID         NOT NULL REFERENCES users(id),
  acknowledgment_comment TEXT         NOT NULL,
  status                 VARCHAR(20)  NOT NULL DEFAULT 'acknowledged'
                         CHECK (status IN ('acknowledged','issue_raised')),
  acknowledged_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ack_deployment_id ON deployment_acknowledgments(deployment_id);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  deployment_id UUID         REFERENCES deployment_requests(id) ON DELETE SET NULL,
  action        VARCHAR(255) NOT NULL,
  performed_by  UUID         REFERENCES users(id),
  old_status    VARCHAR(50),
  new_status    VARCHAR(50),
  comment       TEXT,
  metadata      JSONB,
  ip_address    VARCHAR(45),
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_deployment_id ON audit_logs(deployment_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deployment_id UUID         REFERENCES deployment_requests(id) ON DELETE SET NULL,
  title         VARCHAR(500) NOT NULL,
  message       TEXT         NOT NULL,
  type          VARCHAR(20)  NOT NULL CHECK (type IN ('info','success','warning','error')),
  is_read       BOOLEAN      NOT NULL DEFAULT false,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read ON notifications(is_read);

-- ============================================================
-- SEED DATA  (password = Admin@123)
-- ============================================================
INSERT INTO users (id, name, email, password_hash, role, team) VALUES
  (uuid_generate_v4(), 'Admin User',      'admin@neutara.com', '$2a$10$tZ2ourCNMUxQfoiDhBxDee/1ibM3vTJgiGwV3B9TLCjDF4mKMAfA6', 'admin', 'Management'),
  (uuid_generate_v4(), 'Dev User',        'dev@neutara.com',   '$2a$10$tZ2ourCNMUxQfoiDhBxDee/1ibM3vTJgiGwV3B9TLCjDF4mKMAfA6', 'dev',   'Development'),
  (uuid_generate_v4(), 'QA Engineer',     'qa@neutara.com',    '$2a$10$tZ2ourCNMUxQfoiDhBxDee/1ibM3vTJgiGwV3B9TLCjDF4mKMAfA6', 'qa',    'Quality Assurance'),
  (uuid_generate_v4(), 'Infra Engineer',  'infra@neutara.com', '$2a$10$tZ2ourCNMUxQfoiDhBxDee/1ibM3vTJgiGwV3B9TLCjDF4mKMAfA6', 'infra', 'Infrastructure'),
  (uuid_generate_v4(), 'Project Manager', 'pm@neutara.com',    '$2a$10$tZ2ourCNMUxQfoiDhBxDee/1ibM3vTJgiGwV3B9TLCjDF4mKMAfA6', 'viewer','Management')
ON CONFLICT (email) DO NOTHING;

INSERT INTO jobs (id, job_id, job_name, project_name) VALUES
  (uuid_generate_v4(), 'JOB-001', 'Build & Deploy API Service',   'Neutara Platform'),
  (uuid_generate_v4(), 'JOB-002', 'Deploy Frontend Application',  'Neutara Platform'),
  (uuid_generate_v4(), 'JOB-003', 'Database Migration Job',       'Neutara Platform'),
  (uuid_generate_v4(), 'JOB-004', 'Integration Test Suite',       'Neutara Platform'),
  (uuid_generate_v4(), 'JOB-005', 'Mobile App Build',             'Neutara Mobile')
ON CONFLICT (job_id) DO NOTHING;

INSERT INTO branches (id, branch_name, project_name) VALUES
  (uuid_generate_v4(), 'main',               'Neutara Platform'),
  (uuid_generate_v4(), 'develop',            'Neutara Platform'),
  (uuid_generate_v4(), 'release/v2.0',       'Neutara Platform'),
  (uuid_generate_v4(), 'feature/auth',       'Neutara Platform'),
  (uuid_generate_v4(), 'hotfix/security',    'Neutara Platform')
ON CONFLICT DO NOTHING;
