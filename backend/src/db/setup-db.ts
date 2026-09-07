import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:kashi2002@localhost:5432/farm';

async function setupDatabase() {
  console.log(`Connecting to PostgreSQL at: ${connectionString.replace(/:[^:@]+@/, ':****@')} ...`);
  const sql = postgres(connectionString, { max: 1 });

  try {
    // 1. Run Schema SQL
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`Reading SQL schema from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema queries to create tables, indexes, constraints, and triggers...');
    await sql.unsafe(schemaSql);
    console.log('✅ Tables, indexes, and rules created successfully in PostgreSQL!');

    // 2. Verify Tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('\nCreated tables in public schema:');
    tables.forEach((t) => console.log(` - ${t.table_name}`));

    // 3. Seed initial demo data if farms table is empty
    const [farmCount] = await sql`SELECT COUNT(*) as count FROM farms`;
    if (parseInt(farmCount.count, 10) === 0) {
      console.log('\nSeeding initial demo farm and flocks (Section 52)...');

      // Create Demo Farm
      const [farm] = await sql`
        INSERT INTO farms (id, name)
        VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Central Poultry Estate')
        RETURNING id, name;
      `;
      console.log(`Created farm: ${farm.name} (${farm.id})`);

      // Create Flock 1 (Layer, Egg Tracking Enabled)
      const [flock1] = await sql`
        INSERT INTO flocks (id, farm_id, flock_code, name, start_date, initial_birds, egg_tracking_enabled, status)
        VALUES ('7d8c0001-4372-4bc1-9e01-0e02b2c3d480', ${farm.id}, 'FL-001', 'Layer Flock Alpha (High Yield)', '2026-08-01', 99000, true, 'active')
        RETURNING id, flock_code, name;
      `;

      // Create Flock 2 (Broiler, Egg Tracking Disabled)
      const [flock2] = await sql`
        INSERT INTO flocks (id, farm_id, flock_code, name, start_date, initial_birds, egg_tracking_enabled, status)
        VALUES ('7d8c0002-4372-4bc1-9e02-0e02b2c3d481', ${farm.id}, 'FL-002', 'Broiler Flock Beta (Meat Batch)', '2026-08-15', 50000, false, 'active')
        RETURNING id, flock_code, name;
      `;

      console.log(`Created flocks: [${flock1.flock_code}] and [${flock2.flock_code}]`);

      // Seed sample medicines
      const [med1] = await sql`INSERT INTO medicines (farm_id, name, active) VALUES (${farm.id}, 'Vitamin AD3E', true) RETURNING id;`;
      const [med2] = await sql`INSERT INTO medicines (farm_id, name, active) VALUES (${farm.id}, 'Electrolytes Oral', true) RETURNING id;`;
      const [med3] = await sql`INSERT INTO medicines (farm_id, name, active) VALUES (${farm.id}, 'Calcium + D3 Supplement', true) RETURNING id;`;

      // Seed sample daily records for Flock 1
      await sql`
        INSERT INTO bird_daily_records (farm_id, flock_id, date, mortality, light_hours, max_temperature, min_temperature)
        VALUES 
          (${farm.id}, ${flock1.id}, '2026-09-05', 25, 16.0, 28.5, 22.0),
          (${farm.id}, ${flock1.id}, '2026-09-06', 18, 16.0, 29.0, 22.5),
          (${farm.id}, ${flock1.id}, '2026-09-07', 22, 16.5, 30.0, 23.0);
      `;

      await sql`
        INSERT INTO feed_daily_records (farm_id, flock_id, date, arrival_bags, used_bags)
        VALUES
          (${farm.id}, ${flock1.id}, '2026-09-05', 300, 210),
          (${farm.id}, ${flock1.id}, '2026-09-06', 0, 215),
          (${farm.id}, ${flock1.id}, '2026-09-07', 200, 218);
      `;

      await sql`
        INSERT INTO egg_daily_records (farm_id, flock_id, date, production_peti, production_trays, sold_peti, sold_trays)
        VALUES
          (${farm.id}, ${flock1.id}, '2026-09-05', 270, 6, 250, 0),
          (${farm.id}, ${flock1.id}, '2026-09-06', 275, 4, 270, 0),
          (${farm.id}, ${flock1.id}, '2026-09-07', 276, 8, 260, 5);
      `;

      await sql`
        INSERT INTO egg_usage_records (farm_id, flock_id, date, type, peti, trays)
        VALUES
          (${farm.id}, ${flock1.id}, '2026-09-05', 'mess-use', 1, 0),
          (${farm.id}, ${flock1.id}, '2026-09-06', 'conveyor-waste', 0, 5),
          (${farm.id}, ${flock1.id}, '2026-09-07', 'store-waste', 0, 3);
      `;

      await sql`
        INSERT INTO diesel_daily_records (farm_id, flock_id, date, arrival_liters, used_liters)
        VALUES
          (${farm.id}, ${flock1.id}, '2026-09-05', 1500, 120),
          (${farm.id}, ${flock1.id}, '2026-09-06', 0, 135),
          (${farm.id}, ${flock1.id}, '2026-09-07', 500, 110);
      `;

      await sql`
        INSERT INTO weight_records (farm_id, flock_id, date, weight, uniformity)
        VALUES
          (${farm.id}, ${flock1.id}, '2026-08-30', 1650, 86.5),
          (${farm.id}, ${flock1.id}, '2026-09-06', 1720, 88.0);
      `;

      const [medRecord] = await sql`
        INSERT INTO medicine_daily_records (farm_id, flock_id, date, type, water_liters)
        VALUES (${farm.id}, ${flock1.id}, '2026-09-07', 'medicine', 18500)
        RETURNING id;
      `;

      await sql`
        INSERT INTO medicine_entries (daily_record_id, medicine_id, dosage_per_liter)
        VALUES 
          (${medRecord.id}, ${med1.id}, 1.5),
          (${medRecord.id}, ${med3.id}, 2.0);
      `;

      await sql`
        INSERT INTO vaccination_records (farm_id, flock_id, date, vaccine_name, notes)
        VALUES 
          (${farm.id}, ${flock1.id}, '2026-08-10', 'ND + IB Live Vaccine', 'Administered via eye drop method without adverse reactions.'),
          (${farm.id}, ${flock1.id}, '2026-08-28', 'Infectious Bursal Disease (Gumboro)', 'Drinking water route with skimmed milk powder stabilizer.');
      `;

      console.log('✅ Demo seed data populated into PostgreSQL successfully!');
    } else {
      console.log('\nData already present in database. Skipping seed.');
    }
  } catch (err) {
    console.error('Database setup failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setupDatabase();
