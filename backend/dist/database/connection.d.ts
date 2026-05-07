import { Pool } from 'pg';
export declare const pool: Pool;
export declare const query: (sql: string, params?: unknown[]) => Promise<{
    rows: Record<string, unknown>[];
    rowCount: number;
}>;
export declare const executeBatch: (sqlText: string) => Promise<void>;
export declare const closePool: () => Promise<void>;
declare const _default: {
    query: (sql: string, params?: unknown[]) => Promise<{
        rows: Record<string, unknown>[];
        rowCount: number;
    }>;
    pool: Pool;
    executeBatch: (sqlText: string) => Promise<void>;
    closePool: () => Promise<void>;
};
export default _default;
//# sourceMappingURL=connection.d.ts.map