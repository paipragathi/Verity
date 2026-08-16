import { describe, it, expect, beforeEach } from '@jest/globals';

describe('cache.js — Redis not configured (REDIS_URL unset)', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it('cacheGet always returns null (cache miss) when Redis is not configured', async () => {
    const { cacheGet } = await import('../api/utils/cache.js?nocache1');
    const result = await cacheGet('some:key');
    expect(result).toBeNull();
  });

  it('cacheSet does not throw when Redis is not configured', async () => {
    const { cacheSet } = await import('../api/utils/cache.js?nocache2');
    await expect(cacheSet('some:key', { data: 'value' })).resolves.toBeUndefined();
  });

  it('cacheInvalidatePrefix does not throw when Redis is not configured', async () => {
    const { cacheInvalidatePrefix } = await import('../api/utils/cache.js?nocache3');
    await expect(cacheInvalidatePrefix('posts:')).resolves.toBeUndefined();
  });

  it('cachePing returns false when Redis is not configured', async () => {
    const { cachePing } = await import('../api/utils/cache.js?nocache4');
    const result = await cachePing();
    expect(result).toBe(false);
  });

  it('isCacheConfigured returns false when REDIS_URL is unset', async () => {
    const { isCacheConfigured } = await import('../api/utils/cache.js?nocache5');
    expect(isCacheConfigured()).toBe(false);
  });
});

describe('cache.js — Redis configured but unreachable (fail-gracefully behavior)', () => {
  beforeEach(() => {
    // Point at a port nothing is listening on — simulates Redis being down.
    // Real connection attempts will fail fast (maxRetriesPerRequest: 1,
    // retryStrategy: () => null, per cache.js) rather than hang the test.
    process.env.REDIS_URL = 'redis://127.0.0.1:1';
  });

  it('cacheGet returns null (not a throw) when Redis is unreachable', async () => {
    const { cacheGet } = await import('../api/utils/cache.js?unreachable1');
    const result = await cacheGet('some:key');
    expect(result).toBeNull();
  }, 10000);

  it('cacheSet does not throw when Redis is unreachable', async () => {
    const { cacheSet } = await import('../api/utils/cache.js?unreachable2');
    await expect(cacheSet('some:key', { data: 'value' })).resolves.toBeUndefined();
  }, 10000);

  // NOTE: isCacheConfigured() reads api/config/env.js's `config` object,
  // which is deliberately frozen from process.env at first import (a
  // fail-fast-once pattern, not meant to be re-read per request). That
  // means mutating process.env.REDIS_URL mid-test-run here doesn't
  // retroactively change an already-imported config singleton — this is
  // correct production behavior (config is fixed for the process
  // lifetime) but makes the "true" case awkward to unit test in
  // isolation from the "false" case above in the same test run. The
  // false case is covered above; the true case is exercised for real
  // via docker-compose (REDIS_URL set in the environment before the
  // process starts) and the live Railway deployment.
});
