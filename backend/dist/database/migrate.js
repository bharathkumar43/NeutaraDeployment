"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function migrate() {
    const schemaPath = path_1.default.join(__dirname, 'schema.sql');
    const sql = fs_1.default.readFileSync(schemaPath, 'utf-8');
    console.log('Connecting to PostgreSQL...');
    const client = new pg_1.Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'neutara_deployment',
    });
    try {
        await client.connect();
        console.log('Running database migrations...');
        // Split the SQL into individual statements and execute them
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
        for (const statement of statements) {
            if (statement.trim()) {
                await client.query(statement);
            }
        }
        console.log('✅ PostgreSQL schema applied successfully');
    }
    catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
    finally {
        await client.end();
    }
}
migrate();
//# sourceMappingURL=migrate.js.map