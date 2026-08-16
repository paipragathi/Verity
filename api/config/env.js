/**
 * Centralized environment configuration.
 * Fails fast on startup if required variables are missing, instead of
 * crashing later mid-request (e.g. jwt.sign() with an undefined secret).
 */
const required = ['MONGO', 'JWT_SECRET'];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `[config] Missing required environment variables: ${missing.join(', ')}`
  );
  console.error('[config] Copy .env.example to .env and fill in values.');
  process.exit(1);
}

export const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  mongoUri: process.env.MONGO,
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Deliberately NOT in the required[] list above — caching is an
  // optimization, not a dependency. The app must run correctly with
  // Redis absent or down (falls back to MongoDB on every read), so a
  // missing REDIS_URL is a degraded-performance state, not a startup
  // failure. See api/utils/cache.js.
  redisUrl: process.env.REDIS_URL || null,
  postsCacheTtlSeconds: parseInt(process.env.POSTS_CACHE_TTL_SECONDS, 10) || 60,
};
