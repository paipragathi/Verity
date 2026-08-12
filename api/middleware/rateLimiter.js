import rateLimit from 'express-rate-limit';

/**
 * Strict limiter for authentication endpoints (signup/signin/google) —
 * these were previously unprotected against brute-force / credential-stuffing.
 * 20 requests per 15 minutes per IP is generous for a real user, but blocks
 * automated brute-force attempts.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

/**
 * Looser general-purpose limiter for the rest of the API, protecting
 * against accidental client-side loops and basic abuse.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests. Please try again later.',
  },
});
