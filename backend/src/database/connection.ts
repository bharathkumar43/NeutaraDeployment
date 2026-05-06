import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

const poolConfig: mysql.PoolOptions = {
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  database:           process.env.DB_NAME     || 'neutara_deployment',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:         0,
  timezone:           '+00:00',
  // Return JS Date objects for DATETIME columns
  typeCast: (field, next) => {
    if (field.type === 'TINY' && field.length === 1) return field.string() === '1';
    return next();
  },
};

export const pool = mysql.createPool(poolConfig);

// ─────────────────────────────────────────────────────────────────────────────
// Unified query helper — same interface used across all controllers/services.
// Uses ? positional placeholders (MySQL native).
// Returns { rows, rowCount } to keep a pg-like API shape.
// ─────────────────────────────────────────────────────────────────────────────
export const query = async (
  sql: string,
  params?: unknown[]
): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> => {
  const start = Date.now();
  // pool.query() supports all param types including integers for LIMIT/OFFSET.
  // pool.execute() uses prepared statements which reject numeric LIMIT params in mysql2.
  const [result] = await pool.query(sql, params ?? []);
  const duration = Date.now() - start;

  // SELECT  → result is RowDataPacket[]
  // INSERT / UPDATE / DELETE → result is ResultSetHeader
  const rows      = Array.isArray(result) ? (result as Record<string, unknown>[]) : [];
  const rowCount  = Array.isArray(result)
    ? rows.length
    : (result as mysql.ResultSetHeader).affectedRows ?? 0;

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

  const conn = await pool.getConnection();
  try {
    for (const stmt of statements) {
      await conn.query(stmt);
    }
  } finally {
    conn.release();
  }
};

export const closePool = async (): Promise<void> => {
  await pool.end();
};

export default { query, pool, executeBatch, closePool };
