import { pgClient } from './client.js';

async function migrateMoat() {
  try {
    console.log('--- Migrating Database for Moat & Moat Percentage ---');

    // 1. Add moat and moat_percentage columns if not exist
    await pgClient`
      ALTER TABLE bird_daily_records 
      ADD COLUMN IF NOT EXISTS moat INTEGER DEFAULT 0 NOT NULL;
    `;
    console.log('✓ Added moat column to bird_daily_records');

    await pgClient`
      ALTER TABLE bird_daily_records 
      ADD COLUMN IF NOT EXISTS moat_percentage NUMERIC(6, 3) DEFAULT 0 NOT NULL;
    `;
    console.log('✓ Added moat_percentage column to bird_daily_records');

    // 2. Populate moat and moat_percentage for all existing records
    await pgClient`
      UPDATE bird_daily_records b
      SET 
        moat = sub.cumul_mort,
        moat_percentage = CASE 
          WHEN f.initial_birds > 0 THEN ROUND((sub.cumul_mort::numeric / f.initial_birds) * 100, 3)
          ELSE 0 
        END
      FROM (
        SELECT id, flock_id, date,
          SUM(mortality) OVER (
            PARTITION BY flock_id 
            ORDER BY date ASC 
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) as cumul_mort
        FROM bird_daily_records
      ) sub
      JOIN flocks f ON f.id = sub.flock_id
      WHERE b.id = sub.id;
    `;
    console.log('✓ Computed and populated moat and moat_percentage across existing records');

    // 3. Inspect populated records
    const records = await pgClient`
      SELECT f.flock_code, b.date, b.mortality as today_mortality, b.moat, b.moat_percentage, f.initial_birds
      FROM bird_daily_records b
      JOIN flocks f ON f.id = b.flock_id
      ORDER BY f.flock_code, b.date;
    `;
    console.log('\n--- Current bird_daily_records with Moat ---');
    console.table(records);

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateMoat();
