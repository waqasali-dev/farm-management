import { FastifyPluginAsync } from 'fastify';
import { checkDatabaseConnection, isDatabaseConnected } from '../../db/client.js';
import { checkRedisConnection, isRedisConnected } from '../../db/redis.js';
import { successResponse } from '../../utils/response.js';

export const systemRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    const dbStatus = await checkDatabaseConnection();
    const redisStatus = await checkRedisConnection();

    return successResponse({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      connections: {
        database: {
          client: 'Drizzle ORM + PostgreSQL',
          connected: dbStatus.connected,
          error: dbStatus.error || null,
        },
        redis: {
          client: 'ioredis',
          connected: redisStatus.connected,
          error: redisStatus.error || null,
        },
      },
      fallbackStorageActive: !dbStatus.connected,
    });
  });
};
