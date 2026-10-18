// Applies db/migrations/*.sql in order (each file once). Usage: npm run db:migrate   |   npm run db:seed
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set (see .env.example)'); process.exit(1); }
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  if (process.argv.includes('--seed')) {
    await client.query(await readFile('db/seed/seed.sql', 'utf8'));
    console.log('Seed data applied.');
  } else {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const done = new Set((await client.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version));
    for (const file of (await readdir('db/migrations')).filter((f) => f.endsWith('.sql')).sort()) {
      if (done.has(file)) { console.log(`skip   ${file}`); continue; }
      await client.query('BEGIN');
      try {
        await client.query(await readFile(path.join('db/migrations', file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`apply  ${file}`);
      } catch (e) { await client.query('ROLLBACK'); throw e; }
    }
  }
} finally { await client.end(); }
