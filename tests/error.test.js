import { describe, it, expect } from '@jest/globals';
import { errorHandler } from '../api/utils/error.js';

describe('errorHandler', () => {
  it('creates an Error with the given statusCode and message', () => {
    const err = errorHandler(404, 'Not found');
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
  });

  it('handles a 500 with a generic message', () => {
    const err = errorHandler(500, 'Internal Server Error');
    expect(err.statusCode).toBe(500);
  });
});
