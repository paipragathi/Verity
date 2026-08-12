import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

// Liveness — is the process up at all
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness — is the process actually able to serve traffic (DB connected)
router.get('/health/ready', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  const isReady = dbState === 1;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ok' : 'degraded',
    checks: {
      mongo: isReady ? 'ok' : 'unavailable',
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
