import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db, isDatabaseConnected, schema } from '../../db/client.js';
import { mockStore } from '../../db/mock-store.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { flushFlockCache } from '../../db/redis.js';

const createFlockSchema = z.object({
  name: z.string().min(1, 'Flock name is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  initialBirds: z.number().int().positive('Initial birds must be greater than zero'),
  eggTrackingEnabled: z.boolean().default(false),
  isRunningFlock: z.boolean().optional().default(false),
  openingBalances: z.object({
    cumulativeMortality: z.number().int().min(0).default(0),
    remainingFeedBags: z.number().int().min(0).default(0),
    remainingEggPeti: z.number().int().min(0).default(0),
    remainingEggTrays: z.number().int().min(0).default(0),
    remainingDieselLiters: z.number().min(0).default(0),
    asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).optional(),
});

const updateFlockSchema = z.object({
  name: z.string().min(1).optional(),
  eggTrackingEnabled: z.boolean().optional(),
});

export const flockRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/flocks
  fastify.get('/flocks', async (request) => {
    const query = request.query as { status?: string };

    if (isDatabaseConnected()) {
      try {
        let flocksList = await db
          .select()
          .from(schema.flocks)
          .orderBy(desc(schema.flocks.createdAt));

        if (query.status) {
          flocksList = flocksList.filter((f) => f.status === query.status);
        }
        return successResponse(flocksList);
      } catch (err) {
        // Fall through to mockStore
      }
    }

    let flocks = mockStore.flocks;
    if (query.status) {
      flocks = flocks.filter((f) => f.status === query.status);
    }
    return successResponse(flocks);
  });

  // GET /api/v1/flocks/:flockId
  fastify.get('/flocks/:flockId', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };

    if (isDatabaseConnected()) {
      try {
        const [flock] = await db
          .select()
          .from(schema.flocks)
          .where(eq(schema.flocks.id, flockId));

        if (!flock) {
          reply.status(404);
          return errorResponse('Flock not found', 'NOT_FOUND');
        }
        return successResponse(flock);
      } catch (err) {
        // Fall through to mockStore
      }
    }

    const flock = mockStore.flocks.find((f) => f.id === flockId);
    if (!flock) {
      reply.status(404);
      return errorResponse('Flock not found', 'NOT_FOUND');
    }
    return successResponse(flock);
  });

  // POST /api/v1/flocks
  fastify.post('/flocks', async (request, reply) => {
    const parsed = createFlockSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', parsed.error.format());
    }

    const { name, startDate, initialBirds, eggTrackingEnabled, isRunningFlock, openingBalances } = parsed.data;

    if (isRunningFlock && openingBalances && openingBalances.cumulativeMortality >= initialBirds) {
      reply.status(400);
      return errorResponse('Cumulative mortality cannot exceed or equal initial birds placed.', 'VALIDATION_ERROR');
    }

    if (isDatabaseConnected()) {
      try {
        // Fetch or create default farm
        let [farm] = await db.select().from(schema.farms).limit(1);
        if (!farm) {
          [farm] = await db
            .insert(schema.farms)
            .values({ name: 'Central Poultry Estate' })
            .returning();
        }

        // Generate flock code FL-001, FL-002...
        const existingFlocks = await db.select().from(schema.flocks);
        const flockCode = `FL-${String(existingFlocks.length + 1).padStart(3, '0')}`;

        const createdFlock = await db.transaction(async (tx) => {
          const [newFlock] = await tx
            .insert(schema.flocks)
            .values({
              farmId: farm.id,
              flockCode,
              name,
              startDate,
              initialBirds,
              eggTrackingEnabled,
              status: 'active',
            })
            .returning();

          if (isRunningFlock && openingBalances) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            let baselineDate = openingBalances.asOfDate || yesterday;
            if (baselineDate < startDate) {
              baselineDate = startDate;
            }

            // 1. Mortality to date
            if (openingBalances.cumulativeMortality > 0) {
              await tx.insert(schema.birdDailyRecords).values({
                farmId: farm.id,
                flockId: newFlock.id,
                date: baselineDate,
                mortality: openingBalances.cumulativeMortality,
              });
            }

            // 2. Remaining feed bags
            if (openingBalances.remainingFeedBags > 0) {
              await tx.insert(schema.feedDailyRecords).values({
                farmId: farm.id,
                flockId: newFlock.id,
                date: baselineDate,
                arrivalBags: openingBalances.remainingFeedBags,
                usedBags: 0,
              });
            }

            // 3. Remaining eggs in stock
            if (eggTrackingEnabled && (openingBalances.remainingEggPeti > 0 || openingBalances.remainingEggTrays > 0)) {
              await tx.insert(schema.eggDailyRecords).values({
                farmId: farm.id,
                flockId: newFlock.id,
                date: baselineDate,
                productionPeti: openingBalances.remainingEggPeti,
                productionTrays: openingBalances.remainingEggTrays,
                soldPeti: 0,
                soldTrays: 0,
              });
            }

            // 4. Remaining diesel
            if (openingBalances.remainingDieselLiters > 0) {
              await tx.insert(schema.dieselDailyRecords).values({
                farmId: farm.id,
                flockId: newFlock.id,
                date: baselineDate,
                arrivalLiters: String(openingBalances.remainingDieselLiters),
                usedLiters: '0',
              });
            }
          }

          return newFlock;
        });

        await flushFlockCache(createdFlock.id);
        reply.status(201);
        return successResponse(createdFlock);
      } catch (err: any) {
        reply.status(500);
        return errorResponse(err.message || 'Database insert failed');
      }
    }

    // Fallback mode
    const count = mockStore.flocks.length + 1;
    const flockCode = `FL-${String(count).padStart(3, '0')}`;
    const newFlock = {
      id: crypto.randomUUID(),
      farmId: mockStore.farms[0]?.id || 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      flockCode,
      name,
      startDate,
      initialBirds,
      eggTrackingEnabled,
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      closedAt: null,
    };

    mockStore.flocks.unshift(newFlock);

    if (isRunningFlock && openingBalances) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let baselineDate = openingBalances.asOfDate || yesterday;
      if (baselineDate < startDate) baselineDate = startDate;

      if (openingBalances.cumulativeMortality > 0) {
        mockStore.birdRecords.push({
          id: crypto.randomUUID(),
          farmId: newFlock.farmId,
          flockId: newFlock.id,
          date: baselineDate,
          mortality: openingBalances.cumulativeMortality,
          lightHours: null,
          maxTemperature: null,
          minTemperature: null,
        });
      }
      if (openingBalances.remainingFeedBags > 0) {
        mockStore.feedRecords.push({
          id: crypto.randomUUID(),
          farmId: newFlock.farmId,
          flockId: newFlock.id,
          date: baselineDate,
          arrivalBags: openingBalances.remainingFeedBags,
          usedBags: 0,
        });
      }
      if (eggTrackingEnabled && (openingBalances.remainingEggPeti > 0 || openingBalances.remainingEggTrays > 0)) {
        mockStore.eggRecords.push({
          id: crypto.randomUUID(),
          farmId: newFlock.farmId,
          flockId: newFlock.id,
          date: baselineDate,
          productionPeti: openingBalances.remainingEggPeti,
          productionTrays: openingBalances.remainingEggTrays,
          soldPeti: 0,
          soldTrays: 0,
        });
      }
      if (openingBalances.remainingDieselLiters > 0) {
        mockStore.dieselRecords.push({
          id: crypto.randomUUID(),
          farmId: newFlock.farmId,
          flockId: newFlock.id,
          date: baselineDate,
          arrivalLiters: openingBalances.remainingDieselLiters,
          usedLiters: 0,
        });
      }
    }

    reply.status(201);
    return successResponse(newFlock);
  });

  // PATCH /api/v1/flocks/:flockId
  fastify.patch('/flocks/:flockId', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };

    const parsed = updateFlockSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR');
    }

    if (isDatabaseConnected()) {
      try {
        const [flock] = await db
          .select()
          .from(schema.flocks)
          .where(eq(schema.flocks.id, flockId));

        if (!flock) {
          reply.status(404);
          return errorResponse('Flock not found', 'NOT_FOUND');
        }

        if (flock.status === 'closed') {
          reply.status(400);
          return errorResponse('Cannot modify a closed flock. Closed flocks are read-only.', 'FLOCK_CLOSED');
        }

        const [updated] = await db
          .update(schema.flocks)
          .set({
            ...parsed.data,
            updatedAt: new Date(),
          })
          .where(eq(schema.flocks.id, flockId))
          .returning();

        await flushFlockCache(flockId);
        return successResponse(updated);
      } catch (err: any) {
        reply.status(500);
        return errorResponse(err.message || 'Database update failed');
      }
    }

    const flockIndex = mockStore.flocks.findIndex((f) => f.id === flockId);
    if (flockIndex === -1) {
      reply.status(404);
      return errorResponse('Flock not found', 'NOT_FOUND');
    }

    const currentFlock = mockStore.flocks[flockIndex];
    if (currentFlock.status === 'closed') {
      reply.status(400);
      return errorResponse('Cannot modify a closed flock. Closed flocks are read-only.', 'FLOCK_CLOSED');
    }

    const updated = {
      ...currentFlock,
      ...parsed.data,
      updatedAt: new Date(),
    };

    mockStore.flocks[flockIndex] = updated;
    await flushFlockCache(flockId);
    return successResponse(updated);
  });

  // POST /api/v1/flocks/:flockId/close
  fastify.post('/flocks/:flockId/close', async (request, reply) => {
    const { flockId } = request.params as { flockId: string };

    if (isDatabaseConnected()) {
      try {
        const [flock] = await db
          .select()
          .from(schema.flocks)
          .where(eq(schema.flocks.id, flockId));

        if (!flock) {
          reply.status(404);
          return errorResponse('Flock not found', 'NOT_FOUND');
        }

        if (flock.status === 'closed') {
          return successResponse(flock);
        }

        const [closed] = await db
          .update(schema.flocks)
          .set({
            status: 'closed',
            closedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.flocks.id, flockId))
          .returning();

        await flushFlockCache(flockId);
        return successResponse(closed);
      } catch (err: any) {
        reply.status(500);
        return errorResponse(err.message || 'Database close failed');
      }
    }

    const flockIndex = mockStore.flocks.findIndex((f) => f.id === flockId);
    if (flockIndex === -1) {
      reply.status(404);
      return errorResponse('Flock not found', 'NOT_FOUND');
    }

    const currentFlock = mockStore.flocks[flockIndex];
    if (currentFlock.status === 'closed') {
      return successResponse(currentFlock);
    }

    const closed = {
      ...currentFlock,
      status: 'closed' as const,
      closedAt: new Date(),
      updatedAt: new Date(),
    };

    mockStore.flocks[flockIndex] = closed;
    await flushFlockCache(flockId);
    return successResponse(closed);
  });
};
