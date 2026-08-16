import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import path from 'path';

dotenv.config();

// Validates required env vars and exits early if misconfigured —
// must run before any other import that reads process.env.
import { config } from './config/env.js';
import { logger } from './utils/logger.js';

import userRoutes from './routes/user.route.js';
import authRoutes from './routes/auth.route.js';
import postRoutes from './routes/post.route.js';
import commentRoutes from './routes/comment.route.js';
import healthRoutes from './routes/health.route.js';
import { authLimiter, apiLimiter } from './middleware/rateLimiter.js';

const __dirname = path.resolve();
const app = express();

// ── Security & parsing middleware ────────────────────────────────
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': ["'self'", 'data:', 'https:'],
        'script-src': ["'self'", 'https://apis.google.com'],
        'connect-src': [
          "'self'",
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
        ],
        'frame-src': [
          "'self'",
          'https://accounts.google.com',
          'https://blog-mern-24541.firebaseapp.com',
        ],
      },
    },
}));
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger }));

// ── Health checks (no rate limit, no auth — used by load balancers / uptime checks)
app.use('/api', healthRoutes);

// ── Rate limiting ─────────────────────────────────────────────────
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/post', postRoutes);
app.use('/api/comment', commentRoutes);

// ── Static frontend ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '/client/dist')));

// Express 5 (path-to-regexp v8) requires a named wildcard instead of
// the old bare '*' — this catches every non-API route and serves the
// SPA's index.html so client-side routing (react-router) works on
// direct page loads / refreshes.
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// ── Centralized error handler (must be registered last) ──────────
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  req.log?.error({ err, statusCode }, message);
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

// ── Database connection ───────────────────────────────────────────
mongoose
  .connect(config.mongoUri)
  .then(() => {
    logger.info('MongoDB connected');
  })
  .catch((err) => {
    logger.error({ err }, 'MongoDB connection failed');
    process.exit(1);
  });

// ── Start server (only after routes/middleware are fully registered) ──
const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} [${config.nodeEnv}]`);
});

// ── Graceful shutdown ──────────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await mongoose.connection.close();
    logger.info('Server and MongoDB connection closed');
    process.exit(0);
  });
  // Force-exit if graceful shutdown hangs
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
