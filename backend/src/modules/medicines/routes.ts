import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, isDatabaseConnected, schema } from '../../db/client.js';
import { mockStore } from '../../db/mock-store.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { getCache, setCache } from '../../db/redis.js';

const createMedicineSchema = z.object({
  name: z.string().min(1, 'Medicine name is required'),
});

const MEDICINES_CACHE_KEY = 'medicines:list';

import { ensureStandardMedicinesSeeded } from '../../db/seed-medicines.js';

export const medicineRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/medicines', async () => {
    // 1. Check Redis first
    const cached = await getCache<any[]>(MEDICINES_CACHE_KEY);
    if (cached && cached.length > 0) {
      return successResponse(cached);
    }

    if (isDatabaseConnected()) {
      try {
        let list = await db.select().from(schema.medicines);
        if (list.length === 0) {
          list = await ensureStandardMedicinesSeeded();
        }
        await setCache(MEDICINES_CACHE_KEY, list, 300);
        return successResponse(list);
      } catch (err) {
        // Fall back to mock store
      }
    }

    const fallbackList = mockStore.medicines;
    await setCache(MEDICINES_CACHE_KEY, fallbackList, 300);
    return successResponse(fallbackList);
  });

  fastify.post('/medicines', async (request, reply) => {
    const parsed = createMedicineSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400);
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR');
    }

    if (isDatabaseConnected()) {
      try {
        let [farm] = await db.select().from(schema.farms).limit(1);
        if (!farm) {
          [farm] = await db.insert(schema.farms).values({ name: 'Central Poultry Estate' }).returning();
        }

        const [newMed] = await db
          .insert(schema.medicines)
          .values({
            farmId: farm.id,
            name: parsed.data.name,
            active: true,
          })
          .returning();

        // Refresh Redis medicines cache immediately with updated list
        try {
          const updatedList = await db.select().from(schema.medicines);
          await setCache(MEDICINES_CACHE_KEY, updatedList, 300);
        } catch {
          // Ignore cache refresh error
        }

        reply.status(201);
        return successResponse(newMed);
      } catch (err: any) {
        reply.status(500);
        return errorResponse(err.message || 'Failed to insert medicine into PostgreSQL');
      }
    }

    const newMed = {
      id: crypto.randomUUID(),
      farmId: mockStore.farms[0]?.id || 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      name: parsed.data.name,
      active: true,
    };

    mockStore.medicines.push(newMed);

    // Refresh Redis medicines cache with updated mockStore list
    await setCache(MEDICINES_CACHE_KEY, mockStore.medicines, 300);

    reply.status(201);
    return successResponse(newMed);
  });
};
