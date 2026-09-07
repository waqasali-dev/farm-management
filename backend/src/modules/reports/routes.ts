import { FastifyPluginAsync } from 'fastify';
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
} from '../../calculations/index.js';

export const reportRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/flocks/:flockId/reports/summary
  fastify.get('/flocks/:flockId/reports/summary', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const flock = mockStore.flocks.find((f) => f.id === flockId);
    if (!flock) {
      reply.status(404);
      return errorResponse('Flock not found', 'NOT_FOUND');
    }

    const birdRecords = mockStore.birdRecords
      .filter((r) => r.flockId === flockId)
      .sort((a, b) => a.date.localeCompare(b.date));

    let cumulativeMortality = 0;
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
        dieselUsedLiters: diesel ? diesel.usedLiters : 0,
      };
    });

    return successResponse({
      flock: {
        id: flock.id,
        flockCode: flock.flockCode,
        name: flock.name,
        startDate: flock.startDate,
        initialBirds: flock.initialBirds,
      },
      rows: dailySummaryRows,
    });
  });

  // GET /api/v1/flocks/:flockId/reports/mortality
  fastify.get('/flocks/:flockId/reports/mortality', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
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

    return successResponse({ flock, rows });
  });

  // GET /api/v1/flocks/:flockId/reports/feed
  fastify.get('/flocks/:flockId/reports/feed', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const records = mockStore.feedRecords
      .filter((r) => r.flockId === flockId)
      .sort((a, b) => a.date.localeCompare(b.date));

    let stockBags = 0;
    const rows = records.map((r) => {
      stockBags += r.arrivalBags - r.usedBags;
      return {
        date: r.date,
        arrivalBags: r.arrivalBags,
        usedBags: r.usedBags,
        usedKg: r.usedBags * 50,
        stockBags,
        stockKg: stockBags * 50,
      };
    });

    return successResponse({ rows });
  });

  // GET /api/v1/flocks/:flockId/reports/eggs
  fastify.get('/flocks/:flockId/reports/eggs', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const flock = mockStore.flocks.find((f) => f.id === flockId);
    if (!flock || !flock.eggTrackingEnabled) {
      return successResponse({ rows: [], enabled: false });
    }

    const records = mockStore.eggRecords
      .filter((r) => r.flockId === flockId)
      .sort((a, b) => a.date.localeCompare(b.date));

    let cumulativeEggs = 0;
    const rows = records.map((r) => {
      const prodEggs = petiTraysToEggs(r.productionPeti, r.productionTrays);
      const soldEggs = petiTraysToEggs(r.soldPeti, r.soldTrays);
      const usageForDate = mockStore.eggUsageRecords
        .filter((u) => u.flockId === flockId && u.date === r.date)
        .reduce((sum, u) => sum + petiTraysToEggs(u.peti, u.trays), 0);

      cumulativeEggs += prodEggs - soldEggs - usageForDate;
      const stockDisplay = eggsToPetiTrays(Math.max(0, cumulativeEggs));

      return {
        date: r.date,
        productionPeti: r.productionPeti,
        productionTrays: r.productionTrays,
        productionEggs: prodEggs,
        soldPeti: r.soldPeti,
        soldTrays: r.soldTrays,
        soldEggs,
        usageEggs: usageForDate,
        closingStockEggs: Math.max(0, cumulativeEggs),
        closingStockFormatted: stockDisplay.formatted,
      };
    });

    return successResponse({ rows, enabled: true });
  });
};
