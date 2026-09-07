import { Redis } from 'ioredis';
import { env } from '../config/env.js';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

try {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times: number) => {
      // Exponential backoff capped at 3 seconds
      if (times > 5) {
        return null; // Stop retrying after 5 attempts to avoid flooding
      }
      return Math.min(times * 500, 3000);
    },
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    isRedisAvailable = true;
    console.log('[Redis] Connected successfully');
  });

  redisClient.on('ready', () => {
    isRedisAvailable = true;
  });

  redisClient.on('error', (err: any) => {
    isRedisAvailable = false;
    // Log as warning rather than uncaught error
    if (env.NODE_ENV === 'development') {
      console.warn('[Redis] Connection notice:', err.message);
    }
  });

  redisClient.on('close', () => {
    isRedisAvailable = false;
  });

  // Attempt initial connect asynchronously
  redisClient.connect().catch((err: any) => {
    isRedisAvailable = false;
    console.warn('[Redis] Initial connection deferred:', err.message);
  });
} catch (err: any) {
  console.warn('[Redis] Client initialization warning:', err.message);
}

export const redis = redisClient;

/**
 * Health check to verify Redis connectivity
 */
export async function checkRedisConnection(): Promise<{ connected: boolean; error?: string }> {
  if (!redis) {
    return { connected: false, error: 'Redis client not initialized' };
  }
  try {
    const pong = await redis.ping();
    isRedisAvailable = pong === 'PONG';
    return { connected: isRedisAvailable };
  } catch (error: any) {
    isRedisAvailable = false;
    return {
      connected: false,
      error: error.message || 'Unable to connect to Redis cache',
    };
  }
}

export function isRedisConnected(): boolean {
  return isRedisAvailable;
}

/**
 * Cache helper utilities
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis || !isRedisAvailable) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds = 300): Promise<void> {
  if (!redis || !isRedisAvailable) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Ignore cache set errors gracefully
  }
}

export async function deleteCache(key: string): Promise<void> {
  if (!redis || !isRedisAvailable) return;
  try {
    await redis.del(key);
  } catch {
    // Ignore cache del errors gracefully
  }
}

export async function flushFlockCache(flockId: string): Promise<void> {
  if (!redis || !isRedisAvailable) return;
  try {
    const keys = await redis.keys(`flock:${flockId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Ignore cache flush errors gracefully
  }
}
