import { errorHandler } from '../utils/error.js';

/**
 * Generic request-body validation middleware factory.
 * Wraps a Zod schema; on failure, forwards a clean 400 through the
 * existing errorHandler/next() flow instead of letting bad input reach
 * controllers (which previously did ad-hoc, inconsistent manual checks).
 */
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    return next(errorHandler(400, message));
  }
  req.body = result.data;
  next();
};
