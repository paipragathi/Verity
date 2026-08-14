import { describe, it, expect } from '@jest/globals';
import express from 'express';

/**
 * Regression test for the Express 5 upgrade: bare app.get('*', ...) throws
 * PathError at startup under path-to-regexp v8 (used by Express 5+).
 * Must use a named wildcard like '/*splat' instead. This test doesn't
 * import api/index.js directly (it requires MONGO/JWT_SECRET env vars
 * and calls process.exit on missing config) — it verifies the underlying
 * Express behavior that caused the production crash.
 */
describe('Express 5 catch-all route registration', () => {
  it('throws when registering a bare "*" wildcard route (documents the bug)', () => {
    const app = express();
    expect(() => {
      app.get('*', (req, res) => res.send('ok'));
    }).toThrow(/Missing parameter name/);
  });

  it('does NOT throw when registering a named wildcard "/*splat" route (the fix)', () => {
    const app = express();
    expect(() => {
      app.get('/*splat', (req, res) => res.send('ok'));
    }).not.toThrow();
  });
});
