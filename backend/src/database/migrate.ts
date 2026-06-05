import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const client = new Client({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'neutara_deployment',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // ── 1. Base schema (CREATE TABLE IF NOT EXISTS — safe to re-run) ──────────
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    const schemaStatements = schemaSQL.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of schemaStatements) await client.query(stmt);
    console.log('✅ Base schema applied');

    // ── 2. Azure AD migration (ALTER / ADD COLUMN — safe to re-run) ──────────
    // Make password_hash nullable so Azure users don't need passwords
    await client.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`);

    // Add auth_type column if it doesn't already exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS auth_type VARCHAR(20) NOT NULL DEFAULT 'azure'
    `);

    // Mark existing password-based users correctly
    await client.query(`
      UPDATE users SET auth_type = 'password'
      WHERE password_hash IS NOT NULL AND auth_type = 'azure'
    `);

    console.log('✅ Azure AD migration applied');

    // ── 3. Add artifact_version to infra logs ─────────────────────────────
    await client.query(`
      ALTER TABLE deployment_infra_logs
      ADD COLUMN IF NOT EXISTS artifact_version VARCHAR(255)
    `);
    console.log('✅ Infra logs artifact_version column added');

    // ── 4. Remove old placeholder jobs and seed real product jobs ─────────
    await client.query(`
      DELETE FROM jobs
      WHERE job_id IN ('JOB-001','JOB-002','JOB-003','JOB-004','JOB-005','Reporting Jobs')
    `);
    const jobRows = [
      // Content
      ['MultiUserQueue',                  'MultiUserQueue',                  'Content'],
      ['AutoDelta',                       'AutoDelta',                       'Content'],
      ['MoveSmall',                       'MoveSmall',                       'Content'],
      ['MoveLarge',                       'MoveLarge',                       'Content'],
      ['Stale',                           'Stale',                           'Content'],
      ['Permission',                      'Permission',                      'Content'],
      ['Hyperlink',                       'Hyperlink',                       'Content'],
      ['API',                             'API',                             'Content'],
      ['PreScan',                         'PreScan',                         'Content'],
      ['Aggregate',                       'Aggregate',                       'Content'],
      ['ConflictAutoRetry',               'ConflictAutoRetry',               'Content'],
      ['DataSize',                        'DataSize',                        'Content'],
      ['sharedLink',                      'sharedLink',                      'Content'],
      ['hyperLinkUpdate',                 'hyperLinkUpdate',                 'Content'],
      // Message
      ['Channel Management Jobs',         'Channel Management Jobs',         'Message'],
      ['Data Picking Jobs',               'Data Picking Jobs',               'Message'],
      ['Message Movement Jobs',           'Message Movement Jobs',           'Message'],
      ['Channel Closure & Sharing Jobs',  'Channel Closure & Sharing Jobs',  'Message'],
      ['Monitoring & Recovery Jobs',      'Monitoring & Recovery Jobs',      'Message'],
      ['Status Update Jobs',              'Status Update Jobs',              'Message'],
      ['API Jobs',                        'API Jobs',                        'Message'],
      // Email
      ['Email Processing Jobs',           'Email Processing Jobs',           'Email'],
      ['Email Picking',                   'Email Picking',                   'Email'],
      ['Email Copying',                   'Email Copying',                   'Email'],
      ['Calendar Migration Jobs',         'Calendar Migration Jobs',         'Email'],
      ['Calendar Picking',                'Calendar Picking',                'Email'],
      ['Calendar Copying',                'Calendar Copying',                'Email'],
      ['Contact Migration Jobs',          'Contact Migration Jobs',          'Email'],
      ['Contact Picking',                 'Contact Picking',                 'Email'],
      ['Contact Moving',                  'Contact Moving',                  'Email'],
      ['Status & Reporting Jobs',         'Status & Reporting Jobs',         'Email'],
      ['Workspace Status Update',         'Workspace Status Update',         'Email'],
      ['API Services',                    'API Services',                    'Email'],
      ['General API Services',            'General API Services',            'Email'],
      ['Email Migration API Services',    'Email Migration API Services',    'Email'],
      ['UI Jobs',                         'UI Jobs',                         'Email'],
      // Reporting job per product type
      ['Content-Reporting',               'Reporting',                       'Content'],
      ['Email-Reporting',                 'Reporting',                       'Email'],
      ['Message-Reporting',               'Reporting',                       'Message'],
    ];
    for (const [jobId, jobName, projectName] of jobRows) {
      await client.query(
        `INSERT INTO jobs (id, job_id, job_name, project_name)
         VALUES (uuid_generate_v4(), $1, $2, $3)
         ON CONFLICT (job_id) DO NOTHING`,
        [jobId, jobName, projectName]
      );
    }
    console.log('✅ Jobs seeded (Content, Message, Email)');

    console.log('Migration complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
