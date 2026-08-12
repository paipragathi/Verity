import { describe, it, expect, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import healthRouter from '../api/routes/health.route.js';

const app = express();
app.use('/api', healthRouter);

describe('GET /api/health', () => {
  it('always returns 200 (liveness — does not depend on DB)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('GET /api/health/ready', () => {
  it('returns 503 when MongoDB is not connected', async () => {
    // mongoose.connection.readyState defaults to 0 (disconnected) with no connect() call
    expect(mongoose.connection.readyState).toBe(0);
    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.mongo).toBe('unavailable');
  });

  it('returns 200 when MongoDB readyState is simulated as connected', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 1,
      configurable: true,
    });

    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.checks.mongo).toBe('ok');

    // Restore to disconnected so this test doesn't leak state into others
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 0,
      configurable: true,
    });
  });
});
