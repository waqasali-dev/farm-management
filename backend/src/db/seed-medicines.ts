import { db, checkDatabaseConnection, schema } from './client.js';
import { eq } from 'drizzle-orm';

export const STANDARD_POULTRY_MEDICINES = [
  'Tylosin Tartrate',
  'Enrofloxacin 10%',
  'Amprolium 20%',
  'Colistin Sulphate',
  'Vitamin AD3E + C',
  'Lysovit / Multivitamins',
  'Electrolytes + Minerals',
  'Neomycin Sulphate',
  'Doxycycline HCL',
  'Oxytetracycline 20%',
  'Ciprofloxacin',
  'Levamisole',
  'Paracetamol',
];

export async function ensureStandardMedicinesSeeded(): Promise<any[]> {
  const check = await checkDatabaseConnection();
  if (!check.connected) {
    console.warn('[SEED WARNING] DB not connected:', check.error);
    return [];
  }

  let [farm] = await db.select().from(schema.farms).limit(1);
  if (!farm) {
    [farm] = await db.insert(schema.farms).values({ name: 'Central Poultry Estate' }).returning();
  }

  const existingMeds = await db.select().from(schema.medicines);
  const existingNames = new Set(existingMeds.map((m) => m.name.toLowerCase().trim()));

  const toInsert = STANDARD_POULTRY_MEDICINES.filter(
    (name) => !existingNames.has(name.toLowerCase().trim())
  );

  for (const name of toInsert) {
    await db.insert(schema.medicines).values({
      farmId: farm.id,
      name,
      active: true,
    });
  }

  try {
    const { deleteCache } = await import('./redis.js');
    await deleteCache('medicines:list');
  } catch {
    // Ignore redis error
  }

  return db.select().from(schema.medicines);
}

// Run if executed directly
if (process.argv[1]?.includes('seed-medicines')) {
  ensureStandardMedicinesSeeded()
    .then((list) => {
      console.log(`[SEED SUCCESS] ${list.length} medicines available in PostgreSQL.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[SEED FAILED]', err);
      process.exit(1);
    });
}
