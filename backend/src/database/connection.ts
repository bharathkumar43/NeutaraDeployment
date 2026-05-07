import { Pool } from 'pg';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'neutara_deployment',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

// ─────────────────────────────────────────────────────────────────────────────
// Unified query helper — same interface used across all controllers/services.
// Uses $1, $2, etc. placeholders (PostgreSQL native).
// Returns { rows, rowCount } to keep a pg-like API shape.
// ─────────────────────────────────────────────────────────────────────────────
export const query = async (
  sql: string,
  params?: unknown[]
): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> => {
  const start = Date.now();
  const result = await pool.query(sql, params ?? []);
  const duration = Date.now() - start;

  const rows = result.rows;
  const rowCount = result.rowCount ?? 0;

  logger.debug('Executed query', { duration, rows: rows.length });
  return { rows, rowCount };
};

// Execute a multi-statement SQL file (used in migrations)
export const executeBatch = async (sqlText: string): Promise<void> => {
  // Split on semicolons, skip empty / comment-only blocks
  const statements = sqlText
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    await pool.query(stmt);
  }
};

export const closePool = async (): Promise<void> => {
  await pool.end();
};

export default { query, pool, executeBatch, closePool };
