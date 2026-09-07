import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { errorResponse } from './utils/response.js';
import { systemRoutes } from './modules/system/routes.js';
import { flockRoutes } from './modules/flocks/routes.js';
import { dashboardRoutes } from './modules/dashboard/routes.js';
import { dailyRecordRoutes } from './modules/daily-records/routes.js';
import { reportRoutes } from './modules/reports/routes.js';
import { medicineRoutes } from './modules/medicines/routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    },
  });

  // CORS
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    credentials: true,
  });

  // Swagger Documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Farm Data Management System API',
        description: 'Full-stack production farm and flock management API',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Development Server',
        },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Global Error Handler (Section 26 & 42)
  app.setErrorHandler((error: any, request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send(
      errorResponse(
        error.message || 'Internal Server Error',
        error.code || 'INTERNAL_ERROR',
        error.validation || undefined
      )
    );
  });

  // Register API Routes under /api/v1
  await app.register(
    async (v1) => {
      await v1.register(systemRoutes);
      await v1.register(flockRoutes);
      await v1.register(dashboardRoutes);
      await v1.register(dailyRecordRoutes);
      await v1.register(reportRoutes);
      await v1.register(medicineRoutes);
    },
    { prefix: '/api/v1' }
  );

  // Root Welcome & Documentation redirect
  app.get('/', async (req, reply) => {
    return {
      name: 'Farm Data Management System API',
      version: '1.0.0',
      documentation: '/docs',
      health: '/api/v1/health',
    };
  });

  return app;
}
