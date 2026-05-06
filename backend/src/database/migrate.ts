import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql        = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Connecting to MySQL...');

  // Connect WITHOUT specifying a database first so we can run CREATE DATABASE
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,   // needed to run the full schema file
    timezone: '+00:00',
  });

  console.log('Running database migrations...');
  try {
    await conn.query(sql);
    console.log('✅ MySQL schema applied successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

migrate();
