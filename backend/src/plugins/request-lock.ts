import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'node:crypto';
import { acquireLock, releaseLock } from '../db/redis.js';
import { errorResponse } from '../utils/response.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Deterministically sorts object keys deeply to produce a canonical string representation.
 * Ensures { a: 1, b: 2 } and { b: 2, a: 1 } result in the exact same signature.
 */
function canonicalizeBody(obj: any): string {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return String(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeBody).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalizeBody(obj[k])).join(',') + '}';
}

/**
 * Derives a deterministic request signature for idempotency and concurrency locking.
 */
export function getRequestLockKey(request: FastifyRequest): string {
  // Check for explicit idempotency key from client header
  const customKey =
    (request.headers['idempotency-key'] as string) ||
    (request.headers['x-idempotency-key'] as string);

  if (customKey && customKey.trim()) {
    return `lock:idempotency:${customKey.trim()}`;
  }

  const method = request.method.toUpperCase();
  const cleanPath = request.url.split('?')[0];
  const canonicalBody = canonicalizeBody(request.body);

  const raw = `${method}:${cleanPath}:${canonicalBody}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);

  return `lock:req:${method}:${cleanPath}:${hash}`;
}

export interface RequestLockPluginOptions {
  ttlSeconds?: number;
  cooldownSeconds?: number;
}

const requestLockPluginAsync: FastifyPluginAsync<RequestLockPluginOptions> = async (
  fastify,
  options
) => {
  const ttl = options.ttlSeconds || 15;
  const cooldown = options.cooldownSeconds || 1;

  // 1. Hook: preHandler to detect concurrent duplicate requests and acquire lock
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const method = request.method.toUpperCase();

    // Only apply lock to state-mutating requests (POST, PUT, PATCH, DELETE)
    if (!MUTATING_METHODS.has(method)) {
      return;
    }

    // Skip Swagger documentation or health checks
    const url = request.url;
    if (url.startsWith('/docs') || url.startsWith('/api/v1/health')) {
      return;
    }

    const lockKey = getRequestLockKey(request);
    const { acquired, token } = await acquireLock(lockKey, ttl);

    if (!acquired) {
      fastify.log.warn(
        { lockKey, method: request.method, url: request.url },
        'Duplicate / concurrent request blocked by Redis lock'
      );

      reply.header('Retry-After', '2');
      reply.status(429).send(
        errorResponse(
          'A request for this operation is currently being processed. Please wait for it to complete.',
          'CONCURRENT_REQUEST_LOCKED'
        )
      );
      return reply;
    }

    // Attach lock token to request context for release on completion
    (request as any).redisLock = {
      key: lockKey,
      token,
      cooldown,
    };
  });

  // 2. Hook: onResponse to release lock when response has finished
  fastify.addHook('onResponse', async (request: FastifyRequest) => {
    const lock = (request as any).redisLock;
    if (lock) {
      await releaseLock(lock.key, lock.token, lock.cooldown);
    }
  });

  // 3. Hook: onError to immediately release lock if an unhandled error occurred
  fastify.addHook('onError', async (request: FastifyRequest) => {
    const lock = (request as any).redisLock;
    if (lock) {
      await releaseLock(lock.key, lock.token, 0);
    }
  });
};

export const requestLockPlugin = fp(requestLockPluginAsync, {
  name: 'request-lock-plugin',
  fastify: '5.x',
});
