import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, pgClient, checkDatabaseConnection } from './client.js';

async function runMigrations() {
  console.log('Checking database connection before migrating...');
  const status = await checkDatabaseConnection();
  if (!status.connected) {
    console.error('Cannot run migrations: PostgreSQL database is not connected.', status.error);
    process.exit(1);
  }

  console.log('Applying database migrations from ./src/db/migrations ...');
  try {
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    console.log('✅ Migrations applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pgClient.end();
  }
}

runMigrations();
