import { buildApp } from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './db/client.js';
import { checkRedisConnection } from './db/redis.js';

async function start() {
  try {
    const app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: env.HOST,
    });

    console.log(`\n=================================================`);
    console.log(`🌾 Farm Data Management System Backend`);
    console.log(`🚀 API Server: http://${env.HOST}:${env.PORT}`);
    console.log(`📖 Swagger API Docs: http://${env.HOST}:${env.PORT}/docs`);
    console.log(`=================================================`);

    // Verify infrastructure connections asynchronously
    const dbStatus = await checkDatabaseConnection();
    if (dbStatus.connected) {
      console.log(`✅ PostgreSQL Database: Connected via Drizzle ORM`);
    } else {
      console.log(`ℹ️ PostgreSQL Database: Not connected (${dbStatus.error}). In-memory fallback mode active.`);
    }

    const redisStatus = await checkRedisConnection();
    if (redisStatus.connected) {
      console.log(`✅ Redis Cache: Connected via ${redisStatus.client || 'Upstash Redis'}`);
    } else {
      console.log(`ℹ️ Redis Cache: Offline (${redisStatus.error}). Proceeding without cache.`);
    }
    console.log(`=================================================\n`);
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

start();
