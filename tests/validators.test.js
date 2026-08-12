import { describe, it, expect } from '@jest/globals';
import { signupSchema, signinSchema } from '../api/validators/auth.validator.js';
import { createPostSchema } from '../api/validators/post.validator.js';
import { createCommentSchema } from '../api/validators/comment.validator.js';

describe('signupSchema', () => {
  it('accepts a valid signup payload', () => {
    const result = signupSchema.safeParse({
      username: 'johndoe1',
      email: 'john@example.com',
      password: 'secret123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a username shorter than 7 characters', () => {
    const result = signupSchema.safeParse({
      username: 'jd',
      email: 'john@example.com',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a username with uppercase letters', () => {
    const result = signupSchema.safeParse({
      username: 'JohnDoe1',
      email: 'john@example.com',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = signupSchema.safeParse({
      username: 'johndoe1',
      email: 'not-an-email',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password shorter than 6 characters', () => {
    const result = signupSchema.safeParse({
      username: 'johndoe1',
      email: 'john@example.com',
      password: '123',
    });
    expect(result.success).toBe(false);
  });
});

describe('signinSchema', () => {
  it('accepts valid credentials', () => {
    const result = signinSchema.safeParse({
      email: 'john@example.com',
      password: 'anything',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing password', () => {
    const result = signinSchema.safeParse({ email: 'john@example.com' });
    expect(result.success).toBe(false);
  });
});

describe('createPostSchema', () => {
  it('accepts a minimal valid post', () => {
    const result = createPostSchema.safeParse({
      title: 'Hello World',
      content: 'Some content here',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty title', () => {
    const result = createPostSchema.safeParse({ title: '', content: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-URL image field', () => {
    const result = createPostSchema.safeParse({
      title: 'Hello',
      content: 'World',
      image: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('createCommentSchema', () => {
  it('accepts a valid comment', () => {
    const result = createCommentSchema.safeParse({
      content: 'Nice post!',
      postId: 'abc123',
      userId: 'user123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a comment over 1000 characters', () => {
    const result = createCommentSchema.safeParse({
      content: 'a'.repeat(1001),
      postId: 'abc123',
      userId: 'user123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty comment', () => {
    const result = createCommentSchema.safeParse({
      content: '',
      postId: 'abc123',
      userId: 'user123',
    });
    expect(result.success).toBe(false);
  });
});
