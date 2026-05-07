"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePool = exports.executeBatch = exports.query = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = __importDefault(require("../utils/logger"));
dotenv_1.default.config();
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
exports.pool = new pg_1.Pool(poolConfig);
// ─────────────────────────────────────────────────────────────────────────────
// Unified query helper — same interface used across all controllers/services.
// Uses $1, $2, etc. placeholders (PostgreSQL native).
// Returns { rows, rowCount } to keep a pg-like API shape.
// ─────────────────────────────────────────────────────────────────────────────
const query = async (sql, params) => {
    const start = Date.now();
    const result = await exports.pool.query(sql, params ?? []);
    const duration = Date.now() - start;
    const rows = result.rows;
    const rowCount = result.rowCount ?? 0;
    logger_1.default.debug('Executed query', { duration, rows: rows.length });
    return { rows, rowCount };
};
exports.query = query;
// Execute a multi-statement SQL file (used in migrations)
const executeBatch = async (sqlText) => {
    // Split on semicolons, skip empty / comment-only blocks
    const statements = sqlText
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));
    for (const stmt of statements) {
        await exports.pool.query(stmt);
    }
};
exports.executeBatch = executeBatch;
const closePool = async () => {
    await exports.pool.end();
};
exports.closePool = closePool;
exports.default = { query: exports.query, pool: exports.pool, executeBatch: exports.executeBatch, closePool: exports.closePool };
//# sourceMappingURL=connection.js.map