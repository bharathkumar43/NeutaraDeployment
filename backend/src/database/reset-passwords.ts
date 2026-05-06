import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function resetPasswords() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'neutara_deployment',
  });

  const hash = await bcrypt.hash('Admin@123', 10);
  console.log('Generated hash:', hash);

  const emails = [
    'admin@neutara.com',
    'dev@neutara.com',
    'qa@neutara.com',
    'infra@neutara.com',
    'pm@neutara.com',
  ];

  for (const email of emails) {
    await conn.query(`UPDATE users SET password_hash = ? WHERE email = ?`, [hash, email]);
    console.log(`✅ Reset password for ${email}`);
  }

  const [rows] = await conn.query(`SELECT email, role, is_active FROM users`) as any;
  console.log('\nCurrent users:');
  (rows as any[]).forEach((r: any) => console.log(` - ${r.email} | ${r.role} | active=${r.is_active}`));

  await conn.end();
  console.log('\nDone. All accounts now use password: Admin@123');
}

resetPasswords().catch(console.error);
