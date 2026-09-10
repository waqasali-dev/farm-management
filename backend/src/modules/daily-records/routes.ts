import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, and, lt, gt, asc, lte } from 'drizzle-orm';
import { db, isDatabaseConnected, schema } from '../../db/client.js';
import { mockStore } from '../../db/mock-store.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { flushFlockCache, getCache, setCache } from '../../db/redis.js';
import {
  petiTraysToEggs,
  eggsToPetiTrays,
  normalizePetiTrays,
  calculateBirdAge,
} from '../../calculations/index.js';

const dailyRecordSaveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  birds: z.object({
    mortality: z.number().int().min(0, 'Mortality cannot be negative'),
    lightHours: z.number().min(0).max(24).optional().nullable(),
    maxTemperature: z.number().optional().nullable(),
    minTemperature: z.number().optional().nullable(),
    manureRemoved: z.boolean().optional().nullable(),
    manuerRemoved: z.boolean().optional().nullable(),
  }).optional(),
  feed: z.object({
    arrivalBags: z.number().int().min(0, 'Arrival bags cannot be negative'),
    usedBags: z.number().int().min(0, 'Used bags cannot be negative'),
    returnedBags: z.number().int().min(0, 'Returned bags cannot be negative').optional(),
  }).optional(),
  chips: z.object({
    arrivalBags: z.number().int().min(0, 'Arrival bags cannot be negative'),
    usedBags: z.number().int().min(0, 'Used bags cannot be negative'),
    returnedBags: z.number().int().min(0, 'Returned bags cannot be negative').optional(),
  }).optional(),
  trays: z.object({
    plasticReceived: z.number().int().min(0).optional(),
    plasticUsed: z.number().int().min(0).optional(),
    cardboardReceived: z.number().int().min(0).optional(),
    cardboardUsed: z.number().int().min(0).optional(),
    cardboardWasted: z.number().int().min(0).optional(),
  }).optional(),
  eggs: z.object({
    productionPeti: z.number().int().min(0),
    productionTrays: z.number().int().min(0),
    soldPeti: z.number().int().min(0),
    soldTrays: z.number().int().min(0),
  }).optional(),
  eggUsage: z.array(z.object({
    id: z.string().optional(),
    type: z.enum(['gift-use', 'conveyor-waste', 'mess-use', 'store-waste']),
    peti: z.number().int().min(0),
    trays: z.number().int().min(0),
  })).optional(),
  diesel: z.object({
    arrivalLiters: z.number().min(0),
    usedLiters: z.number().min(0),
  }).optional(),
  weight: z.object({
    weight: z.number().positive('Weight must be positive'),
    uniformity: z.number().min(0).max(100, 'Uniformity must be between 0 and 100'),
  }).optional().nullable(),
  medicine: z.object({
    type: z.enum(['water', 'medicine']),
    waterLiters: z.number().min(0),
    medicines: z.array(z.object({
      medicineId: z.string().optional(),
      name: z.string().optional(),
      dosagePerLiter: z.number().optional(),
    })).optional(),
  }).optional(),
  vaccination: z.object({
    vaccineName: z.string().min(1),
    notes: z.string().optional(),
  }).optional().nullable(),
});

async function computeDailyRecordPayload(flockId: string, date: string): Promise<any | null> {
  if (isDatabaseConnected()) {
    try {
      const [flock] = await db.select().from(schema.flocks).where(eq(schema.flocks.id, flockId));
      if (!flock) return null;

      const [bird] = await db
        .select()
        .from(schema.birdDailyRecords)
        .where(and(eq(schema.birdDailyRecords.flockId, flockId), eq(schema.birdDailyRecords.date, date)));

      const [feed] = await db
        .select()
        .from(schema.feedDailyRecords)
        .where(and(eq(schema.feedDailyRecords.flockId, flockId), eq(schema.feedDailyRecords.date, date)));

      const [chips] = await db
        .select()
        .from(schema.chipsDailyRecords)
        .where(and(eq(schema.chipsDailyRecords.flockId, flockId), eq(schema.chipsDailyRecords.date, date)));

      const [trays] = await db
        .select()
        .from(schema.trayDailyRecords)
        .where(and(eq(schema.trayDailyRecords.flockId, flockId), eq(schema.trayDailyRecords.date, date)));

      const [eggs] = await db
        .select()
        .from(schema.eggDailyRecords)
        .where(and(eq(schema.eggDailyRecords.flockId, flockId), eq(schema.eggDailyRecords.date, date)));

      const eggUsage = await db
        .select()
        .from(schema.eggUsageRecords)
        .where(and(eq(schema.eggUsageRecords.flockId, flockId), eq(schema.eggUsageRecords.date, date)));

      const [diesel] = await db
        .select()
        .from(schema.dieselDailyRecords)
        .where(and(eq(schema.dieselDailyRecords.flockId, flockId), eq(schema.dieselDailyRecords.date, date)));

      const [weight] = await db
        .select()
        .from(schema.weightRecords)
        .where(and(eq(schema.weightRecords.flockId, flockId), eq(schema.weightRecords.date, date)));

      const [medRecord] = await db
        .select()
        .from(schema.medicineDailyRecords)
        .where(and(eq(schema.medicineDailyRecords.flockId, flockId), eq(schema.medicineDailyRecords.date, date)));

      let medEntriesWithNames: any[] = [];
      if (medRecord) {
        const entries = await db
          .select()
          .from(schema.medicineEntries)
          .where(eq(schema.medicineEntries.dailyRecordId, medRecord.id));

        const allMeds = await db.select().from(schema.medicines);
        medEntriesWithNames = entries.map((e) => ({
          medicineId: e.medicineId,
          name: allMeds.find((m) => m.id === e.medicineId)?.name || 'Medicine',
          dosagePerLiter: e.dosagePerLiter ? parseFloat(e.dosagePerLiter) : undefined,
        }));
      }

      const [vaccination] = await db
        .select()
        .from(schema.vaccinationRecords)
        .where(and(eq(schema.vaccinationRecords.flockId, flockId), eq(schema.vaccinationRecords.date, date)));

      const priorBirdRecords = await db
        .select()
        .from(schema.birdDailyRecords)
        .where(and(eq(schema.birdDailyRecords.flockId, flockId), lte(schema.birdDailyRecords.date, date)));

      const cumulativeMoat = priorBirdRecords.reduce((sum, r) => sum + r.mortality, 0);
      const cumulativeMoatPct = flock.initialBirds > 0 ? Number(((cumulativeMoat / flock.initialBirds) * 100).toFixed(3)) : 0;

      // Feed prior balances and cumulative received
      const allFeedUpToDate = await db
        .select()
        .from(schema.feedDailyRecords)
        .where(and(eq(schema.feedDailyRecords.flockId, flockId), lte(schema.feedDailyRecords.date, date)));

      const totalArrivalBagsTillNow = allFeedUpToDate.reduce((sum, r) => sum + r.arrivalBags, 0);
      const totalReturnedBagsTillNow = allFeedUpToDate.reduce((sum, r) => sum + (r.returnedBags || 0), 0);
      const priorFeed = allFeedUpToDate.filter((r) => r.date < date);
      const previousFeedStockBags = Math.max(
        0,
        priorFeed.reduce((sum, r) => sum + r.arrivalBags, 0) -
          priorFeed.reduce((sum, r) => sum + r.usedBags, 0) -
          priorFeed.reduce((sum, r) => sum + (r.returnedBags || 0), 0)
      );

      // Chips (calcium) prior balances
      const allChipsUpToDate = await db
        .select()
        .from(schema.chipsDailyRecords)
        .where(and(eq(schema.chipsDailyRecords.flockId, flockId), lte(schema.chipsDailyRecords.date, date)));

      const totalChipsArrivalBagsTillNow = allChipsUpToDate.reduce((sum, r) => sum + r.arrivalBags, 0);
      const totalChipsReturnedBagsTillNow = allChipsUpToDate.reduce((sum, r) => sum + (r.returnedBags || 0), 0);
      const priorChips = allChipsUpToDate.filter((r) => r.date < date);
      const previousChipsStockBags = Math.max(
        0,
        priorChips.reduce((sum, r) => sum + r.arrivalBags, 0) -
          priorChips.reduce((sum, r) => sum + r.usedBags, 0) -
          priorChips.reduce((sum, r) => sum + (r.returnedBags || 0), 0)
      );

      // Trays (plastic & cardboard) prior balances
      const allTraysUpToDate = await db
        .select()
        .from(schema.trayDailyRecords)
        .where(and(eq(schema.trayDailyRecords.flockId, flockId), lte(schema.trayDailyRecords.date, date)));

      const totalPlasticReceivedTrays = allTraysUpToDate.reduce((sum, r) => sum + r.plasticReceived, 0);
      const totalCardboardReceivedTrays = allTraysUpToDate.reduce((sum, r) => sum + r.cardboardReceived, 0);
      const totalCardboardWastedTrays = allTraysUpToDate.reduce((sum, r) => sum + r.cardboardWasted, 0);

      const priorTrays = allTraysUpToDate.filter((r) => r.date < date);
      const previousPlasticStockTrays = Math.max(
        0,
        priorTrays.reduce((sum, r) => sum + r.plasticReceived, 0) -
          priorTrays.reduce((sum, r) => sum + r.plasticUsed, 0)
      );
      const previousCardboardStockTrays = Math.max(
        0,
        priorTrays.reduce((sum, r) => sum + r.cardboardReceived, 0) -
          priorTrays.reduce((sum, r) => sum + r.cardboardUsed, 0) -
          priorTrays.reduce((sum, r) => sum + r.cardboardWasted, 0)
      );

      // Egg prior balances & Cumulative production till date
      let previousEggStock = { peti: 0, trays: 0, looseEggs: 0, formatted: '0 Peti, 0 Trays' };
      let priorTotalProdTrays = 0;
      let todayCumulativeProduction = { peti: 0, trays: 0, totalTrays: 0, totalEggs: 0, formatted: '0 Peti, 0 Trays' };

      if (flock.eggTrackingEnabled) {
        const priorEggRecords = await db
          .select()
          .from(schema.eggDailyRecords)
          .where(and(eq(schema.eggDailyRecords.flockId, flockId), lt(schema.eggDailyRecords.date, date)));

        const priorUsageRecords = await db
          .select()
          .from(schema.eggUsageRecords)
          .where(and(eq(schema.eggUsageRecords.flockId, flockId), lt(schema.eggUsageRecords.date, date)));

        let priorTotalSoldEggs = 0;
        let priorTotalUsageEggs = 0;

        for (const r of priorEggRecords) {
          priorTotalProdTrays += (r.productionPeti || 0) * 12 + (r.productionTrays || 0);
          priorTotalSoldEggs += petiTraysToEggs(r.soldPeti, r.soldTrays);
        }

        for (const u of priorUsageRecords) {
          priorTotalUsageEggs += petiTraysToEggs(u.peti, u.trays);
        }

        const priorTotalProdEggs = priorTotalProdTrays * 30;
        const priorRemainingEggs = Math.max(0, priorTotalProdEggs - priorTotalSoldEggs - priorTotalUsageEggs);
        previousEggStock = eggsToPetiTrays(priorRemainingEggs);

        const todayProdTrays = (eggs?.productionPeti || 0) * 12 + (eggs?.productionTrays || 0);
        const allTraysTillDate = priorTotalProdTrays + todayProdTrays;
        todayCumulativeProduction = normalizePetiTrays(Math.floor(allTraysTillDate / 12), allTraysTillDate % 12);
      }

      // Diesel prior balance
      const priorDieselRecords = await db
        .select()
        .from(schema.dieselDailyRecords)
        .where(and(eq(schema.dieselDailyRecords.flockId, flockId), lt(schema.dieselDailyRecords.date, date)));

      const priorDieselArrival = priorDieselRecords.reduce((sum, r) => sum + parseFloat(r.arrivalLiters), 0);
      const priorDieselUsed = priorDieselRecords.reduce((sum, r) => sum + parseFloat(r.usedLiters), 0);
      const previousDieselStockLiters = Math.max(0, priorDieselArrival - priorDieselUsed);

      const birdAge = calculateBirdAge(date, flock.startDate);

      const hasExistingRecord = Boolean(
        bird ||
        feed ||
        chips ||
        trays ||
        eggs ||
        (eggUsage && eggUsage.length > 0) ||
        diesel ||
        weight ||
        medRecord ||
        vaccination
      );

      return {
        flockId,
        date,
        flockStatus: flock.status,
        eggTrackingEnabled: flock.eggTrackingEnabled,
        hasExistingRecord,
        birds: bird ? {
          mortality: bird.mortality,
          moat: cumulativeMoat,
          moatPercentage: cumulativeMoatPct,
          lightHours: bird.lightHours ? parseFloat(bird.lightHours) : null,
          maxTemperature: bird.maxTemperature ? parseFloat(bird.maxTemperature) : null,
          minTemperature: bird.minTemperature ? parseFloat(bird.minTemperature) : null,
          manureRemoved: bird.manureRemoved ?? false,
        } : { mortality: 0, moat: cumulativeMoat, moatPercentage: cumulativeMoatPct, lightHours: null, maxTemperature: null, minTemperature: null, manureRemoved: false },
        feed: feed ? {
          arrivalBags: feed.arrivalBags,
          usedBags: feed.usedBags,
          returnedBags: feed.returnedBags || 0,
        } : { arrivalBags: 0, usedBags: 0, returnedBags: 0 },
        chips: chips ? {
          arrivalBags: chips.arrivalBags,
          usedBags: chips.usedBags,
          returnedBags: chips.returnedBags || 0,
        } : { arrivalBags: 0, usedBags: 0, returnedBags: 0 },
        trays: trays ? {
          plasticReceived: trays.plasticReceived,
          plasticUsed: trays.plasticUsed,
          cardboardReceived: trays.cardboardReceived,
          cardboardUsed: trays.cardboardUsed,
          cardboardWasted: trays.cardboardWasted,
        } : { plasticReceived: 0, plasticUsed: 0, cardboardReceived: 0, cardboardUsed: 0, cardboardWasted: 0 },
        eggs: eggs ? {
          productionPeti: eggs.productionPeti,
          productionTrays: eggs.productionTrays,
          cumulativeProductionPeti: eggs.cumulativeProductionPeti ?? todayCumulativeProduction.peti,
          cumulativeProductionTrays: eggs.cumulativeProductionTrays ?? todayCumulativeProduction.trays,
          cumulativeProductionFormatted: todayCumulativeProduction.formatted,
          cumulativeProductionEggs: todayCumulativeProduction.totalEggs,
          soldPeti: eggs.soldPeti,
          soldTrays: eggs.soldTrays,
        } : {
          productionPeti: 0,
          productionTrays: 0,
          cumulativeProductionPeti: todayCumulativeProduction.peti,
          cumulativeProductionTrays: todayCumulativeProduction.trays,
          cumulativeProductionFormatted: todayCumulativeProduction.formatted,
          cumulativeProductionEggs: todayCumulativeProduction.totalEggs,
          soldPeti: 0,
          soldTrays: 0,
        },
        eggUsage: eggUsage.map((u) => ({
          id: u.id,
          type: u.type,
          peti: u.peti,
          trays: u.trays,
        })),
        diesel: diesel ? {
          arrivalLiters: parseFloat(diesel.arrivalLiters),
          usedLiters: parseFloat(diesel.usedLiters),
        } : { arrivalLiters: 0, usedLiters: 0 },
        weight: weight ? {
          weight: parseFloat(weight.weight),
          uniformity: parseFloat(weight.uniformity),
        } : null,
        medicine: medRecord ? {
          type: medRecord.type,
          waterLiters: parseFloat(medRecord.waterLiters),
          medicines: medEntriesWithNames,
        } : { type: 'water', waterLiters: 0, medicines: [] },
        vaccination: vaccination ? {
          vaccineName: vaccination.vaccineName,
          notes: vaccination.notes,
        } : null,
        priorBalances: {
          previousFeedStockBags,
          totalArrivalBagsTillNow,
          totalReturnedBagsTillNow,
          previousChipsStockBags,
          totalChipsArrivalBagsTillNow,
          totalChipsReturnedBagsTillNow,
          previousPlasticStockTrays,
          totalPlasticReceivedTrays,
          previousCardboardStockTrays,
          totalCardboardReceivedTrays,
          totalCardboardWastedTrays,
          previousEggStock,
          totalProducedEggsTillDate: todayCumulativeProduction,
          priorTotalProducedEggs: normalizePetiTrays(Math.floor(priorTotalProdTrays / 12), priorTotalProdTrays % 12),
          previousDieselStockLiters,
          birdAge,
        },
      };
    } catch (err) {
      // Fall back to mock store
    }
  }

  // Fallback store
  const flock = mockStore.flocks.find((f) => f.id === flockId);
  if (!flock) return null;

  const bird = mockStore.birdRecords.find((r) => r.flockId === flockId && r.date === date) || null;
  const feed = mockStore.feedRecords.find((r) => r.flockId === flockId && r.date === date) || null;
  const chips = mockStore.chipsRecords.find((r) => r.flockId === flockId && r.date === date) || null;
  const trays = mockStore.trayRecords.find((r) => r.flockId === flockId && r.date === date) || null;
  const eggs = mockStore.eggRecords.find((r) => r.flockId === flockId && r.date === date) || null;
  const eggUsage = mockStore.eggUsageRecords.filter((r) => r.flockId === flockId && r.date === date);
  const diesel = mockStore.dieselRecords.find((r) => r.flockId === flockId && r.date === date) || null;
  const weight = mockStore.weightRecords.find((r) => r.flockId === flockId && r.date === date) || null;
  const medicine = mockStore.medicineDailyRecords.find((r) => r.flockId === flockId && r.date === date) || null;
  const vaccination = mockStore.vaccinationRecords.find((r) => r.flockId === flockId && r.date === date) || null;

  const hasExistingRecord = Boolean(
    bird ||
    feed ||
    chips ||
    trays ||
    eggs ||
    (eggUsage && eggUsage.length > 0) ||
    diesel ||
    weight ||
    medicine ||
    vaccination
  );

  const priorBirdRecords = mockStore.birdRecords.filter((r) => r.flockId === flockId && r.date <= date);
  const cumulativeMoat = priorBirdRecords.reduce((sum, r) => sum + r.mortality, 0);
  const cumulativeMoatPct = flock.initialBirds > 0 ? Number(((cumulativeMoat / flock.initialBirds) * 100).toFixed(3)) : 0;

  // Feed balances
  const allFeedUpToDate = mockStore.feedRecords.filter((r) => r.flockId === flockId && r.date <= date);
  const totalArrivalBagsTillNow = allFeedUpToDate.reduce((sum, r) => sum + r.arrivalBags, 0);
  const totalReturnedBagsTillNow = allFeedUpToDate.reduce((sum, r) => sum + (r.returnedBags || 0), 0);
  const priorFeed = allFeedUpToDate.filter((r) => r.date < date);
  const previousFeedStockBags = Math.max(
    0,
    priorFeed.reduce((sum, r) => sum + r.arrivalBags, 0) -
      priorFeed.reduce((sum, r) => sum + r.usedBags, 0) -
      priorFeed.reduce((sum, r) => sum + (r.returnedBags || 0), 0)
  );

  // Chips balances
  const allChipsUpToDate = mockStore.chipsRecords.filter((r) => r.flockId === flockId && r.date <= date);
  const totalChipsArrivalBagsTillNow = allChipsUpToDate.reduce((sum, r) => sum + r.arrivalBags, 0);
  const totalChipsReturnedBagsTillNow = allChipsUpToDate.reduce((sum, r) => sum + (r.returnedBags || 0), 0);
  const priorChips = allChipsUpToDate.filter((r) => r.date < date);
  const previousChipsStockBags = Math.max(
    0,
    priorChips.reduce((sum, r) => sum + r.arrivalBags, 0) -
      priorChips.reduce((sum, r) => sum + r.usedBags, 0) -
      priorChips.reduce((sum, r) => sum + (r.returnedBags || 0), 0)
  );

  // Trays balances
  const allTraysUpToDate = mockStore.trayRecords.filter((r) => r.flockId === flockId && r.date <= date);
  const totalPlasticReceivedTrays = allTraysUpToDate.reduce((sum, r) => sum + r.plasticReceived, 0);
  const totalCardboardReceivedTrays = allTraysUpToDate.reduce((sum, r) => sum + r.cardboardReceived, 0);
  const totalCardboardWastedTrays = allTraysUpToDate.reduce((sum, r) => sum + r.cardboardWasted, 0);

  const priorTrays = allTraysUpToDate.filter((r) => r.date < date);
  const previousPlasticStockTrays = Math.max(
    0,
    priorTrays.reduce((sum, r) => sum + r.plasticReceived, 0) -
      priorTrays.reduce((sum, r) => sum + r.plasticUsed, 0)
  );
  const previousCardboardStockTrays = Math.max(
    0,
    priorTrays.reduce((sum, r) => sum + r.cardboardReceived, 0) -
      priorTrays.reduce((sum, r) => sum + r.cardboardUsed, 0) -
      priorTrays.reduce((sum, r) => sum + r.cardboardWasted, 0)
  );

  let previousEggStock = { peti: 0, trays: 0 };
  if (flock.eggTrackingEnabled) {
    const priorEggRecords = mockStore.eggRecords.filter((r) => r.flockId === flockId && r.date < date);
    const priorUsageRecords = mockStore.eggUsageRecords.filter((r) => r.flockId === flockId && r.date < date);

    let priorTotalProdEggs = 0;
    let priorTotalSoldEggs = 0;
    let priorTotalUsageEggs = 0;

    for (const r of priorEggRecords) {
      priorTotalProdEggs += petiTraysToEggs(r.productionPeti, r.productionTrays);
      priorTotalSoldEggs += petiTraysToEggs(r.soldPeti, r.soldTrays);
    }

    for (const u of priorUsageRecords) {
      priorTotalUsageEggs += petiTraysToEggs(u.peti, u.trays);
    }

    const priorRemainingEggs = Math.max(0, priorTotalProdEggs - priorTotalSoldEggs - priorTotalUsageEggs);
    previousEggStock = eggsToPetiTrays(priorRemainingEggs);
  }

  const priorDieselRecords = mockStore.dieselRecords.filter((r) => r.flockId === flockId && r.date < date);
  const priorDieselArrival = priorDieselRecords.reduce((sum, r) => sum + r.arrivalLiters, 0);
  const priorDieselUsed = priorDieselRecords.reduce((sum, r) => sum + r.usedLiters, 0);
  const previousDieselStockLiters = Math.max(0, priorDieselArrival - priorDieselUsed);

  return {
    flockId,
    date,
    flockStatus: flock.status,
    eggTrackingEnabled: flock.eggTrackingEnabled,
    hasExistingRecord,
    birds: bird ? {
      mortality: bird.mortality,
      moat: cumulativeMoat,
      moatPercentage: cumulativeMoatPct,
      lightHours: bird.lightHours,
      maxTemperature: bird.maxTemperature,
      minTemperature: bird.minTemperature,
    } : { mortality: 0, moat: cumulativeMoat, moatPercentage: cumulativeMoatPct, lightHours: null, maxTemperature: null, minTemperature: null },
    feed: feed ? {
      arrivalBags: feed.arrivalBags,
      usedBags: feed.usedBags,
      returnedBags: feed.returnedBags || 0,
    } : { arrivalBags: 0, usedBags: 0, returnedBags: 0 },
    chips: chips ? {
      arrivalBags: chips.arrivalBags,
      usedBags: chips.usedBags,
      returnedBags: chips.returnedBags || 0,
    } : { arrivalBags: 0, usedBags: 0, returnedBags: 0 },
    trays: trays ? {
      plasticReceived: trays.plasticReceived,
      plasticUsed: trays.plasticUsed,
      cardboardReceived: trays.cardboardReceived,
      cardboardUsed: trays.cardboardUsed,
      cardboardWasted: trays.cardboardWasted,
    } : { plasticReceived: 0, plasticUsed: 0, cardboardReceived: 0, cardboardUsed: 0, cardboardWasted: 0 },
    eggs: eggs ? {
      productionPeti: eggs.productionPeti,
      productionTrays: eggs.productionTrays,
      soldPeti: eggs.soldPeti,
      soldTrays: eggs.soldTrays,
    } : { productionPeti: 0, productionTrays: 0, soldPeti: 0, soldTrays: 0 },
    eggUsage: eggUsage.map((u) => ({
      id: u.id,
      type: u.type,
      peti: u.peti,
      trays: u.trays,
    })),
    diesel: diesel ? {
      arrivalLiters: diesel.arrivalLiters,
      usedLiters: diesel.usedLiters,
    } : { arrivalLiters: 0, usedLiters: 0 },
    weight: weight ? {
      weight: weight.weight,
      uniformity: weight.uniformity,
    } : null,
    medicine: medicine ? {
      type: medicine.type,
      waterLiters: medicine.waterLiters,
      medicines: medicine.medicines,
    } : { type: 'water', waterLiters: 0, medicines: [] },
    vaccination: vaccination ? {
      vaccineName: vaccination.vaccineName,
      notes: vaccination.notes,
    } : null,
    priorBalances: {
      previousFeedStockBags,
      totalArrivalBagsTillNow,
      totalReturnedBagsTillNow,
      previousChipsStockBags,
      totalChipsArrivalBagsTillNow,
      totalChipsReturnedBagsTillNow,
      previousPlasticStockTrays,
      totalPlasticReceivedTrays,
      previousCardboardStockTrays,
      totalCardboardReceivedTrays,
      totalCardboardWastedTrays,
      previousEggStock,
      previousDieselStockLiters,
      birdAge: calculateBirdAge(date, flock.startDate),
    },
  };
}

export const dailyRecordRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/flocks/:flockId/daily-record?date=YYYY-MM-DD
  fastify.get('/flocks/:flockId/daily-record', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const { date: targetDate } = request.query as { date?: string };
    const date = targetDate || new Date().toISOString().split('T')[0];

    const cacheKey = `flock:${flockId}:daily-record:${date}`;

    // 1. Check Redis first
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    const payload = await computeDailyRecordPayload(flockId, date);
    if (!payload) {
      reply.status(404);
      return errorResponse('Flock not found', 'NOT_FOUND');
    }

    // 2. Save in Redis
    await setCache(cacheKey, payload, 300);
    return successResponse(payload);
  });

  // POST /api/v1/flocks/:flockId/daily-record (Transactional Save)
  fastify.post('/flocks/:flockId/daily-record', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };

    const parsed = dailyRecordSaveSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', parsed.error.format());
    }

    const data = parsed.data;
    const { date } = data;

    if (isDatabaseConnected()) {
      try {
        const [flock] = await db.select().from(schema.flocks).where(eq(schema.flocks.id, flockId));
        if (!flock) {
          reply.status(404);
          return errorResponse('Flock not found', 'NOT_FOUND');
        }

        if (flock.status === 'closed') {
          reply.status(400);
          return errorResponse('Cannot enter or edit daily records for a closed flock.', 'FLOCK_CLOSED');
        }

        const farmId = flock.farmId;

        // Execute in a database transaction (Section 28)
        await db.transaction(async (tx) => {
          // 1. Birds
          if (data.birds) {
            const priorRecords = await tx
              .select()
              .from(schema.birdDailyRecords)
              .where(and(eq(schema.birdDailyRecords.flockId, flockId), lt(schema.birdDailyRecords.date, date)));

            const priorMortality = priorRecords.reduce((sum, r) => sum + r.mortality, 0);
            const totalMoat = priorMortality + data.birds.mortality;
            const moatPercentage = flock.initialBirds > 0 ? Number(((totalMoat / flock.initialBirds) * 100).toFixed(3)) : 0;

            const [existing] = await tx
              .select()
              .from(schema.birdDailyRecords)
              .where(and(eq(schema.birdDailyRecords.flockId, flockId), eq(schema.birdDailyRecords.date, date)));

            const isManureRemoved = Boolean(data.birds.manureRemoved ?? data.birds.manuerRemoved);
            if (existing) {
              await tx
                .update(schema.birdDailyRecords)
                .set({
                  mortality: data.birds.mortality,
                  moat: totalMoat,
                  moatPercentage: String(moatPercentage),
                  lightHours: data.birds.lightHours ? String(data.birds.lightHours) : null,
                  maxTemperature: data.birds.maxTemperature ? String(data.birds.maxTemperature) : null,
                  minTemperature: data.birds.minTemperature ? String(data.birds.minTemperature) : null,
                  manureRemoved: isManureRemoved,
                  updatedAt: new Date(),
                })
                .where(eq(schema.birdDailyRecords.id, existing.id));
            } else {
              await tx.insert(schema.birdDailyRecords).values({
                farmId,
                flockId,
                date,
                mortality: data.birds.mortality,
                moat: totalMoat,
                moatPercentage: String(moatPercentage),
                lightHours: data.birds.lightHours ? String(data.birds.lightHours) : null,
                maxTemperature: data.birds.maxTemperature ? String(data.birds.maxTemperature) : null,
                minTemperature: data.birds.minTemperature ? String(data.birds.minTemperature) : null,
                manureRemoved: isManureRemoved,
              });
            }

            // Recalculate downstream records for subsequent dates if any
            const subsequentRecords = await tx
              .select()
              .from(schema.birdDailyRecords)
              .where(and(eq(schema.birdDailyRecords.flockId, flockId), gt(schema.birdDailyRecords.date, date)))
              .orderBy(asc(schema.birdDailyRecords.date));

            let runningMoat = totalMoat;
            for (const sub of subsequentRecords) {
              runningMoat += sub.mortality;
              const subPct = flock.initialBirds > 0 ? Number(((runningMoat / flock.initialBirds) * 100).toFixed(3)) : 0;
              await tx
                .update(schema.birdDailyRecords)
                .set({
                  moat: runningMoat,
                  moatPercentage: String(subPct),
                  updatedAt: new Date(),
                })
                .where(eq(schema.birdDailyRecords.id, sub.id));
            }
          }

          // 2. Feed
          if (data.feed) {
            const [existing] = await tx
              .select()
              .from(schema.feedDailyRecords)
              .where(and(eq(schema.feedDailyRecords.flockId, flockId), eq(schema.feedDailyRecords.date, date)));

            if (existing) {
              await tx
                .update(schema.feedDailyRecords)
                .set({
                  arrivalBags: data.feed.arrivalBags,
                  usedBags: data.feed.usedBags,
                  returnedBags: data.feed.returnedBags ?? 0,
                  updatedAt: new Date(),
                })
                .where(eq(schema.feedDailyRecords.id, existing.id));
            } else {
              await tx.insert(schema.feedDailyRecords).values({
                farmId,
                flockId,
                date,
                arrivalBags: data.feed.arrivalBags,
                usedBags: data.feed.usedBags,
                returnedBags: data.feed.returnedBags ?? 0,
              });
            }
          }

          // 2.5 Chips (Calcium Supplement)
          if (data.chips) {
            const [existing] = await tx
              .select()
              .from(schema.chipsDailyRecords)
              .where(and(eq(schema.chipsDailyRecords.flockId, flockId), eq(schema.chipsDailyRecords.date, date)));

            if (existing) {
              await tx
                .update(schema.chipsDailyRecords)
                .set({
                  arrivalBags: data.chips.arrivalBags,
                  usedBags: data.chips.usedBags,
                  returnedBags: data.chips.returnedBags ?? 0,
                  updatedAt: new Date(),
                })
                .where(eq(schema.chipsDailyRecords.id, existing.id));
            } else {
              await tx.insert(schema.chipsDailyRecords).values({
                farmId,
                flockId,
                date,
                arrivalBags: data.chips.arrivalBags,
                usedBags: data.chips.usedBags,
                returnedBags: data.chips.returnedBags ?? 0,
              });
            }
          }

          // 2.6 Trays (Plastic & Cardboard)
          if (data.trays) {
            const [existing] = await tx
              .select()
              .from(schema.trayDailyRecords)
              .where(and(eq(schema.trayDailyRecords.flockId, flockId), eq(schema.trayDailyRecords.date, date)));

            if (existing) {
              await tx
                .update(schema.trayDailyRecords)
                .set({
                  plasticReceived: data.trays.plasticReceived ?? 0,
                  plasticUsed: data.trays.plasticUsed ?? 0,
                  cardboardReceived: data.trays.cardboardReceived ?? 0,
                  cardboardUsed: data.trays.cardboardUsed ?? 0,
                  cardboardWasted: data.trays.cardboardWasted ?? 0,
                  updatedAt: new Date(),
                })
                .where(eq(schema.trayDailyRecords.id, existing.id));
            } else {
              await tx.insert(schema.trayDailyRecords).values({
                farmId,
                flockId,
                date,
                plasticReceived: data.trays.plasticReceived ?? 0,
                plasticUsed: data.trays.plasticUsed ?? 0,
                cardboardReceived: data.trays.cardboardReceived ?? 0,
                cardboardUsed: data.trays.cardboardUsed ?? 0,
                cardboardWasted: data.trays.cardboardWasted ?? 0,
              });
            }
          }

          // 3. Eggs (if enabled)
          if (flock.eggTrackingEnabled && data.eggs) {
            const normToday = normalizePetiTrays(data.eggs.productionPeti, data.eggs.productionTrays);
            const normSold = normalizePetiTrays(data.eggs.soldPeti, data.eggs.soldTrays);

            // Prior egg records < date to compute cumulative production up to today
            const priorEggs = await tx
              .select()
              .from(schema.eggDailyRecords)
              .where(and(eq(schema.eggDailyRecords.flockId, flockId), lt(schema.eggDailyRecords.date, date)));

            let priorTraysSum = 0;
            for (const pe of priorEggs) {
              priorTraysSum += (pe.productionPeti || 0) * 12 + (pe.productionTrays || 0);
            }
            const todayCumTrays = priorTraysSum + normToday.totalTrays;
            const todayCumPeti = Math.floor(todayCumTrays / 12);
            const todayCumRemainderTrays = todayCumTrays % 12;

            const [existing] = await tx
              .select()
              .from(schema.eggDailyRecords)
              .where(and(eq(schema.eggDailyRecords.flockId, flockId), eq(schema.eggDailyRecords.date, date)));

            if (existing) {
              await tx
                .update(schema.eggDailyRecords)
                .set({
                  productionPeti: normToday.peti,
                  productionTrays: normToday.trays,
                  cumulativeProductionPeti: todayCumPeti,
                  cumulativeProductionTrays: todayCumRemainderTrays,
                  soldPeti: normSold.peti,
                  soldTrays: normSold.trays,
                  updatedAt: new Date(),
                })
                .where(eq(schema.eggDailyRecords.id, existing.id));
            } else {
              await tx.insert(schema.eggDailyRecords).values({
                farmId,
                flockId,
                date,
                productionPeti: normToday.peti,
                productionTrays: normToday.trays,
                cumulativeProductionPeti: todayCumPeti,
                cumulativeProductionTrays: todayCumRemainderTrays,
                soldPeti: normSold.peti,
                soldTrays: normSold.trays,
              });
            }

            // Cascading recalculation for any subsequent egg records (> date)
            const subsequentEggRecords = await tx
              .select()
              .from(schema.eggDailyRecords)
              .where(and(eq(schema.eggDailyRecords.flockId, flockId), gt(schema.eggDailyRecords.date, date)))
              .orderBy(asc(schema.eggDailyRecords.date));

            let runningTrays = todayCumTrays;
            for (const sub of subsequentEggRecords) {
              runningTrays += (sub.productionPeti || 0) * 12 + (sub.productionTrays || 0);
              const subCumPeti = Math.floor(runningTrays / 12);
              const subCumTrays = runningTrays % 12;
              await tx
                .update(schema.eggDailyRecords)
                .set({
                  cumulativeProductionPeti: subCumPeti,
                  cumulativeProductionTrays: subCumTrays,
                  updatedAt: new Date(),
                })
                .where(eq(schema.eggDailyRecords.id, sub.id));
            }
          }

          // 4. Egg Usage
          if (flock.eggTrackingEnabled && data.eggUsage !== undefined) {
            await tx
              .delete(schema.eggUsageRecords)
              .where(and(eq(schema.eggUsageRecords.flockId, flockId), eq(schema.eggUsageRecords.date, date)));

            for (const u of data.eggUsage) {
              await tx.insert(schema.eggUsageRecords).values({
                farmId,
                flockId,
                date,
                type: u.type,
                peti: u.peti,
                trays: u.trays,
              });
            }
          }

          // 5. Diesel
          if (data.diesel) {
            const [existing] = await tx
              .select()
              .from(schema.dieselDailyRecords)
              .where(and(eq(schema.dieselDailyRecords.flockId, flockId), eq(schema.dieselDailyRecords.date, date)));

            if (existing) {
              await tx
                .update(schema.dieselDailyRecords)
                .set({
                  arrivalLiters: String(data.diesel.arrivalLiters),
                  usedLiters: String(data.diesel.usedLiters),
                  updatedAt: new Date(),
                })
                .where(eq(schema.dieselDailyRecords.id, existing.id));
            } else {
              await tx.insert(schema.dieselDailyRecords).values({
                farmId,
                flockId,
                date,
                arrivalLiters: String(data.diesel.arrivalLiters),
                usedLiters: String(data.diesel.usedLiters),
              });
            }
          }

          // 6. Weight
          if (data.weight) {
            const [existing] = await tx
              .select()
              .from(schema.weightRecords)
              .where(and(eq(schema.weightRecords.flockId, flockId), eq(schema.weightRecords.date, date)));

            if (existing) {
              await tx
                .update(schema.weightRecords)
                .set({
                  weight: String(data.weight.weight),
                  uniformity: String(data.weight.uniformity),
                  updatedAt: new Date(),
                })
                .where(eq(schema.weightRecords.id, existing.id));
            } else {
              await tx.insert(schema.weightRecords).values({
                farmId,
                flockId,
                date,
                weight: String(data.weight.weight),
                uniformity: String(data.weight.uniformity),
              });
            }
          }

          // 7. Medicine & Water
          if (data.medicine) {
            const [existing] = await tx
              .select()
              .from(schema.medicineDailyRecords)
              .where(and(eq(schema.medicineDailyRecords.flockId, flockId), eq(schema.medicineDailyRecords.date, date)));

            let dailyRecId: string;
            if (existing) {
              await tx
                .update(schema.medicineDailyRecords)
                .set({
                  type: data.medicine.type,
                  waterLiters: String(data.medicine.waterLiters),
                  updatedAt: new Date(),
                })
                .where(eq(schema.medicineDailyRecords.id, existing.id));
              dailyRecId = existing.id;
            } else {
              const [created] = await tx
                .insert(schema.medicineDailyRecords)
                .values({
                  farmId,
                  flockId,
                  date,
                  type: data.medicine.type,
                  waterLiters: String(data.medicine.waterLiters),
                })
                .returning();
              dailyRecId = created.id;
            }

            // Replace medicine entries
            await tx.delete(schema.medicineEntries).where(eq(schema.medicineEntries.dailyRecordId, dailyRecId));
            if (data.medicine.medicines && data.medicine.medicines.length > 0) {
              for (const med of data.medicine.medicines) {
                const medName = med.name?.trim() || '';
                const medId = med.medicineId;
                let targetMed: any = null;

                // 1. Try finding by ID
                if (medId) {
                  try {
                    const [foundById] = await tx
                      .select()
                      .from(schema.medicines)
                      .where(eq(schema.medicines.id, medId));
                    targetMed = foundById;
                  } catch {
                    // Ignore UUID parse issues if medId was temporary
                  }
                }

                // 2. Try finding by Name
                if (!targetMed && medName) {
                  const [foundByName] = await tx
                    .select()
                    .from(schema.medicines)
                    .where(eq(schema.medicines.name, medName));
                  targetMed = foundByName;
                }

                // 3. Auto-create in master catalog if new custom medicine
                if (!targetMed && medName) {
                  let [farm] = await tx.select().from(schema.farms).limit(1);
                  if (!farm) {
                    [farm] = await tx.insert(schema.farms).values({ name: 'Central Poultry Estate' }).returning();
                  }
                  [targetMed] = await tx
                    .insert(schema.medicines)
                    .values({
                      farmId: farm.id,
                      name: medName,
                      active: true,
                    })
                    .returning();
                }

                if (targetMed) {
                  await tx.insert(schema.medicineEntries).values({
                    dailyRecordId: dailyRecId,
                    medicineId: targetMed.id,
                    dosagePerLiter: med.dosagePerLiter != null ? String(med.dosagePerLiter) : null,
                  });
                }
              }
            }
          }

          // 8. Vaccination
          if (data.vaccination) {
            const [existing] = await tx
              .select()
              .from(schema.vaccinationRecords)
              .where(and(eq(schema.vaccinationRecords.flockId, flockId), eq(schema.vaccinationRecords.date, date)));

            if (existing) {
              await tx
                .update(schema.vaccinationRecords)
                .set({
                  vaccineName: data.vaccination.vaccineName,
                  notes: data.vaccination.notes || null,
                  updatedAt: new Date(),
                })
                .where(eq(schema.vaccinationRecords.id, existing.id));
            } else {
              await tx.insert(schema.vaccinationRecords).values({
                farmId,
                flockId,
                date,
                vaccineName: data.vaccination.vaccineName,
                notes: data.vaccination.notes || null,
              });
            }
          }
        });

        await flushFlockCache(flockId);
        const freshPayload = await computeDailyRecordPayload(flockId, date);
        if (freshPayload) {
          await setCache(`flock:${flockId}:daily-record:${date}`, freshPayload, 300);
        }
        return successResponse({ message: 'Daily record successfully saved to PostgreSQL', flockId, date });
      } catch (err: any) {
        reply.status(500);
        return errorResponse(err.message || 'Database transaction error during daily record save');
      }
    }

    // Fallback store
    const flock = mockStore.flocks.find((f) => f.id === flockId);
    if (!flock) {
      reply.status(404);
      return errorResponse('Flock not found', 'NOT_FOUND');
    }

    if (flock.status === 'closed') {
      reply.status(400);
      return errorResponse('Cannot enter or edit daily records for a closed flock.', 'FLOCK_CLOSED');
    }

    const farmId = flock.farmId;

    if (data.birds) {
      const existing = mockStore.birdRecords.find((r) => r.flockId === flockId && r.date === date);
      if (existing) {
        existing.mortality = data.birds.mortality;
        existing.lightHours = data.birds.lightHours ?? null;
        existing.maxTemperature = data.birds.maxTemperature ?? null;
        existing.minTemperature = data.birds.minTemperature ?? null;
        existing.updatedAt = new Date();
      } else {
        mockStore.birdRecords.push({
          id: crypto.randomUUID(),
          farmId,
          flockId,
          date,
          mortality: data.birds.mortality,
          lightHours: data.birds.lightHours ?? null,
          maxTemperature: data.birds.maxTemperature ?? null,
          minTemperature: data.birds.minTemperature ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (data.feed) {
      const existing = mockStore.feedRecords.find((r) => r.flockId === flockId && r.date === date);
      if (existing) {
        existing.arrivalBags = data.feed.arrivalBags;
        existing.usedBags = data.feed.usedBags;
        existing.returnedBags = data.feed.returnedBags ?? 0;
        existing.updatedAt = new Date();
      } else {
        mockStore.feedRecords.push({
          id: crypto.randomUUID(),
          farmId,
          flockId,
          date,
          arrivalBags: data.feed.arrivalBags,
          usedBags: data.feed.usedBags,
          returnedBags: data.feed.returnedBags ?? 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (data.chips) {
      const existing = mockStore.chipsRecords.find((r) => r.flockId === flockId && r.date === date);
      if (existing) {
        existing.arrivalBags = data.chips.arrivalBags;
        existing.usedBags = data.chips.usedBags;
        existing.returnedBags = data.chips.returnedBags ?? 0;
        existing.updatedAt = new Date();
      } else {
        mockStore.chipsRecords.push({
          id: crypto.randomUUID(),
          farmId,
          flockId,
          date,
          arrivalBags: data.chips.arrivalBags,
          usedBags: data.chips.usedBags,
          returnedBags: data.chips.returnedBags ?? 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (data.trays) {
      const existing = mockStore.trayRecords.find((r) => r.flockId === flockId && r.date === date);
      if (existing) {
        existing.plasticReceived = data.trays.plasticReceived ?? 0;
        existing.plasticUsed = data.trays.plasticUsed ?? 0;
        existing.cardboardReceived = data.trays.cardboardReceived ?? 0;
        existing.cardboardUsed = data.trays.cardboardUsed ?? 0;
        existing.cardboardWasted = data.trays.cardboardWasted ?? 0;
        existing.updatedAt = new Date();
      } else {
        mockStore.trayRecords.push({
          id: crypto.randomUUID(),
          farmId,
          flockId,
          date,
          plasticReceived: data.trays.plasticReceived ?? 0,
          plasticUsed: data.trays.plasticUsed ?? 0,
          cardboardReceived: data.trays.cardboardReceived ?? 0,
          cardboardUsed: data.trays.cardboardUsed ?? 0,
          cardboardWasted: data.trays.cardboardWasted ?? 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (flock.eggTrackingEnabled && data.eggs) {
      const normToday = normalizePetiTrays(data.eggs.productionPeti, data.eggs.productionTrays);
      const normSold = normalizePetiTrays(data.eggs.soldPeti, data.eggs.soldTrays);

      const priorEggs = mockStore.eggRecords
        .filter((r) => r.flockId === flockId && r.date < date)
        .sort((a, b) => a.date.localeCompare(b.date));

      let priorTraysSum = 0;
      for (const pe of priorEggs) {
        priorTraysSum += (pe.productionPeti || 0) * 12 + (pe.productionTrays || 0);
      }
      const todayCumTrays = priorTraysSum + normToday.totalTrays;
      const todayCumPeti = Math.floor(todayCumTrays / 12);
      const todayCumRemainderTrays = todayCumTrays % 12;

      const existing = mockStore.eggRecords.find((r) => r.flockId === flockId && r.date === date);
      if (existing) {
        existing.productionPeti = normToday.peti;
        existing.productionTrays = normToday.trays;
        existing.cumulativeProductionPeti = todayCumPeti;
        existing.cumulativeProductionTrays = todayCumRemainderTrays;
        existing.soldPeti = normSold.peti;
        existing.soldTrays = normSold.trays;
        existing.updatedAt = new Date();
      } else {
        mockStore.eggRecords.push({
          id: crypto.randomUUID(),
          farmId,
          flockId,
          date,
          productionPeti: normToday.peti,
          productionTrays: normToday.trays,
          cumulativeProductionPeti: todayCumPeti,
          cumulativeProductionTrays: todayCumRemainderTrays,
          soldPeti: normSold.peti,
          soldTrays: normSold.trays,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Cascade to subsequent dates
      const subsequentEggs = mockStore.eggRecords
        .filter((r) => r.flockId === flockId && r.date > date)
        .sort((a, b) => a.date.localeCompare(b.date));

      let running = todayCumTrays;
      for (const sub of subsequentEggs) {
        running += (sub.productionPeti || 0) * 12 + (sub.productionTrays || 0);
        sub.cumulativeProductionPeti = Math.floor(running / 12);
        sub.cumulativeProductionTrays = running % 12;
        sub.updatedAt = new Date();
      }
    }

    if (flock.eggTrackingEnabled && data.eggUsage !== undefined) {
      mockStore.eggUsageRecords = mockStore.eggUsageRecords.filter(
        (r) => !(r.flockId === flockId && r.date === date)
      );
      for (const u of data.eggUsage) {
        mockStore.eggUsageRecords.push({
          id: crypto.randomUUID(),
          farmId,
          flockId,
          date,
          type: u.type,
          peti: u.peti,
          trays: u.trays,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (data.diesel) {
      const existing = mockStore.dieselRecords.find((r) => r.flockId === flockId && r.date === date);
      if (existing) {
        existing.arrivalLiters = data.diesel.arrivalLiters;
        existing.usedLiters = data.diesel.usedLiters;
        existing.updatedAt = new Date();
      } else {
        mockStore.dieselRecords.push({
          id: crypto.randomUUID(),
          farmId,
          flockId,
          date,
          arrivalLiters: data.diesel.arrivalLiters,
          usedLiters: data.diesel.usedLiters,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (data.weight) {
      const existing = mockStore.weightRecords.find((r) => r.flockId === flockId && r.date === date);
      if (existing) {
        existing.weight = data.weight.weight;
        existing.uniformity = data.weight.uniformity;
        existing.updatedAt = new Date();
      } else {
        mockStore.weightRecords.push({
          id: crypto.randomUUID(),
          farmId,
          flockId,
          date,
          weight: data.weight.weight,
          uniformity: data.weight.uniformity,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (data.medicine) {
      const existing = mockStore.medicineDailyRecords.find((r) => r.flockId === flockId && r.date === date);
      if (existing) {
        existing.type = data.medicine.type;
        existing.waterLiters = data.medicine.waterLiters;
        existing.medicines = (data.medicine.medicines || []).map((m) => ({
          medicineId: m.medicineId || crypto.randomUUID(),
          name: m.name || 'Medicine',
          dosagePerLiter: m.dosagePerLiter,
        }));
        existing.updatedAt = new Date();
      } else {
        mockStore.medicineDailyRecords.push({
          id: crypto.randomUUID(),
          farmId,
          flockId,
          date,
          type: data.medicine.type,
          waterLiters: data.medicine.waterLiters,
          medicines: (data.medicine.medicines || []).map((m) => ({
            medicineId: m.medicineId || crypto.randomUUID(),
            name: m.name || 'Medicine',
            dosagePerLiter: m.dosagePerLiter,
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (data.vaccination) {
      const existing = mockStore.vaccinationRecords.find((r) => r.flockId === flockId && r.date === date);
      if (existing) {
        existing.vaccineName = data.vaccination.vaccineName;
        existing.notes = data.vaccination.notes;
        existing.updatedAt = new Date();
      } else {
        mockStore.vaccinationRecords.push({
          id: crypto.randomUUID(),
          farmId,
          flockId,
          date,
          vaccineName: data.vaccination.vaccineName,
          notes: data.vaccination.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    await flushFlockCache(flockId);
    const freshPayload = await computeDailyRecordPayload(flockId, date);
    if (freshPayload) {
      await setCache(`flock:${flockId}:daily-record:${date}`, freshPayload, 300);
    }
    return successResponse({ message: 'Daily record saved to fallback store', flockId, date });
  });
};
