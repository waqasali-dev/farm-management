import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function applySchemaOnly() {
  console.log('----------------------------------------------------');
  console.log('🌱 Applying Farm Management Schema to Database');
  console.log(`📡 Host: ${connectionString!.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`🔒 SSL: ${requiresSsl ? 'Required (Enabled)' : 'Disabled'}`);
  console.log('----------------------------------------------------\n');

  const sql = postgres(connectionString!, {
    max: 1,
    connect_timeout: 20,
    ssl: requiresSsl ? 'require' : false,
  });

  try {
    // 1. Verify basic connection
    console.log('1. Verifying database connection...');
    const ping = await sql`SELECT 1 as ping, current_database() as db_name, version() as version;`;
    console.log(`   Connected to: ${ping[0].db_name} (${ping[0].version.split(' ')[0]} ${ping[0].version.split(' ')[1]})\n`);

    // 2. Read schema SQL
    let schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(__dirname, '../../src/db/schema.sql');
    }
    console.log(`2. Reading schema from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // 3. Execute schema queries (CREATE TABLE IF NOT EXISTS, INDEXES, TRIGGERS)
    console.log('3. Applying schema: creating tables, types, indexes, and triggers...');
    await sql.unsafe(schemaSql);
    console.log('   ✅ Schema executed successfully!\n');

    // 4. Verify created tables in public schema
    console.log('4. Verifying created tables in public schema:');
    const tables = await sql<{ table_name: string }[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log(`   Found ${tables.length} tables:`);
    for (const t of tables) {
      // Query row count for each table to verify it is empty
      const [countResult] = await sql.unsafe(`SELECT COUNT(*)::int as count FROM "${t.table_name}";`);
      console.log(`   - ${t.table_name.padEnd(26)} : ${countResult.count} rows`);
    }

    console.log('\n----------------------------------------------------');
    console.log('✨ Database schema applied successfully! (0 records added, clean DB)');
    console.log('----------------------------------------------------');
  } catch (err: any) {
    console.error('\n❌ Schema application failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applySchemaOnly();
