import { z } from 'zod';

export const signupSchema = z.object({
  username: z
    .string()
    .min(7, 'Username must be between 7 and 20 characters')
    .max(20, 'Username must be between 7 and 20 characters')
    .regex(/^[a-z0-9]+$/, 'Username can only contain lowercase letters and numbers'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signinSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const googleAuthSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  googlePhotoUrl: z.string().url().optional(),
});
