// Loaded before any test file imports, via jest.config.js `setupFiles`.
// api/config/env.js exits the process if MONGO/JWT_SECRET are unset —
// correct behavior for the real app (fail fast on missing config), but
// tests need dummy values present so modules that transitively import
// config (e.g. api/utils/cache.js, pulled in by post.controller.js) can
// load without crashing the whole test run.
process.env.MONGO = process.env.MONGO || 'mongodb://test-placeholder/verity-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-not-for-real-use';
// REDIS_URL deliberately left unset in most tests — exercises the
// "cache not configured, always miss, fall through to Mongo" path,
// which is the default/degraded-but-correct state.
