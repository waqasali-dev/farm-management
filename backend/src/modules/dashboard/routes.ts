import { FastifyPluginAsync } from 'fastify';
import { eq, and, lte, asc } from 'drizzle-orm';
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

export const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/flocks/:flockId/dashboard', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };
    const { date: targetDateStr } = request.query as { date?: string };
    const todayDate = targetDateStr || new Date().toISOString().split('T')[0];

    // Try Redis cache
    const cacheKey = `flock:${flockId}:dashboard:${todayDate}`;
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

        // 1. Bird history up to todayDate
        const birdHistory = await db
          .select()
          .from(schema.birdDailyRecords)
          .where(and(eq(schema.birdDailyRecords.flockId, flockId), lte(schema.birdDailyRecords.date, todayDate)))
          .orderBy(asc(schema.birdDailyRecords.date));

        const cumulativeMortality = birdHistory.reduce((sum, r) => sum + r.mortality, 0);
        const todayBirdRecord = birdHistory.find((r) => r.date === todayDate);
        const todayMortality = todayBirdRecord ? todayBirdRecord.mortality : 0;
        const remainingBirds = calculateRemainingBirds(flock.initialBirds, cumulativeMortality);
        const mortalityRate = calculateMortalityPercentage(cumulativeMortality, flock.initialBirds);

        // 2. Feed history up to todayDate
        const feedHistory = await db
          .select()
          .from(schema.feedDailyRecords)
          .where(and(eq(schema.feedDailyRecords.flockId, flockId), lte(schema.feedDailyRecords.date, todayDate)))
          .orderBy(asc(schema.feedDailyRecords.date));

        const totalArrivalBags = feedHistory.reduce((sum, r) => sum + r.arrivalBags, 0);
        const totalUsedBags = feedHistory.reduce((sum, r) => sum + r.usedBags, 0);
        const totalReturnedBags = feedHistory.reduce((sum, r) => sum + (r.returnedBags || 0), 0);
        const remainingBags = Math.max(0, totalArrivalBags - totalUsedBags - totalReturnedBags);
        const todayFeedRecord = feedHistory.find((r) => r.date === todayDate);
        const todayUsedBags = todayFeedRecord ? todayFeedRecord.usedBags : 0;
        const feedPerBirdGrams = calculateFeedConsumptionGramsPerBird(todayUsedBags, remainingBirds);

        // 3. Egg history up to todayDate
        let eggMetrics: any = null;
        if (flock.eggTrackingEnabled) {
          const eggHistory = await db
            .select()
            .from(schema.eggDailyRecords)
            .where(and(eq(schema.eggDailyRecords.flockId, flockId), lte(schema.eggDailyRecords.date, todayDate)))
            .orderBy(asc(schema.eggDailyRecords.date));

          const eggUsageHistory = await db
            .select()
            .from(schema.eggUsageRecords)
            .where(and(eq(schema.eggUsageRecords.flockId, flockId), lte(schema.eggUsageRecords.date, todayDate)));

          let totalProductionEggs = 0;
          let totalSoldEggs = 0;
          let totalUsageEggs = 0;

          for (const r of eggHistory) {
            totalProductionEggs += petiTraysToEggs(r.productionPeti, r.productionTrays);
            totalSoldEggs += petiTraysToEggs(r.soldPeti, r.soldTrays);
          }

          for (const u of eggUsageHistory) {
            totalUsageEggs += petiTraysToEggs(u.peti, u.trays);
          }

          const currentStockEggs = Math.max(0, totalProductionEggs - totalSoldEggs - totalUsageEggs);
          const stockBreakdown = eggsToPetiTrays(currentStockEggs);

          const todayEggRecord = eggHistory.find((r) => r.date === todayDate);
          const todayProdPeti = todayEggRecord ? todayEggRecord.productionPeti : 0;
          const todayProdTrays = todayEggRecord ? todayEggRecord.productionTrays : 0;
          const todayProductionEggs = petiTraysToEggs(todayProdPeti, todayProdTrays);
          const productionPercentage = calculateProductionPercentage(todayProductionEggs, remainingBirds);

          const todayUsageRecords = eggUsageHistory.filter((u) => u.date === todayDate);
          const todayUsageEggs = todayUsageRecords.reduce((sum, u) => sum + petiTraysToEggs(u.peti, u.trays), 0);

          eggMetrics = {
            enabled: true,
            currentStockEggs,
            stockPeti: stockBreakdown.peti,
            stockTrays: stockBreakdown.trays,
            stockLooseEggs: stockBreakdown.looseEggs,
            stockFormatted: stockBreakdown.formatted,
            todayProductionPeti: todayProdPeti,
            todayProductionTrays: todayProdTrays,
            todayProductionEggs,
            productionPercentage,
            todaySoldPeti: todayEggRecord ? todayEggRecord.soldPeti : 0,
            todaySoldTrays: todayEggRecord ? todayEggRecord.soldTrays : 0,
            todayUsageEggs,
            totalProductionEggs,
          };
        } else {
          eggMetrics = { enabled: false };
        }

        // 4. Diesel history up to todayDate
        const dieselHistory = await db
          .select()
          .from(schema.dieselDailyRecords)
          .where(and(eq(schema.dieselDailyRecords.flockId, flockId), lte(schema.dieselDailyRecords.date, todayDate)))
          .orderBy(asc(schema.dieselDailyRecords.date));

        const totalArrivalDiesel = dieselHistory.reduce((sum, r) => sum + parseFloat(r.arrivalLiters), 0);
        const totalUsedDiesel = dieselHistory.reduce((sum, r) => sum + parseFloat(r.usedLiters), 0);
        const remainingDiesel = Math.max(0, totalArrivalDiesel - totalUsedDiesel);
        const todayDieselRecord = dieselHistory.find((r) => r.date === todayDate);

        // 5. Bird Age
        const birdAge = calculateBirdAge(todayDate, flock.startDate);

        // 6. Water
        const [todayMedRecord] = await db
          .select()
          .from(schema.medicineDailyRecords)
          .where(and(eq(schema.medicineDailyRecords.flockId, flockId), eq(schema.medicineDailyRecords.date, todayDate)));

        const waterLiters = todayMedRecord ? parseFloat(todayMedRecord.waterLiters) : 0;
        const waterPerBirdMl = calculateWaterPerBirdMl(waterLiters, remainingBirds);

        // 7. Latest Weight
        const weightHistory = await db
          .select()
          .from(schema.weightRecords)
          .where(and(eq(schema.weightRecords.flockId, flockId), lte(schema.weightRecords.date, todayDate)))
          .orderBy(asc(schema.weightRecords.date));

        const latestWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;

        // 8. Alerts
        const alerts: string[] = [];
        if (todayMortality > 50) {
          alerts.push(`High mortality detected today: ${todayMortality} birds`);
        }
        if (remainingBags < 50) {
          alerts.push(`Low feed inventory warning: only ${remainingBags} bags remaining`);
        }
        if (remainingDiesel < 150) {
          alerts.push(`Low diesel inventory warning: ${remainingDiesel.toFixed(0)} liters left`);
        }

        // 9. Trend data for charts (last 7 recorded dates)
        const recentDates = birdHistory.slice(-7).map((r) => r.date);
        let eggHistoryAll: any[] = [];
        if (flock.eggTrackingEnabled) {
          eggHistoryAll = await db
            .select()
            .from(schema.eggDailyRecords)
            .where(eq(schema.eggDailyRecords.flockId, flockId));
        }

        const trendData = recentDates.map((d) => {
          const b = birdHistory.find((x) => x.date === d);
          const f = feedHistory.find((x) => x.date === d);
          const e = eggHistoryAll.find((x) => x.date === d);
          const prodEggs = e ? petiTraysToEggs(e.productionPeti, e.productionTrays) : 0;

          return {
            date: d,
            mortality: b ? b.mortality : 0,
            feedBags: f ? f.usedBags : 0,
            eggProductionEggs: prodEggs,
          };
        });

        const responseData = {
          flock: {
            id: flock.id,
            flockCode: flock.flockCode,
            name: flock.name,
            startDate: flock.startDate,
            initialBirds: flock.initialBirds,
            status: flock.status,
            eggTrackingEnabled: flock.eggTrackingEnabled,
          },
          selectedDate: todayDate,
          birdAge,
          birds: {
            initial: flock.initialBirds,
            todayMortality,
            cumulativeMortality,
            moat: cumulativeMortality,
            remaining: remainingBirds,
            mortalityRate,
            moatPercentage: mortalityRate,
          },
          feed: {
            totalReceivedBags: totalArrivalBags,
            totalUsedBags,
            totalReturnedBags,
            remainingBags,
            todayUsedBags,
            consumptionGramsPerBird: feedPerBirdGrams,
          },
          eggs: eggMetrics,
          diesel: {
            totalReceivedLiters: totalArrivalDiesel,
            totalUsedLiters: totalUsedDiesel,
            remainingLiters: remainingDiesel,
            todayArrivalLiters: todayDieselRecord ? parseFloat(todayDieselRecord.arrivalLiters) : 0,
            todayUsedLiters: todayDieselRecord ? parseFloat(todayDieselRecord.usedLiters) : 0,
          },
          water: {
            liters: waterLiters,
            mlPerBird: waterPerBirdMl,
          },
          weight: latestWeight
            ? {
                weight: parseFloat(latestWeight.weight),
                uniformity: parseFloat(latestWeight.uniformity),
                date: latestWeight.date,
              }
            : null,
          alerts,
          trendData,
        };

        await setCache(cacheKey, responseData, 60);
        return successResponse(responseData);
      } catch (err) {
        // Fall back to mock store
      }
    }

    // Fallback store logic
    const flock = mockStore.flocks.find((f) => f.id === flockId);
    if (!flock) {
      reply.status(404);
      return errorResponse('Flock not found', 'NOT_FOUND');
    }

    return successResponse({
      flock,
      selectedDate: todayDate,
      birdAge: calculateBirdAge(todayDate, flock.startDate),
      birds: { initial: flock.initialBirds, todayMortality: 0, cumulativeMortality: 0, remaining: flock.initialBirds, mortalityRate: 0 },
      feed: { totalReceivedBags: 0, totalUsedBags: 0, remainingBags: 0, todayUsedBags: 0, consumptionGramsPerBird: 0 },
      eggs: { enabled: flock.eggTrackingEnabled },
      diesel: { totalReceivedLiters: 0, totalUsedLiters: 0, remainingLiters: 0, todayArrivalLiters: 0, todayUsedLiters: 0 },
      water: { liters: 0, mlPerBird: 0 },
      weight: null,
      alerts: [],
      trendData: [],
    });
  });
};
