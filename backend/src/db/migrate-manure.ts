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
  console.log('🔄 Running Migration: Add manure_removed Column');
  console.log(`📡 Host: ${connectionString!.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`🔒 SSL: ${requiresSsl ? 'Required (Enabled)' : 'Disabled'}`);
  console.log('----------------------------------------------------\n');

  const sql = postgres(connectionString!, {
    max: 1,
    connect_timeout: 20,
    ssl: requiresSsl ? 'require' : false,
  });

  try {
    console.log('1. Adding manure_removed column to bird_daily_records...');
    await sql.unsafe(`
      ALTER TABLE bird_daily_records 
      ADD COLUMN IF NOT EXISTS manure_removed BOOLEAN DEFAULT FALSE NOT NULL;
    `);
    console.log('   ✅ bird_daily_records.manure_removed ensured.');

    console.log('\n🎉 Manure removal migration completed successfully!');
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await sql.end({ timeout: 5 });
    process.exit(1);
  }
}

runMigration();
