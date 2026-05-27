-- Run this script against your PostgreSQL database to add any missing columns.
-- Safe to run multiple times — uses ADD COLUMN IF NOT EXISTS.

ALTER TABLE deployment_requests ADD COLUMN IF NOT EXISTS request_number        VARCHAR(20) UNIQUE;
ALTER TABLE deployment_requests ADD COLUMN IF NOT EXISTS submitted_at          TIMESTAMP;
ALTER TABLE deployment_requests ADD COLUMN IF NOT EXISTS risk_level            VARCHAR(20);
ALTER TABLE deployment_requests ADD COLUMN IF NOT EXISTS downtime_required     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE deployment_requests ADD COLUMN IF NOT EXISTS db_migration          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE deployment_requests ADD COLUMN IF NOT EXISTS requested_deploy_date TIMESTAMP;
ALTER TABLE deployment_requests ADD COLUMN IF NOT EXISTS extra_meta            JSONB;
ALTER TABLE deployment_requests ALTER COLUMN job_id TYPE TEXT;
ALTER TABLE deployment_requests DROP CONSTRAINT IF EXISTS deployment_requests_status_check;
ALTER TABLE deployment_requests ADD CONSTRAINT deployment_requests_status_check
  CHECK (status IN (
    'draft','pending_qa_approval','qa_approved','rejected_by_qa',
    'pending_infra_deployment','deployment_in_progress','deployment_completed',
    'deployment_failed','pending_dev_acknowledgment',
    'successfully_completed','issue_raised','rejected_by_infra'
  ));

-- Verify columns exist after migration
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'deployment_requests'
ORDER BY ordinal_position;
