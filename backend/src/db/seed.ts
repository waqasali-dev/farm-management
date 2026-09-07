import { db, pgClient, checkDatabaseConnection, schema } from './client.js';

async function seed() {
  console.log('Seeding PostgreSQL database with Section 52 demo data...');
  const status = await checkDatabaseConnection();
  if (!status.connected) {
    console.error('Cannot seed: Database is not currently reachable.', status.error);
    process.exit(1);
  }

  try {
    // 1. Create Demo Farm
    const [farm] = await db.insert(schema.farms).values({
      name: 'Central Poultry Estate',
    }).returning();

    console.log(`Created farm: ${farm.name} (${farm.id})`);

    // 2. Create Two Flocks
    const [flock1] = await db.insert(schema.flocks).values({
      farmId: farm.id,
      flockCode: 'FL-001',
      name: 'Layer Flock Alpha (High Yield)',
      startDate: '2026-08-01',
      initialBirds: 99000,
      eggTrackingEnabled: true,
      status: 'active',
    }).returning();

    const [flock2] = await db.insert(schema.flocks).values({
      farmId: farm.id,
      flockCode: 'FL-002',
      name: 'Broiler Flock Beta (Meat Batch)',
      startDate: '2026-08-15',
      initialBirds: 50000,
      eggTrackingEnabled: false,
      status: 'active',
    }).returning();

    console.log(`Created flock: ${flock1.flockCode} (Egg enabled) and ${flock2.flockCode} (Egg disabled)`);

    // 3. Create Sample Medicines
    await db.insert(schema.medicines).values([
      { farmId: farm.id, name: 'Vitamin AD3E', active: true },
      { farmId: farm.id, name: 'Electrolytes Oral', active: true },
      { farmId: farm.id, name: 'Calcium + D3 Supplement', active: true },
    ]);

    // 4. Sample Daily Records for Flock 1
    await db.insert(schema.birdDailyRecords).values([
      { farmId: farm.id, flockId: flock1.id, date: '2026-09-05', mortality: 25 },
      { farmId: farm.id, flockId: flock1.id, date: '2026-09-06', mortality: 18 },
      { farmId: farm.id, flockId: flock1.id, date: '2026-09-07', mortality: 22 },
    ]);

    await db.insert(schema.feedDailyRecords).values([
      { farmId: farm.id, flockId: flock1.id, date: '2026-09-05', arrivalBags: 300, usedBags: 210 },
      { farmId: farm.id, flockId: flock1.id, date: '2026-09-06', arrivalBags: 0, usedBags: 215 },
      { farmId: farm.id, flockId: flock1.id, date: '2026-09-07', arrivalBags: 200, usedBags: 218 },
    ]);

    await db.insert(schema.eggDailyRecords).values([
      { farmId: farm.id, flockId: flock1.id, date: '2026-09-05', productionPeti: 270, productionTrays: 6, soldPeti: 250, soldTrays: 0 },
      { farmId: farm.id, flockId: flock1.id, date: '2026-09-06', productionPeti: 275, productionTrays: 4, soldPeti: 270, soldTrays: 0 },
      { farmId: farm.id, flockId: flock1.id, date: '2026-09-07', productionPeti: 276, productionTrays: 8, soldPeti: 260, soldTrays: 5 },
    ]);

    console.log('✅ Demo database successfully seeded!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await pgClient.end();
  }
}

seed();
