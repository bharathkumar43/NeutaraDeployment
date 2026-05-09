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
    console.log('Migration complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
