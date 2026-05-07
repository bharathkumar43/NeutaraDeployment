"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function resetPasswords() {
    const client = new pg_1.Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'neutara_deployment',
    });
    await client.connect();
    const hash = await bcryptjs_1.default.hash('Admin@123', 10);
    console.log('Generated hash:', hash);
    const emails = [
        'admin@neutara.com',
        'dev@neutara.com',
        'qa@neutara.com',
        'infra@neutara.com',
        'pm@neutara.com',
    ];
    for (const email of emails) {
        await client.query(`UPDATE users SET password_hash = $1 WHERE email = $2`, [hash, email]);
        console.log(`✅ Reset password for ${email}`);
    }
    const result = await client.query(`SELECT email, role, is_active FROM users`);
    console.log('\nCurrent users:');
    result.rows.forEach((r) => console.log(` - ${r.email} | ${r.role} | active=${r.is_active}`));
    await client.end();
    console.log('\nDone. All accounts now use password: Admin@123');
}
resetPasswords().catch(console.error);
//# sourceMappingURL=reset-passwords.js.map