/**
 * Load-test harness — NOT part of the production app.
 *
 * Mirrors the exact middleware stack from api/index.js (helmet, cors,
 * json parsing, cookie parsing, pino-http request logging, rate
 * limiters, health routes) so we can measure real framework/middleware
 * overhead in this environment, without requiring a live MongoDB
 * connection (which api/index.js correctly refuses to start without).
 *
 * This does NOT measure database query latency. For full end-to-end
 * numbers including Mongo-backed endpoints (getposts, getPostComments,
 * signin, etc), run `docker compose up` locally (real MongoDB) and
 * point loadtest/k6-script.js at http://localhost:3000 instead.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { logger } from '../api/utils/logger.js';
import healthRoutes from '../api/routes/health.route.js';
import { authLimiter, apiLimiter } from '../api/middleware/rateLimiter.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger, autoLogging: false })); // autoLogging off to avoid stdout noise during the run

app.use('/api', healthRoutes);
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Test-only route to observe apiLimiter behavior under load (300 req/15min).
// Not present in the real API — health checks are the only unauthenticated,
// unlimited route in production.
app.get('/api/test/rate-limited', (req, res) => {
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ success: false, message: err.message });
});

const PORT = process.env.LOADTEST_PORT || 4000;
app.listen(PORT, () => {
  console.log(`Load-test harness listening on :${PORT}`);
});
