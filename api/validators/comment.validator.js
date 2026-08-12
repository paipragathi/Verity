import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(1000, 'Comment too long'),
  postId: z.string().min(1, 'postId is required'),
  userId: z.string().min(1, 'userId is required'),
});

export const editCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(1000, 'Comment too long'),
});
