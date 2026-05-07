import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function resetPasswords() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'neutara_deployment',
  });

  await client.connect();

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
    await client.query(`UPDATE users SET password_hash = $1 WHERE email = $2`, [hash, email]);
    console.log(`✅ Reset password for ${email}`);
  }

  const result = await client.query(`SELECT email, role, is_active FROM users`);
  console.log('\nCurrent users:');
  result.rows.forEach((r: any) => console.log(` - ${r.email} | ${r.role} | active=${r.is_active}`));

  await client.end();
  console.log('\nDone. All accounts now use password: Admin@123');
}

resetPasswords().catch(console.error);
