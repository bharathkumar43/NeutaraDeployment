-- Azure AD Migration
-- Run this script once against your PostgreSQL database
-- to enable Azure AD authentication support

-- 1. Make password_hash optional (Azure users have no password)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Track how each user authenticates
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_type VARCHAR(20) NOT NULL DEFAULT 'azure';

-- 3. Existing password-based users (admin) keep their auth_type as 'password'
UPDATE users SET auth_type = 'password' WHERE password_hash IS NOT NULL;
