import { describe, it, expect, beforeEach } from 'vitest';
import { acquireLock, releaseLock, withLock, isLocked } from '../src/db/redis.js';
import { buildApp } from '../src/app.js';

describe('Distributed Redis Request Lock & Idempotency', () => {
  const testKey = 'test:lock:sample-unit-key';

  beforeEach(async () => {
    // Ensure test key is cleared before each test
    await releaseLock(testKey, 'ANY');
  });

  it('acquires lock on first request and blocks duplicate concurrent request', async () => {
    const res1 = await acquireLock(testKey, 5);
    expect(res1.acquired).toBe(true);
    expect(res1.token).toBeDefined();
    expect(res1.token.length).toBeGreaterThan(0);

    // Second request with same key should be blocked
    const res2 = await acquireLock(testKey, 5);
    expect(res2.acquired).toBe(false);
    expect(res2.token).toBe('');

    // Releasing the lock frees it
    const released = await releaseLock(testKey, res1.token);
    expect(released).toBe(true);

    // Now it can be acquired again
    const res3 = await acquireLock(testKey, 5);
    expect(res3.acquired).toBe(true);

    await releaseLock(testKey, res3.token);
  });

  it('withLock runs callback and guarantees lock release on completion', async () => {
    const result = await withLock(testKey, async () => {
      // While running, lock must be active
      const lockedDuring = await isLocked(testKey);
      expect(lockedDuring).toBe(true);
      return 'operation_successful';
    }, 5);

    expect(result).toBe('operation_successful');

    // After withLock finishes, lock must be released
    const lockedAfter = await isLocked(testKey);
    expect(lockedAfter).toBe(false);
  });

  it('blocks duplicate concurrent POST requests at Fastify route level', async () => {
    const app = await buildApp();

    // Send first POST request to create flock
    const payload = {
      name: 'Lock Test Layer Flock Alpha',
      startDate: '2026-09-01',
      initialBirds: 5000,
      eggTrackingEnabled: false,
    };

    // Simulate two concurrent requests with identical payload
    const [response1, response2] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/v1/flocks',
        payload,
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/flocks',
        payload,
      }),
    ]);

    // One of them must succeed (201 or 200) and the other must be blocked by Redis lock (429)
    const statuses = [response1.statusCode, response2.statusCode];
    expect(statuses).toContain(429);

    const blockedResponse = response1.statusCode === 429 ? response1 : response2;
    const blockedBody = JSON.parse(blockedResponse.body);
    expect(blockedBody.error.code).toBe('CONCURRENT_REQUEST_LOCKED');
    expect(blockedBody.error.message).toContain('A request for this operation is currently being processed');

    // Clean up created flock
    const successResponse = response1.statusCode !== 429 ? response1 : response2;
    if (successResponse && successResponse.body) {
      try {
        const bodyObj = JSON.parse(successResponse.body);
        const createdId = bodyObj.data?.id;
        if (createdId) {
          const { db, schema, isDatabaseConnected } = await import('../src/db/client.js');
          const { eq } = await import('drizzle-orm');
          if (isDatabaseConnected()) {
            await db.delete(schema.flocks).where(eq(schema.flocks.id, createdId));
          }
          const { mockStore } = await import('../src/db/mock-store.js');
          mockStore.flocks = mockStore.flocks.filter((f) => f.id !== createdId);
          const { flushFlocksListCache } = await import('../src/db/redis.js');
          await flushFlocksListCache();
        }
      } catch {}
    }

    await app.close();
  }, 20000);
});
