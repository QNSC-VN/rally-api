/**
 * DB migration runner — called by CI as a gated job BEFORE deploying a new app version.
 * Uses the DATABASE_MIGRATION_URL (privileged role that bypasses RLS).
 * Never run by the app process itself.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';

const url = process.env['DATABASE_MIGRATION_URL'] ?? process.env['DATABASE_URL'];

if (!url) {
  console.error('❌  DATABASE_MIGRATION_URL or DATABASE_URL required');
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });
const db = drizzle(pool);

try {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: path.join(import.meta.dirname, 'migrations') });
  console.log('✅  Migrations applied');
} catch (err) {
  console.error('❌  Migration failed', err);
  process.exit(1);
} finally {
  await pool.end();
}
