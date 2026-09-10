import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  boolean,
  date,
  timestamp,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Farms
export const farms = pgTable('farms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Flocks
export const flocks = pgTable('flocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id).notNull(),
  flockCode: varchar('flock_code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }).default('S. S. FEED MILLS (PVT) LTD'),
  startDate: date('start_date').notNull(),
  initialBirds: integer('initial_birds').notNull(),
  eggTrackingEnabled: boolean('egg_tracking_enabled').default(false).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active' | 'closed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
}, (t) => [
  uniqueIndex('farm_flock_code_idx').on(t.farmId, t.flockCode),
]);

// 3. Bird Daily Records
export const birdDailyRecords = pgTable('bird_daily_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id).notNull(),
  flockId: uuid('flock_id').references(() => flocks.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  mortality: integer('mortality').default(0).notNull(),
  moat: integer('moat').default(0).notNull(),
  moatPercentage: numeric('moat_percentage', { precision: 6, scale: 3 }).default('0').notNull(),
  lightHours: numeric('light_hours', { precision: 4, scale: 2 }),
  maxTemperature: numeric('max_temperature', { precision: 5, scale: 2 }),
  minTemperature: numeric('min_temperature', { precision: 5, scale: 2 }),
  manureRemoved: boolean('manure_removed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('flock_bird_date_idx').on(t.flockId, t.date),
]);

// 4. Feed Daily Records
export const feedDailyRecords = pgTable('feed_daily_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id).notNull(),
  flockId: uuid('flock_id').references(() => flocks.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  arrivalBags: integer('arrival_bags').default(0).notNull(),
  usedBags: integer('used_bags').default(0).notNull(),
  returnedBags: integer('returned_bags').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('flock_feed_date_idx').on(t.flockId, t.date),
]);

// 5. Egg Daily Records
export const eggDailyRecords = pgTable('egg_daily_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id).notNull(),
  flockId: uuid('flock_id').references(() => flocks.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  productionPeti: integer('production_peti').default(0).notNull(),
  productionTrays: integer('production_trays').default(0).notNull(),
  cumulativeProductionPeti: integer('cumulative_production_peti').default(0).notNull(),
  cumulativeProductionTrays: integer('cumulative_production_trays').default(0).notNull(),
  soldPeti: integer('sold_peti').default(0).notNull(),
  soldTrays: integer('sold_trays').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('flock_egg_date_idx').on(t.flockId, t.date),
]);

// 6. Egg Usage Records
export const eggUsageRecords = pgTable('egg_usage_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id).notNull(),
  flockId: uuid('flock_id').references(() => flocks.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'gift-use' | 'conveyor-waste' | 'mess-use' | 'store-waste'
  peti: integer('peti').default(0).notNull(),
  trays: integer('trays').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 7. Diesel Daily Records
export const dieselDailyRecords = pgTable('diesel_daily_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id).notNull(),
  flockId: uuid('flock_id').references(() => flocks.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  arrivalLiters: numeric('arrival_liters', { precision: 10, scale: 2 }).default('0').notNull(),
  usedLiters: numeric('used_liters', { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('flock_diesel_date_idx').on(t.flockId, t.date),
]);

// 8. Weight Records
export const weightRecords = pgTable('weight_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id).notNull(),
  flockId: uuid('flock_id').references(() => flocks.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  weight: numeric('weight', { precision: 8, scale: 2 }).notNull(),
  uniformity: numeric('uniformity', { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('flock_weight_date_idx').on(t.flockId, t.date),
]);

// 9. Medicines Master
export const medicines = pgTable('medicines', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 10. Medicine Daily Records
export const medicineDailyRecords = pgTable('medicine_daily_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id).notNull(),
  flockId: uuid('flock_id').references(() => flocks.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  type: varchar('type', { length: 20 }).default('water').notNull(), // 'water' | 'medicine'
  waterLiters: numeric('water_liters', { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('flock_medicine_date_idx').on(t.flockId, t.date),
]);

// 11. Medicine Entries (many-to-one with medicineDailyRecords)
export const medicineEntries = pgTable('medicine_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  dailyRecordId: uuid('daily_record_id').references(() => medicineDailyRecords.id, { onDelete: 'cascade' }).notNull(),
  medicineId: uuid('medicine_id').references(() => medicines.id).notNull(),
  dosagePerLiter: numeric('dosage_per_liter', { precision: 10, scale: 2 }),
});

// 12. Vaccination Records
export const vaccinationRecords = pgTable('vaccination_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id).notNull(),
  flockId: uuid('flock_id').references(() => flocks.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  vaccineName: varchar('vaccine_name', { length: 255 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 13. Chips Daily Records (Calcium Bags)
export const chipsDailyRecords = pgTable('chips_daily_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id).notNull(),
  flockId: uuid('flock_id').references(() => flocks.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  arrivalBags: integer('arrival_bags').default(0).notNull(),
  usedBags: integer('used_bags').default(0).notNull(),
  returnedBags: integer('returned_bags').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('flock_chips_date_idx').on(t.flockId, t.date),
]);

// 14. Tray Daily Records (Plastic & Cardboard Trays Inventory)
export const trayDailyRecords = pgTable('tray_daily_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  farmId: uuid('farm_id').references(() => farms.id).notNull(),
  flockId: uuid('flock_id').references(() => flocks.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  plasticReceived: integer('plastic_received').default(0).notNull(),
  plasticUsed: integer('plastic_used').default(0).notNull(),
  cardboardReceived: integer('cardboard_received').default(0).notNull(),
  cardboardUsed: integer('cardboard_used').default(0).notNull(),
  cardboardWasted: integer('cardboard_wasted').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('flock_trays_date_idx').on(t.flockId, t.date),
]);

// Relations
export const farmsRelations = relations(farms, ({ many }) => ({
  flocks: many(flocks),
  medicines: many(medicines),
}));

export const flocksRelations = relations(flocks, ({ one, many }) => ({
  farm: one(farms, { fields: [flocks.farmId], references: [farms.id] }),
  birdRecords: many(birdDailyRecords),
  feedRecords: many(feedDailyRecords),
  chipsRecords: many(chipsDailyRecords),
  trayRecords: many(trayDailyRecords),
  eggRecords: many(eggDailyRecords),
  eggUsageRecords: many(eggUsageRecords),
  dieselRecords: many(dieselDailyRecords),
  weightRecords: many(weightRecords),
  medicineRecords: many(medicineDailyRecords),
  vaccinationRecords: many(vaccinationRecords),
}));

export const medicineDailyRecordsRelations = relations(medicineDailyRecords, ({ one, many }) => ({
  flock: one(flocks, { fields: [medicineDailyRecords.flockId], references: [flocks.id] }),
  entries: many(medicineEntries),
}));

export const medicineEntriesRelations = relations(medicineEntries, ({ one }) => ({
  dailyRecord: one(medicineDailyRecords, { fields: [medicineEntries.dailyRecordId], references: [medicineDailyRecords.id] }),
  medicine: one(medicines, { fields: [medicineEntries.medicineId], references: [medicines.id] }),
}));
