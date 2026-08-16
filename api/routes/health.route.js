import express from 'express';
import mongoose from 'mongoose';
import { cachePing, isCacheConfigured } from '../utils/cache.js';

const router = express.Router();

// Liveness — is the process up at all
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness — is the process actually able to serve traffic.
//
// MongoDB is a hard requirement — if it's down, we genuinely cannot
// serve most requests, so this returns 503.
//
// Redis is a SOFT dependency by design: the app is built to degrade
// gracefully to MongoDB-only reads when Redis is absent/unreachable
// (see api/utils/cache.js). So Redis being down is reported here for
// visibility, but does NOT flip readiness to 503 — that would be wrong,
// since the app is genuinely still able to serve correct responses,
// just without the caching speedup.
router.get('/health/ready', async (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  const isMongoReady = dbState === 1;

  const redisConfigured = isCacheConfigured();
  const isRedisReady = redisConfigured ? await cachePing() : null;

  res.status(isMongoReady ? 200 : 503).json({
    status: isMongoReady ? 'ok' : 'degraded',
    checks: {
      mongo: isMongoReady ? 'ok' : 'unavailable',
      redis: !redisConfigured
        ? 'not_configured'
        : isRedisReady
          ? 'ok'
          : 'unavailable (degraded — falling back to MongoDB for reads)',
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
