import { FastifyPluginAsync } from 'fastify';
import { eq, asc } from 'drizzle-orm';
import { db, isDatabaseConnected, schema } from '../../db/client.js';
import { mockStore } from '../../db/mock-store.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import {
  calculateRemainingBirds,
  calculateMortalityPercentage,
  calculateFeedConsumptionGramsPerBird,
  petiTraysToEggs,
  eggsToPetiTrays,
  calculateProductionPercentage,
  calculateBirdAge,
  calculateWaterPerBirdMl,
} from '../../calculations/index.js';
import { getCache, setCache } from '../../db/redis.js';

export const reportRoutes: FastifyPluginAsync = async (fastify) => {
  // Enforce authentication for reports
  fastify.addHook('preHandler', async (request, reply) => {
    await (fastify as any).authenticate(request, reply);
  });

  // GET /api/v1/flocks/:flockId/reports/summary
  fastify.get('/flocks/:flockId/reports/summary', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const cacheKey = `flock:${flockId}:report:summary:v2`;

    // 1. Check Redis first
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    if (isDatabaseConnected()) {
      try {
        const [flock] = await db.select().from(schema.flocks).where(eq(schema.flocks.id, flockId));
        if (!flock) {
          reply.status(404);
          return errorResponse('Flock not found', 'NOT_FOUND');
        }

        const birdRecords = await db
          .select()
          .from(schema.birdDailyRecords)
          .where(eq(schema.birdDailyRecords.flockId, flockId))
          .orderBy(asc(schema.birdDailyRecords.date));

        const feedRecords = await db
          .select()
          .from(schema.feedDailyRecords)
          .where(eq(schema.feedDailyRecords.flockId, flockId));

        const eggRecords = await db
          .select()
          .from(schema.eggDailyRecords)
          .where(eq(schema.eggDailyRecords.flockId, flockId));

        const dieselRecords = await db
          .select()
          .from(schema.dieselDailyRecords)
          .where(eq(schema.dieselDailyRecords.flockId, flockId));

        let cumulativeMortality = 0;
        let cumulativeEggProductionTrays = 0;
        const dailySummaryRows = birdRecords.map((b) => {
          cumulativeMortality += b.mortality;
          const remainingBirds = calculateRemainingBirds(flock.initialBirds, cumulativeMortality);
          const mortalityRate = calculateMortalityPercentage(cumulativeMortality, flock.initialBirds);
          const age = calculateBirdAge(b.date, flock.startDate);

          const feed = feedRecords.find((f) => f.date === b.date);
          const egg = eggRecords.find((e) => e.date === b.date);
          const diesel = dieselRecords.find((d) => d.date === b.date);

          const eggEggs = egg ? petiTraysToEggs(egg.productionPeti, egg.productionTrays) : 0;
          const eggPct = flock.eggTrackingEnabled ? calculateProductionPercentage(eggEggs, remainingBirds) : 0;

          if (egg) {
            cumulativeEggProductionTrays += (egg.productionPeti || 0) * 12 + (egg.productionTrays || 0);
          }
          const cumEggPeti = Math.floor(cumulativeEggProductionTrays / 12);
          const cumEggTrays = cumulativeEggProductionTrays % 12;
          const cumEggEggs = cumulativeEggProductionTrays * 30;

          return {
            date: b.date,
            age: age.formatted,
            mortality: b.mortality,
            cumulativeMortality,
            moat: b.moat ?? cumulativeMortality,
            remainingBirds,
            mortalityRate,
            moatPercentage: b.moatPercentage ? parseFloat(b.moatPercentage) : mortalityRate,
            feedUsedBags: feed ? feed.usedBags : 0,
            feedConsumptionGrams: feed ? calculateFeedConsumptionGramsPerBird(feed.usedBags, remainingBirds) : 0,
            eggProductionEggs: eggEggs,
            eggProductionPct: eggPct,
            cumulativeEggProductionPeti: cumEggPeti,
            cumulativeEggProductionTrays: cumEggTrays,
            cumulativeEggProductionFormatted: `${cumEggPeti.toLocaleString()}P, ${cumEggTrays}T`,
            cumulativeEggProductionEggs: cumEggEggs,
            cumulativeProductionPeti: cumEggPeti,
            cumulativeProductionTrays: cumEggTrays,
            cumulativeProductionFormatted: `${cumEggPeti.toLocaleString()}P, ${cumEggTrays}T`,
            cumulativeProductionEggs: cumEggEggs,
            totalEggsTillDate: cumEggEggs,
            dieselUsedLiters: diesel ? parseFloat(diesel.usedLiters) : 0,
            manureRemoved: Boolean(b.manureRemoved),
          };
        });

        const result = {
          flock: {
            id: flock.id,
            flockCode: flock.flockCode,
            name: flock.name,
            companyName: flock.companyName || 'S. S. FEED MILLS (PVT) LTD',
            startDate: flock.startDate,
            initialBirds: flock.initialBirds,
          },
          rows: [...dailySummaryRows].reverse(),
        };
        await setCache(cacheKey, result, 300);
        return successResponse(result);
      } catch (err) {
        // Fall back to mock store
      }
    }

    const flock = mockStore.flocks.find((f) => f.id === flockId);
    if (!flock) {
      reply.status(404);
      return errorResponse('Flock not found', 'NOT_FOUND');
    }

    const birdRecords = mockStore.birdRecords
      .filter((r) => r.flockId === flockId)
      .sort((a, b) => a.date.localeCompare(b.date));

    let cumulativeMortality = 0;
    let cumulativeEggProductionTrays = 0;
    const dailySummaryRows = birdRecords.map((b) => {
      cumulativeMortality += b.mortality;
      const remainingBirds = calculateRemainingBirds(flock.initialBirds, cumulativeMortality);
      const mortalityRate = calculateMortalityPercentage(cumulativeMortality, flock.initialBirds);
      const age = calculateBirdAge(b.date, flock.startDate);

      const feed = mockStore.feedRecords.find((f) => f.flockId === flockId && f.date === b.date);
      const egg = mockStore.eggRecords.find((e) => e.flockId === flockId && e.date === b.date);
      const diesel = mockStore.dieselRecords.find((d) => d.flockId === flockId && d.date === b.date);

      const eggEggs = egg ? petiTraysToEggs(egg.productionPeti, egg.productionTrays) : 0;
      const eggPct = flock.eggTrackingEnabled ? calculateProductionPercentage(eggEggs, remainingBirds) : 0;

      if (egg) {
        cumulativeEggProductionTrays += (egg.productionPeti || 0) * 12 + (egg.productionTrays || 0);
      }
      const cumEggPeti = Math.floor(cumulativeEggProductionTrays / 12);
      const cumEggTrays = cumulativeEggProductionTrays % 12;
      const cumEggEggs = cumulativeEggProductionTrays * 30;

      return {
        date: b.date,
        age: age.formatted,
        mortality: b.mortality,
        cumulativeMortality,
        remainingBirds,
        mortalityRate,
        feedUsedBags: feed ? feed.usedBags : 0,
        feedConsumptionGrams: feed ? calculateFeedConsumptionGramsPerBird(feed.usedBags, remainingBirds) : 0,
        eggProductionEggs: eggEggs,
        eggProductionPct: eggPct,
        cumulativeEggProductionPeti: cumEggPeti,
        cumulativeEggProductionTrays: cumEggTrays,
        cumulativeEggProductionFormatted: `${cumEggPeti.toLocaleString()}P, ${cumEggTrays}T`,
        cumulativeEggProductionEggs: cumEggEggs,
        cumulativeProductionPeti: cumEggPeti,
        cumulativeProductionTrays: cumEggTrays,
        cumulativeProductionFormatted: `${cumEggPeti.toLocaleString()}P, ${cumEggTrays}T`,
        cumulativeProductionEggs: cumEggEggs,
        totalEggsTillDate: cumEggEggs,
        dieselUsedLiters: diesel ? diesel.usedLiters : 0,
      };
    });

    const fallbackResult = {
      flock: {
        id: flock.id,
        flockCode: flock.flockCode,
        name: flock.name,
        companyName: flock.companyName || 'S. S. FEED MILLS (PVT) LTD',
        startDate: flock.startDate,
        initialBirds: flock.initialBirds,
      },
      rows: [...dailySummaryRows].reverse(),
    };
    await setCache(cacheKey, fallbackResult, 300);
    return successResponse(fallbackResult);
  });

  // GET /api/v1/flocks/:flockId/reports/mortality
  fastify.get('/flocks/:flockId/reports/mortality', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const cacheKey = `flock:${flockId}:report:mortality`;

    // 1. Check Redis first
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    if (isDatabaseConnected()) {
      try {
        const [flock] = await db.select().from(schema.flocks).where(eq(schema.flocks.id, flockId));
        if (!flock) {
          reply.status(404);
          return errorResponse('Flock not found', 'NOT_FOUND');
        }

        const records = await db
          .select()
          .from(schema.birdDailyRecords)
          .where(eq(schema.birdDailyRecords.flockId, flockId))
          .orderBy(asc(schema.birdDailyRecords.date));

        let runningMortality = 0;
        const rows = records.map((r) => {
          runningMortality += r.mortality;
          return {
            date: r.date,
            mortality: r.mortality,
            cumulativeMortality: runningMortality,
            moat: r.moat ?? runningMortality,
            remainingBirds: calculateRemainingBirds(flock.initialBirds, runningMortality),
            mortalityRate: calculateMortalityPercentage(runningMortality, flock.initialBirds),
            moatPercentage: r.moatPercentage ? parseFloat(r.moatPercentage) : calculateMortalityPercentage(runningMortality, flock.initialBirds),
            lightHours: r.lightHours ? parseFloat(r.lightHours) : null,
            maxTemp: r.maxTemperature ? parseFloat(r.maxTemperature) : null,
            minTemp: r.minTemperature ? parseFloat(r.minTemperature) : null,
            manureRemoved: Boolean(r.manureRemoved),
          };
        });

        const result = { flock, rows: [...rows].reverse() };
        await setCache(cacheKey, result, 300);
        return successResponse(result);
      } catch (err) {
        // Fall through
      }
    }

    const flock = mockStore.flocks.find((f) => f.id === flockId);
    if (!flock) {
      reply.status(404);
      return errorResponse('Flock not found', 'NOT_FOUND');
    }

    const records = mockStore.birdRecords
      .filter((r) => r.flockId === flockId)
      .sort((a, b) => a.date.localeCompare(b.date));

    let runningMortality = 0;
    const rows = records.map((r) => {
      runningMortality += r.mortality;
      return {
        date: r.date,
        mortality: r.mortality,
        cumulativeMortality: runningMortality,
        remainingBirds: calculateRemainingBirds(flock.initialBirds, runningMortality),
        mortalityRate: calculateMortalityPercentage(runningMortality, flock.initialBirds),
        lightHours: r.lightHours,
        maxTemp: r.maxTemperature,
        minTemp: r.minTemperature,
      };
    });

    const fallbackResult = { flock, rows: [...rows].reverse() };
    await setCache(cacheKey, fallbackResult, 300);
    return successResponse(fallbackResult);
  });

  // GET /api/v1/flocks/:flockId/reports/feed
  fastify.get('/flocks/:flockId/reports/feed', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const cacheKey = `flock:${flockId}:report:feed`;

    // 1. Check Redis first
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    if (isDatabaseConnected()) {
      try {
        const records = await db
          .select()
          .from(schema.feedDailyRecords)
          .where(eq(schema.feedDailyRecords.flockId, flockId))
          .orderBy(asc(schema.feedDailyRecords.date));

        let stockBags = 0;
        const rows = records.map((r) => {
          stockBags += r.arrivalBags - r.usedBags - (r.returnedBags || 0);
          return {
            date: r.date,
            arrivalBags: r.arrivalBags,
            usedBags: r.usedBags,
            returnedBags: r.returnedBags || 0,
            usedKg: r.usedBags * 50,
            returnedKg: (r.returnedBags || 0) * 50,
            stockBags,
            stockKg: stockBags * 50,
          };
        });

        const result = { rows: [...rows].reverse() };
        await setCache(cacheKey, result, 300);
        return successResponse(result);
      } catch (err) {
        // Fall through
      }
    }

    const records = mockStore.feedRecords
      .filter((r) => r.flockId === flockId)
      .sort((a, b) => a.date.localeCompare(b.date));

    let stockBags = 0;
    const rows = records.map((r) => {
      stockBags += r.arrivalBags - r.usedBags - (r.returnedBags || 0);
      return {
        date: r.date,
        arrivalBags: r.arrivalBags,
        usedBags: r.usedBags,
        returnedBags: r.returnedBags || 0,
        usedKg: r.usedBags * 50,
        returnedKg: (r.returnedBags || 0) * 50,
        stockBags,
        stockKg: stockBags * 50,
      };
    });

    const fallbackResult = { rows: [...rows].reverse() };
    await setCache(cacheKey, fallbackResult, 300);
    return successResponse(fallbackResult);
  });

  // GET /api/v1/flocks/:flockId/reports/chips
  fastify.get('/flocks/:flockId/reports/chips', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const cacheKey = `flock:${flockId}:report:chips:v2`;

    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    if (isDatabaseConnected()) {
      try {
        const records = await db
          .select()
          .from(schema.chipsDailyRecords)
          .where(eq(schema.chipsDailyRecords.flockId, flockId))
          .orderBy(asc(schema.chipsDailyRecords.date));

        let stockBags = 0;
        const rows = records.map((r) => {
          stockBags += r.arrivalBags - r.usedBags - (r.returnedBags || 0);
          return {
            date: r.date,
            arrivalBags: r.arrivalBags,
            usedBags: r.usedBags,
            returnedBags: r.returnedBags || 0,
            stockBags,
          };
        });

        const result = { rows: [...rows].reverse() };
        await setCache(cacheKey, result, 300);
        return successResponse(result);
      } catch (err) {
        // Fall through
      }
    }

    const records = mockStore.chipsRecords
      .filter((r) => r.flockId === flockId)
      .sort((a, b) => a.date.localeCompare(b.date));

    let stockBags = 0;
    const rows = records.map((r) => {
      stockBags += r.arrivalBags - r.usedBags - (r.returnedBags || 0);
      return {
        date: r.date,
        arrivalBags: r.arrivalBags,
        usedBags: r.usedBags,
        returnedBags: r.returnedBags || 0,
        stockBags,
      };
    });

    const fallbackResult = { rows: [...rows].reverse() };
    await setCache(cacheKey, fallbackResult, 300);
    return successResponse(fallbackResult);
  });

  // GET /api/v1/flocks/:flockId/reports/trays
  fastify.get('/flocks/:flockId/reports/trays', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const cacheKey = `flock:${flockId}:report:trays:v2`;

    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    if (isDatabaseConnected()) {
      try {
        const records = await db
          .select()
          .from(schema.trayDailyRecords)
          .where(eq(schema.trayDailyRecords.flockId, flockId))
          .orderBy(asc(schema.trayDailyRecords.date));

        let plasticStock = 0;
        let cardboardStock = 0;
        const rows = records.map((r) => {
          plasticStock += r.plasticReceived - r.plasticUsed;
          cardboardStock += r.cardboardReceived - r.cardboardUsed - r.cardboardWasted;
          return {
            date: r.date,
            plasticReceived: r.plasticReceived,
            plasticUsed: r.plasticUsed,
            plasticStock,
            cardboardReceived: r.cardboardReceived,
            cardboardUsed: r.cardboardUsed,
            cardboardWasted: r.cardboardWasted,
            cardboardStock,
          };
        });

        const result = { rows: [...rows].reverse() };
        await setCache(cacheKey, result, 300);
        return successResponse(result);
      } catch (err) {
        // Fall through
      }
    }

    const records = mockStore.trayRecords
      .filter((r) => r.flockId === flockId)
      .sort((a, b) => a.date.localeCompare(b.date));

    let plasticStock = 0;
    let cardboardStock = 0;
    const rows = records.map((r) => {
      plasticStock += r.plasticReceived - r.plasticUsed;
      cardboardStock += r.cardboardReceived - r.cardboardUsed - r.cardboardWasted;
      return {
        date: r.date,
        plasticReceived: r.plasticReceived,
        plasticUsed: r.plasticUsed,
        plasticStock,
        cardboardReceived: r.cardboardReceived,
        cardboardUsed: r.cardboardUsed,
        cardboardWasted: r.cardboardWasted,
        cardboardStock,
      };
    });

    const fallbackResult = { rows: [...rows].reverse() };
    await setCache(cacheKey, fallbackResult, 300);
    return successResponse(fallbackResult);
  });

  // GET /api/v1/flocks/:flockId/reports/eggs
  fastify.get('/flocks/:flockId/reports/eggs', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const cacheKey = `flock:${flockId}:report:eggs`;

    // 1. Check Redis first
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    if (isDatabaseConnected()) {
      try {
        const [flock] = await db.select().from(schema.flocks).where(eq(schema.flocks.id, flockId));
        if (!flock || !flock.eggTrackingEnabled) {
          return successResponse({ rows: [], enabled: false });
        }

        const records = await db
          .select()
          .from(schema.eggDailyRecords)
          .where(eq(schema.eggDailyRecords.flockId, flockId))
          .orderBy(asc(schema.eggDailyRecords.date));

        const usageRecords = await db
          .select()
          .from(schema.eggUsageRecords)
          .where(eq(schema.eggUsageRecords.flockId, flockId));

        let cumulativeEggs = 0;
        let cumulativeProductionTrays = 0;
        const rows = records.map((r) => {
          const openingStockEggs = Math.max(0, cumulativeEggs);
          const openingStockFormatted = eggsToPetiTrays(openingStockEggs).formatted;

          const prodEggs = petiTraysToEggs(r.productionPeti, r.productionTrays);
          const soldEggs = petiTraysToEggs(r.soldPeti, r.soldTrays);

          const dayProdTrays = (r.productionPeti || 0) * 12 + (r.productionTrays || 0);
          cumulativeProductionTrays += dayProdTrays;
          const cumProdPeti = Math.floor(cumulativeProductionTrays / 12);
          const cumProdTrays = cumulativeProductionTrays % 12;
          const cumProdEggs = cumulativeProductionTrays * 30;

          const dateUsages = usageRecords.filter((u) => u.date === r.date);
          const usageForDate = dateUsages.reduce((sum, u) => sum + petiTraysToEggs(u.peti, u.trays), 0);

          const giftUsage = dateUsages.find((u) => u.type === 'gift-use');
          const conveyorUsage = dateUsages.find((u) => u.type === 'conveyor-waste');
          const messUsage = dateUsages.find((u) => u.type === 'mess-use');
          const storeUsage = dateUsages.find((u) => u.type === 'store-waste');

          cumulativeEggs += prodEggs - soldEggs - usageForDate;
          const closingStockEggs = Math.max(0, cumulativeEggs);
          const stockDisplay = eggsToPetiTrays(closingStockEggs);

          return {
            date: r.date,
            openingStockEggs,
            openingStockFormatted,
            productionPeti: r.productionPeti,
            productionTrays: r.productionTrays,
            productionEggs: prodEggs,
            cumulativeProductionPeti: cumProdPeti,
            cumulativeProductionTrays: cumProdTrays,
            cumulativeProductionFormatted: `${cumProdPeti}P, ${cumProdTrays}T`,
            cumulativeProductionEggs: cumProdEggs,
            soldPeti: r.soldPeti,
            soldTrays: r.soldTrays,
            soldEggs,
            giftUse: giftUsage ? `${giftUsage.peti}P, ${giftUsage.trays}T` : '---',
            conveyorWaste: conveyorUsage ? `${conveyorUsage.peti}P, ${conveyorUsage.trays}T` : '---',
            messUse: messUsage ? `${messUsage.peti}P, ${messUsage.trays}T` : '---',
            storeWaste: storeUsage ? `${storeUsage.peti}P, ${storeUsage.trays}T` : '---',
            usageEggs: usageForDate,
            closingStockEggs,
            closingStockFormatted: stockDisplay.formatted,
          };
        });

        const result = { rows: [...rows].reverse(), enabled: true };
        await setCache(cacheKey, result, 300);
        return successResponse(result);
      } catch (err) {
        // Fall through
      }
    }

    const flock = mockStore.flocks.find((f) => f.id === flockId);
    if (!flock || !flock.eggTrackingEnabled) {
      return successResponse({ rows: [], enabled: false });
    }

    const records = mockStore.eggRecords
      .filter((r) => r.flockId === flockId)
      .sort((a, b) => a.date.localeCompare(b.date));

    let cumulativeEggs = 0;
    let cumulativeProductionTrays = 0;
    const rows = records.map((r) => {
      const openingStockEggs = Math.max(0, cumulativeEggs);
      const openingStockFormatted = eggsToPetiTrays(openingStockEggs).formatted;

      const prodEggs = petiTraysToEggs(r.productionPeti, r.productionTrays);
      const soldEggs = petiTraysToEggs(r.soldPeti, r.soldTrays);

      const dayProdTrays = (r.productionPeti || 0) * 12 + (r.productionTrays || 0);
      cumulativeProductionTrays += dayProdTrays;
      const cumProdPeti = Math.floor(cumulativeProductionTrays / 12);
      const cumProdTrays = cumulativeProductionTrays % 12;
      const cumProdEggs = cumulativeProductionTrays * 30;

      const dateUsages = mockStore.eggUsageRecords.filter((u) => u.flockId === flockId && u.date === r.date);
      const usageForDate = dateUsages.reduce((sum, u) => sum + petiTraysToEggs(u.peti, u.trays), 0);

      const giftUsage = dateUsages.find((u) => u.type === 'gift-use');
      const conveyorUsage = dateUsages.find((u) => u.type === 'conveyor-waste');
      const messUsage = dateUsages.find((u) => u.type === 'mess-use');
      const storeUsage = dateUsages.find((u) => u.type === 'store-waste');

      cumulativeEggs += prodEggs - soldEggs - usageForDate;
      const closingStockEggs = Math.max(0, cumulativeEggs);
      const stockDisplay = eggsToPetiTrays(closingStockEggs);

      return {
        date: r.date,
        openingStockEggs,
        openingStockFormatted,
        productionPeti: r.productionPeti,
        productionTrays: r.productionTrays,
        productionEggs: prodEggs,
        cumulativeProductionPeti: cumProdPeti,
        cumulativeProductionTrays: cumProdTrays,
        cumulativeProductionFormatted: `${cumProdPeti}P, ${cumProdTrays}T`,
        cumulativeProductionEggs: cumProdEggs,
        soldPeti: r.soldPeti,
        soldTrays: r.soldTrays,
        soldEggs,
        giftUse: giftUsage ? `${giftUsage.peti}P, ${giftUsage.trays}T` : '---',
        conveyorWaste: conveyorUsage ? `${conveyorUsage.peti}P, ${conveyorUsage.trays}T` : '---',
        messUse: messUsage ? `${messUsage.peti}P, ${messUsage.trays}T` : '---',
        storeWaste: storeUsage ? `${storeUsage.peti}P, ${storeUsage.trays}T` : '---',
        usageEggs: usageForDate,
        closingStockEggs,
        closingStockFormatted: stockDisplay.formatted,
      };
    });

    const fallbackResult = { rows: [...rows].reverse(), enabled: true };
    await setCache(cacheKey, fallbackResult, 300);
    return successResponse(fallbackResult);
  });

  // GET /api/v1/flocks/:flockId/reports/diesel
  fastify.get('/flocks/:flockId/reports/diesel', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const cacheKey = `flock:${flockId}:report:diesel`;

    // 1. Check Redis first
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    if (isDatabaseConnected()) {
      try {
        const [flock] = await db.select().from(schema.flocks).where(eq(schema.flocks.id, flockId));
        if (!flock) {
          reply.status(404);
          return errorResponse('Flock not found', 'NOT_FOUND');
        }

        const records = await db
          .select()
          .from(schema.dieselDailyRecords)
          .where(eq(schema.dieselDailyRecords.flockId, flockId))
          .orderBy(asc(schema.dieselDailyRecords.date));

        let stockLiters = 0;
        const rows = records.map((r) => {
          const arr = parseFloat(r.arrivalLiters);
          const used = parseFloat(r.usedLiters);
          stockLiters += arr - used;
          return {
            date: r.date,
            arrivalLiters: arr,
            usedLiters: used,
            stockLiters: Number(stockLiters.toFixed(2)),
          };
        });

        const result = { flock, rows: [...rows].reverse() };
        await setCache(cacheKey, result, 300);
        return successResponse(result);
      } catch (err) {
        // Fall through
      }
    }

    const flock = mockStore.flocks.find((f) => f.id === flockId);
    const records = mockStore.dieselRecords
      .filter((r) => r.flockId === flockId)
      .sort((a, b) => a.date.localeCompare(b.date));

    let stockLiters = 0;
    const rows = records.map((r) => {
      stockLiters += r.arrivalLiters - r.usedLiters;
      return {
        date: r.date,
        arrivalLiters: r.arrivalLiters,
        usedLiters: r.usedLiters,
        stockLiters: Number(stockLiters.toFixed(2)),
      };
    });

    const fallbackResult = { flock: flock || undefined, rows: [...rows].reverse() };
    await setCache(cacheKey, fallbackResult, 300);
    return successResponse(fallbackResult);
  });

  // GET /api/v1/flocks/:flockId/reports/weight
  fastify.get('/flocks/:flockId/reports/weight', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const cacheKey = `flock:${flockId}:report:weight:v2`;

    // 1. Check Redis first
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    if (isDatabaseConnected()) {
      try {
        const [flock] = await db.select().from(schema.flocks).where(eq(schema.flocks.id, flockId));
        if (!flock) {
          reply.status(404);
          return errorResponse('Flock not found', 'NOT_FOUND');
        }

        const records = await db
          .select()
          .from(schema.weightRecords)
          .where(eq(schema.weightRecords.flockId, flockId))
          .orderBy(asc(schema.weightRecords.date));

        const rows = records.map((r) => {
          const age = calculateBirdAge(r.date, flock.startDate);
          return {
            date: r.date,
            age: age.formatted,
            week: age.week,
            day: age.day,
            weight: parseFloat(r.weight),
            uniformity: parseFloat(r.uniformity),
          };
        });

        const result = { flock, rows: [...rows].reverse() };
        await setCache(cacheKey, result, 300);
        return successResponse(result);
      } catch (err) {
        // Fall through
      }
    }

    const flock = mockStore.flocks.find((f) => f.id === flockId);
    const records = mockStore.weightRecords
      .filter((r) => r.flockId === flockId)
      .sort((a, b) => a.date.localeCompare(b.date));

    const rows = records.map((r) => {
      const age = calculateBirdAge(r.date, flock?.startDate || '2026-08-01');
      return {
        date: r.date,
        age: age.formatted,
        week: age.week,
        day: age.day,
        weight: r.weight,
        uniformity: r.uniformity,
      };
    });

    const fallbackResult = { flock: flock || undefined, rows: [...rows].reverse() };
    await setCache(cacheKey, fallbackResult, 300);
    return successResponse(fallbackResult);
  });

  // GET /api/v1/flocks/:flockId/reports/health
  fastify.get('/flocks/:flockId/reports/health', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const cacheKey = `flock:${flockId}:report:health:v2`;

    // 1. Check Redis first
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return successResponse(cached);
    }

    if (isDatabaseConnected()) {
      try {
        const [flock] = await db.select().from(schema.flocks).where(eq(schema.flocks.id, flockId));
        if (!flock) {
          reply.status(404);
          return errorResponse('Flock not found', 'NOT_FOUND');
        }

        const birdRecords = await db
          .select()
          .from(schema.birdDailyRecords)
          .where(eq(schema.birdDailyRecords.flockId, flockId))
          .orderBy(asc(schema.birdDailyRecords.date));

        const medRecords = await db
          .select()
          .from(schema.medicineDailyRecords)
          .where(eq(schema.medicineDailyRecords.flockId, flockId))
          .orderBy(asc(schema.medicineDailyRecords.date));

        const allVaccinations = await db
          .select()
          .from(schema.vaccinationRecords)
          .where(eq(schema.vaccinationRecords.flockId, flockId));

        const allEntries = await db.select().from(schema.medicineEntries);
        const allMedicines = await db.select().from(schema.medicines);

        // Map dates
        const dateSet = new Set<string>();
        medRecords.forEach((m) => dateSet.add(m.date));
        allVaccinations.forEach((v) => dateSet.add(v.date));
        const dates = Array.from(dateSet).sort();

        let runningMortality = 0;
        const mortalityByDate = new Map<string, number>();
        birdRecords.forEach((b) => {
          runningMortality += b.mortality;
          mortalityByDate.set(b.date, runningMortality);
        });

        const rows = dates.map((d) => {
          const med = medRecords.find((m) => m.date === d);
          const vac = allVaccinations.find((v) => v.date === d);
          const currentMort = mortalityByDate.get(d) ?? 0;
          const remaining = Math.max(0, flock.initialBirds - currentMort);

          const entries = med ? allEntries.filter((e) => e.dailyRecordId === med.id) : [];
          const medDetails = entries.map((e) => {
            const master = allMedicines.find((m) => m.id === e.medicineId);
            const unit = e.dosageUnit || 'ml';
            const dosageStr = e.dosagePerLiter != null && parseFloat(e.dosagePerLiter) > 0 ? `${e.dosagePerLiter} ${unit}` : '';
            const ratioStr = e.ratio ? `Ratio: ${e.ratio}` : '';
            const details = [dosageStr, ratioStr].filter(Boolean).join(', ');
            return `${master?.name || 'Medicine'}${details ? ` (${details})` : ''}`;
          });

          const waterLiters = med ? parseFloat(med.waterLiters) : 0;
          const waterPerBirdMl = calculateWaterPerBirdMl(waterLiters, remaining);

          return {
            date: d,
            type: med?.type || 'water',
            waterLiters,
            waterPerBirdMl,
            medicines: medDetails.join(', ') || 'None',
            vaccineName: vac?.vaccineName || '---',
            vaccineNotes: vac?.notes || '---',
          };
        });

        const result = { flock, rows: [...rows].reverse() };
        await setCache(cacheKey, result, 300);
        return successResponse(result);
      } catch (err) {
        // Fall through
      }
    }

    const flock = mockStore.flocks.find((f) => f.id === flockId);
    const birdRecords = mockStore.birdRecords
      .filter((r) => r.flockId === flockId)
      .sort((a, b) => a.date.localeCompare(b.date));
    const medRecords = mockStore.medicineDailyRecords
      .filter((r) => r.flockId === flockId)
      .sort((a, b) => a.date.localeCompare(b.date));
    const allVaccinations = mockStore.vaccinationRecords.filter((r) => r.flockId === flockId);

    const dateSet = new Set<string>();
    medRecords.forEach((m) => dateSet.add(m.date));
    allVaccinations.forEach((v) => dateSet.add(v.date));
    const dates = Array.from(dateSet).sort();

    let runningMortality = 0;
    const mortalityByDate = new Map<string, number>();
    birdRecords.forEach((b) => {
      runningMortality += b.mortality;
      mortalityByDate.set(b.date, runningMortality);
    });

    const rows = dates.map((d) => {
      const med = medRecords.find((m) => m.date === d);
      const vac = allVaccinations.find((v) => v.date === d);
      const currentMort = mortalityByDate.get(d) ?? 0;
      const initialBirds = flock?.initialBirds || 10000;
      const remaining = Math.max(0, initialBirds - currentMort);

      const medDetails = (med?.medicines || []).map((m) => {
        const unit = m.dosageUnit || 'ml';
        const dosageStr = m.dosagePerLiter != null && m.dosagePerLiter > 0 ? `${m.dosagePerLiter} ${unit}` : '';
        const ratioStr = m.ratio ? `Ratio: ${m.ratio}` : '';
        const details = [dosageStr, ratioStr].filter(Boolean).join(', ');
        return `${m.name} (${details || 'Standard'})`;
      });
      const waterLiters = med?.waterLiters || 0;
      const waterPerBirdMl = calculateWaterPerBirdMl(waterLiters, remaining);

      return {
        date: d,
        type: med?.type || 'water',
        waterLiters,
        waterPerBirdMl,
        medicines: medDetails.join(', ') || 'None',
        vaccineName: vac?.vaccineName || '---',
        vaccineNotes: vac?.notes || '---',
      };
    });

    const fallbackResult = { flock: flock || undefined, rows: [...rows].reverse() };
    await setCache(cacheKey, fallbackResult, 300);
    return successResponse(fallbackResult);
  });
};
