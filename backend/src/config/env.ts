import * as dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/farm_management',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  FALLBACK_STORAGE: process.env.FALLBACK_STORAGE !== 'false',
  JWT_SECRET: process.env.JWT_SECRET || 'farm-secret-jwt-key-2026-production-secure',
};

