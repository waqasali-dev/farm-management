import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL is not defined in environment variables.');
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === 'production';
const requiresSsl =
  connectionString.includes('sslmode=require') ||
  connectionString.includes('ssl=true') ||
  connectionString.includes('neon.tech') ||
  connectionString.includes('render.com') ||
  connectionString.includes('supabase.co') ||
  (isProduction && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'));

async function runMigration() {
  console.log('----------------------------------------------------');
  console.log('🔄 Running Migration: Feed Returns, Chips & Trays Inventory');
  console.log(`📡 Host: ${connectionString!.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`🔒 SSL: ${requiresSsl ? 'Required (Enabled)' : 'Disabled'}`);
  console.log('----------------------------------------------------\n');

  const sql = postgres(connectionString!, {
    max: 1,
    connect_timeout: 20,
    ssl: requiresSsl ? 'require' : false,
  });

  try {
    console.log('1. Adding returned_bags column to feed_daily_records...');
    await sql.unsafe(`
      ALTER TABLE feed_daily_records 
      ADD COLUMN IF NOT EXISTS returned_bags INTEGER DEFAULT 0 NOT NULL CHECK (returned_bags >= 0);
    `);
    console.log('   ✅ feed_daily_records.returned_bags ensured.');

    console.log('2. Creating chips_daily_records table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS chips_daily_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
          flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          arrival_bags INTEGER DEFAULT 0 NOT NULL CHECK (arrival_bags >= 0),
          used_bags INTEGER DEFAULT 0 NOT NULL CHECK (used_bags >= 0),
          returned_bags INTEGER DEFAULT 0 NOT NULL CHECK (returned_bags >= 0),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_chips_flock_date ON chips_daily_records(flock_id, date);
      CREATE INDEX IF NOT EXISTS idx_chips_flock_id ON chips_daily_records(flock_id);
      CREATE INDEX IF NOT EXISTS idx_chips_date ON chips_daily_records(date);

      DROP TRIGGER IF EXISTS set_chips_updated_at ON chips_daily_records;
      CREATE TRIGGER set_chips_updated_at
      BEFORE UPDATE ON chips_daily_records
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS enforce_chips_closed_flock ON chips_daily_records;
      CREATE TRIGGER enforce_chips_closed_flock
      BEFORE INSERT OR UPDATE ON chips_daily_records
      FOR EACH ROW
      EXECUTE FUNCTION enforce_closed_flock_protection();
    `);
    console.log('   ✅ chips_daily_records table, triggers, and indexes ensured.');

    console.log('3. Creating tray_daily_records table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS tray_daily_records (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
          flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          plastic_received INTEGER DEFAULT 0 NOT NULL CHECK (plastic_received >= 0),
          plastic_used INTEGER DEFAULT 0 NOT NULL CHECK (plastic_used >= 0),
          cardboard_received INTEGER DEFAULT 0 NOT NULL CHECK (cardboard_received >= 0),
          cardboard_used INTEGER DEFAULT 0 NOT NULL CHECK (cardboard_used >= 0),
          cardboard_wasted INTEGER DEFAULT 0 NOT NULL CHECK (cardboard_wasted >= 0),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_trays_flock_date ON tray_daily_records(flock_id, date);
      CREATE INDEX IF NOT EXISTS idx_trays_flock_id ON tray_daily_records(flock_id);
      CREATE INDEX IF NOT EXISTS idx_trays_date ON tray_daily_records(date);

      DROP TRIGGER IF EXISTS set_trays_updated_at ON tray_daily_records;
      CREATE TRIGGER set_trays_updated_at
      BEFORE UPDATE ON tray_daily_records
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS enforce_trays_closed_flock ON tray_daily_records;
      CREATE TRIGGER enforce_trays_closed_flock
      BEFORE INSERT OR UPDATE ON tray_daily_records
      FOR EACH ROW
      EXECUTE FUNCTION enforce_closed_flock_protection();
    `);
    console.log('   ✅ tray_daily_records table, triggers, and indexes ensured.');

    console.log('\n🎉 Migration completed successfully!');
  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
