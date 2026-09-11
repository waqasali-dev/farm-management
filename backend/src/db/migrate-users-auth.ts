import postgres from 'postgres';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

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

async function runUsersAuthMigration() {
  console.log('====================================================');
  console.log('🔐 Running Migration: Users Table & Multi-User Auth');
  console.log(`📡 Host: ${connectionString!.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`🔒 SSL: ${requiresSsl ? 'Required (Enabled)' : 'Disabled'}`);
  console.log('====================================================\n');

  const sql = postgres(connectionString!, {
    max: 1,
    connect_timeout: 25,
    ssl: requiresSsl ? 'require' : false,
  });

  try {
    // 1. Create users table
    console.log('1. Creating users table...');
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(20) DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

      DROP TRIGGER IF EXISTS set_users_updated_at ON users;
      CREATE TRIGGER set_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('   ✅ users table and indexes created/verified.\n');

    // 2. Add user_id to flocks table
    console.log('2. Adding user_id column to flocks table...');
    await sql.unsafe(`
      ALTER TABLE flocks 
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

      CREATE INDEX IF NOT EXISTS idx_flocks_user_id ON flocks(user_id);
    `);
    console.log('   ✅ flocks.user_id column and foreign key verified.\n');

    // 3. Create or update seed users (admin@farm.com & mujeeb@gmail.com)
    console.log('3. Seeding initial accounts...');
    const adminPasswordHash = await bcrypt.hash('Admin@Farm2026!', 10);
    const mujeebPasswordHash = await bcrypt.hash('Mujeeb@Farm2026!', 10);

    // Upsert Admin
    const [adminUser] = await sql`
      INSERT INTO users (email, password, name, role)
      VALUES ('admin@farm.com', ${adminPasswordHash}, 'Farm Administrator', 'admin')
      ON CONFLICT (email) 
      DO UPDATE SET 
        role = 'admin',
        updated_at = NOW()
      RETURNING id, email, name, role;
    `;
    console.log(`   ✅ Admin user ensured: [${adminUser.id}] ${adminUser.email} (role: ${adminUser.role})`);

    // Upsert Mujeeb
    const [mujeebUser] = await sql`
      INSERT INTO users (email, password, name, role)
      VALUES ('mujeeb@gmail.com', ${mujeebPasswordHash}, 'Mujeeb', 'user')
      ON CONFLICT (email) 
      DO UPDATE SET 
        updated_at = NOW()
      RETURNING id, email, name, role;
    `;
    console.log(`   ✅ Mujeeb user ensured: [${mujeebUser.id}] ${mujeebUser.email} (role: ${mujeebUser.role})\n`);

    // 4. Assign existing unassigned flocks to mujeeb@gmail.com
    console.log('4. Assigning existing unassigned flocks to mujeeb@gmail.com...');
    const updatedFlocks = await sql`
      UPDATE flocks
      SET user_id = ${mujeebUser.id}
      WHERE user_id IS NULL
      RETURNING id, flock_code, name, user_id;
    `;

    console.log(`   ✅ Assigned ${updatedFlocks.length} flock(s) to ${mujeebUser.email}:`);
    for (const f of updatedFlocks) {
      console.log(`      - [${f.flock_code}] ${f.name} (Flock ID: ${f.id})`);
    }

    // 5. Verification summary
    console.log('\n5. Verification:');
    const allUsers = await sql`
      SELECT u.id, u.email, u.name, u.role, COUNT(f.id)::int as flock_count
      FROM users u
      LEFT JOIN flocks f ON f.user_id = u.id
      GROUP BY u.id, u.email, u.name, u.role
      ORDER BY u.created_at;
    `;
    console.log('   All registered users:');
    for (const u of allUsers) {
      console.log(`   - ${u.email.padEnd(22)} | Role: ${u.role.padEnd(6)} | Flocks: ${u.flock_count} | Name: ${u.name}`);
    }

    console.log('\n====================================================');
    console.log('✨ Users & Authentication Migration Completed Successfully!');
    console.log('====================================================');
  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runUsersAuthMigration();
