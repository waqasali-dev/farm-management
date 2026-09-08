import { Redis as UpstashRedis } from '@upstash/redis';
import { Redis as IORedis } from 'ioredis';
import { env } from '../config/env.js';

let upstashClient: UpstashRedis | null = null;
let ioRedisClient: IORedis | null = null;
let isRedisAvailable = false;
let activeClientName = 'none';

if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    upstashClient = new UpstashRedis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    activeClientName = 'Upstash Redis';
    console.log('[Redis] Initialized Upstash Redis REST client');

    // Attempt initial connect/ping asynchronously
    upstashClient.ping().then((pong) => {
      if (pong === 'PONG' || pong === 'pong' || pong === 'OK') {
        isRedisAvailable = true;
        console.log('[Redis] Connected successfully to Upstash Redis');
      }
    }).catch((err: any) => {
      isRedisAvailable = false;
      console.warn('[Redis] Upstash initial ping notice:', err.message);
    });
  } catch (err: any) {
    console.warn('[Redis] Upstash Redis initialization error:', err.message);
  }
} else if (env.REDIS_URL) {
  try {
    ioRedisClient = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => {
        if (times > 5) return null;
        return Math.min(times * 500, 3000);
      },
      enableReadyCheck: true,
      lazyConnect: true,
    });
    activeClientName = 'ioredis';

    ioRedisClient.on('connect', () => {
      isRedisAvailable = true;
      console.log('[Redis] Connected successfully via ioredis');
    });

    ioRedisClient.on('ready', () => {
      isRedisAvailable = true;
    });

    ioRedisClient.on('error', (err: any) => {
      isRedisAvailable = false;
      if (env.NODE_ENV === 'development') {
        console.warn('[Redis] Connection notice:', err.message);
      }
    });

    ioRedisClient.on('close', () => {
      isRedisAvailable = false;
    });

    ioRedisClient.connect().catch((err: any) => {
      isRedisAvailable = false;
      console.warn('[Redis] Initial connection deferred:', err.message);
    });
  } catch (err: any) {
    console.warn('[Redis] Client initialization warning:', err.message);
  }
}

export const redis = upstashClient || ioRedisClient;

/**
 * Health check to verify Redis connectivity
 */
export async function checkRedisConnection(): Promise<{ connected: boolean; client: string; error?: string }> {
  if (upstashClient) {
    try {
      const pong = await upstashClient.ping();
      isRedisAvailable = pong === 'PONG' || pong === 'pong' || pong === 'OK';
      return {
        connected: isRedisAvailable,
        client: 'Upstash Redis',
        error: isRedisAvailable ? undefined : 'Upstash ping failed',
      };
    } catch (error: any) {
      isRedisAvailable = false;
      return {
        connected: false,
        client: 'Upstash Redis',
        error: error.message || 'Unable to connect to Upstash Redis REST endpoint',
      };
    }
  }

  if (ioRedisClient) {
    try {
      const pong = await ioRedisClient.ping();
      isRedisAvailable = pong === 'PONG';
      return {
        connected: isRedisAvailable,
        client: 'ioredis',
        error: isRedisAvailable ? undefined : 'Redis ping failed',
      };
    } catch (error: any) {
      isRedisAvailable = false;
      return {
        connected: false,
        client: 'ioredis',
        error: error.message || 'Unable to connect to Redis cache',
      };
    }
  }

  return {
    connected: false,
    client: 'none',
    error: 'Redis client not initialized',
  };
}

export function isRedisConnected(): boolean {
  return isRedisAvailable;
}

export function getRedisClientName(): string {
  return activeClientName;
}

/**
 * Cache helper utilities
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable) return null;
  try {
    let result: T | null = null;
    if (upstashClient) {
      const data = await upstashClient.get<T>(key);
      if (data !== null && data !== undefined) {
        if (typeof data === 'string') {
          try {
            result = JSON.parse(data) as T;
          } catch {
            result = data as unknown as T;
          }
        } else {
          result = data as T;
        }
      }
    } else if (ioRedisClient) {
      const data = await ioRedisClient.get(key);
      result = data ? JSON.parse(data) : null;
    }

    if (result !== null && result !== undefined) {
      console.log(`[Redis HIT] key: ${key}`);
      return result;
    } else {
      console.log(`[Redis MISS] key: ${key} -> falling back to DB/store`);
      return null;
    }
  } catch {
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds = 300): Promise<void> {
  if (!isRedisAvailable) return;
  try {
    if (upstashClient) {
      await upstashClient.set(key, value, { ex: ttlSeconds });
      console.log(`[Redis SET/UPDATED] key: ${key} (ttl: ${ttlSeconds}s)`);
      return;
    }
    if (ioRedisClient) {
      await ioRedisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      console.log(`[Redis SET/UPDATED] key: ${key} (ttl: ${ttlSeconds}s)`);
      return;
    }
  } catch {
    // Ignore cache set errors gracefully
  }
}

export async function deleteCache(key: string): Promise<void> {
  if (!isRedisAvailable) return;
  try {
    if (upstashClient) {
      await upstashClient.del(key);
      console.log(`[Redis DEL] key: ${key}`);
      return;
    }
    if (ioRedisClient) {
      await ioRedisClient.del(key);
      console.log(`[Redis DEL] key: ${key}`);
      return;
    }
  } catch {
    // Ignore cache del errors gracefully
  }
}

export async function deleteByPattern(pattern: string): Promise<void> {
  if (!isRedisAvailable) return;
  try {
    if (upstashClient) {
      const keys = await upstashClient.keys(pattern);
      if (keys.length > 0) {
        await upstashClient.del(...keys);
        console.log(`[Redis INVALIDATED] pattern: ${pattern} (${keys.length} keys)`);
      }
      return;
    }
    if (ioRedisClient) {
      const keys = await ioRedisClient.keys(pattern);
      if (keys.length > 0) {
        await ioRedisClient.del(...keys);
        console.log(`[Redis INVALIDATED] pattern: ${pattern} (${keys.length} keys)`);
      }
      return;
    }
  } catch {
    // Ignore cache flush errors gracefully
  }
}

export async function flushFlocksListCache(): Promise<void> {
  await deleteByPattern('flocks:list:*');
}

export async function flushFlockCache(flockId: string): Promise<void> {
  await deleteByPattern(`flock:${flockId}:*`);
  await flushFlocksListCache();
}

/**
 * Cache-aside helper: checks Redis first; on miss, fetches, stores in Redis, and returns.
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 300
): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }
  const fresh = await fetcher();
  if (fresh !== null && fresh !== undefined) {
    await setCache(key, fresh, ttlSeconds);
  }
  return fresh;
}
