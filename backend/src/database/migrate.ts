import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql        = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Connecting to PostgreSQL...');

  const client = new Client({
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
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
