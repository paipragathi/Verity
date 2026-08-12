import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  category: z.string().optional(),
  image: z.string().url().optional(),
});

export const updatePostSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  category: z.string().optional(),
  image: z.string().url().optional(),
});
