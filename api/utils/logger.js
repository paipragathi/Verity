import pino from 'pino';
import { config } from '../config/env.js';

/**
 * Structured JSON logger (replaces scattered console.log calls).
 * In development, pretty-prints to the terminal; in production, emits
 * plain JSON lines suitable for log aggregation (CloudWatch, Datadog, etc).
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (config.isProduction ? 'info' : 'debug'),
  transport: config.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
});
