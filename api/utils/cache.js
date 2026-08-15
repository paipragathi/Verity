import Redis from 'ioredis';
import { config } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Cache-aside layer over Redis. Every method here is designed to NEVER
 * throw or block a request — if Redis is unset, unreachable, or errors
 * mid-operation, callers get a cache miss (null) and fall through to
 * MongoDB. Caching is a performance optimization; it must not become a
 * new point of failure for the app.
 */

let client = null;
let connectionAttempted = false;

function getClient() {
  if (!config.redisUrl) return null;
  if (client) return client;
  if (connectionAttempted) return null; // already tried and failed, don't retry every request

  connectionAttempted = true;
  try {
    client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1, // fail fast — a slow/down Redis must not slow down the API
      retryStrategy: () => null, // don't keep reconnecting in a loop; next getClient() call will just skip
      lazyConnect: false,
    });
    client.on('error', (err) => {
      logger.warn({ err: err.message }, '[cache] Redis error — falling back to MongoDB for this request');
    });
    client.on('connect', () => {
      logger.info('[cache] Redis connected');
    });
    return client;
  } catch (err) {
    logger.warn({ err: err.message }, '[cache] Failed to initialize Redis client — caching disabled');
    client = null;
    return null;
  }
}

/** Returns the cached value (parsed JSON) or null on miss/error/unavailable. */
export async function cacheGet(key) {
  const c = getClient();
  if (!c) return null;
  try {
    const raw = await c.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn({ err: err.message, key }, '[cache] GET failed — treating as miss');
    return null;
  }
}

/** Sets a value with a TTL. Silently no-ops on failure — never throws. */
export async function cacheSet(key, value, ttlSeconds = config.postsCacheTtlSeconds) {
  const c = getClient();
  if (!c) return;
  try {
    await c.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn({ err: err.message, key }, '[cache] SET failed — continuing without caching this response');
  }
}

/**
 * Deletes all keys matching a prefix (used to invalidate all cached
 * getposts() variations after a post is created/updated/deleted, since
 * we cache per-query-params and can't know every cached variant's exact key).
 */
export async function cacheInvalidatePrefix(prefix) {
  const c = getClient();
  if (!c) return;
  try {
    const keys = await c.keys(`${prefix}*`);
    if (keys.length > 0) {
      await c.del(...keys);
    }
  } catch (err) {
    logger.warn({ err: err.message, prefix }, '[cache] Invalidation failed');
  }
}

/** For health checks — true only if Redis is configured AND actually responding. */
export async function cachePing() {
  const c = getClient();
  if (!c) return false;
  try {
    const result = await c.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

export function isCacheConfigured() {
  return Boolean(config.redisUrl);
}
