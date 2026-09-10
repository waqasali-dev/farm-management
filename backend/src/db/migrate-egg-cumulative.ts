import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

const client = postgres(dbUrl, {
  ssl: 'require',
  max: 1,
});

async function runMigration() {
  console.log('Connecting to Neon PostgreSQL to add cumulative egg production columns...');
  try {
    // 1. Add columns if not exist
    await client`
      ALTER TABLE egg_daily_records 
      ADD COLUMN IF NOT EXISTS cumulative_production_peti INTEGER DEFAULT 0 NOT NULL,
      ADD COLUMN IF NOT EXISTS cumulative_production_trays INTEGER DEFAULT 0 NOT NULL;
    `;
    console.log('✅ Added columns cumulative_production_peti & cumulative_production_trays to egg_daily_records.');

    // 2. Backfill existing records
    const flocks = await client`SELECT DISTINCT flock_id FROM egg_daily_records;`;
    for (const f of flocks) {
      const records = await client`
        SELECT id, production_peti, production_trays 
        FROM egg_daily_records 
        WHERE flock_id = ${f.flock_id} 
        ORDER BY date ASC;
      `;

      let runningTotalTrays = 0;
      for (const r of records) {
        const dayTrays = (r.production_peti || 0) * 12 + (r.production_trays || 0);
        runningTotalTrays += dayTrays;
        const cumPeti = Math.floor(runningTotalTrays / 12);
        const cumTrays = runningTotalTrays % 12;

        await client`
          UPDATE egg_daily_records 
          SET cumulative_production_peti = ${cumPeti},
              cumulative_production_trays = ${cumTrays}
          WHERE id = ${r.id};
        `;
      }
    }
    console.log(`✅ Backfilled cumulative egg production for ${flocks.length} flocks.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
