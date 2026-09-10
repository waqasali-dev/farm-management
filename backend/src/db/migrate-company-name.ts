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
  console.log('🔄 Running Migration: Add company_name Column to Flocks');
  console.log(`📡 Host: ${connectionString!.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`🔒 SSL: ${requiresSsl ? 'Required (Enabled)' : 'Disabled'}`);
  console.log('----------------------------------------------------\n');

  const sql = postgres(connectionString!, {
    max: 1,
    connect_timeout: 20,
    ssl: requiresSsl ? 'require' : false,
  });

  try {
    console.log('1. Adding company_name column to flocks...');
    await sql.unsafe(`
      ALTER TABLE flocks 
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) DEFAULT 'S. S. FEED MILLS (PVT) LTD';
    `);
    console.log('   ✅ flocks.company_name ensured.');

    console.log('2. Updating existing null company_name values...');
    await sql.unsafe(`
      UPDATE flocks 
      SET company_name = 'S. S. FEED MILLS (PVT) LTD' 
      WHERE company_name IS NULL;
    `);
    console.log('   ✅ Existing flocks initialized with default company name.');

    console.log('\n🎉 Company name migration completed successfully!');
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await sql.end({ timeout: 5 });
    process.exit(1);
  }
}

runMigration();
