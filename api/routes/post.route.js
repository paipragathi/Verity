import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import { create, deletepost, getposts, updatepost } from '../controllers/post.controller.js';
import { validateBody } from '../middleware/validate.js';
import { createPostSchema, updatePostSchema } from '../validators/post.validator.js';

const router = express.Router();

router.post('/create', verifyToken, validateBody(createPostSchema), create);
router.get('/getposts', getposts);
router.delete('/deletepost/:postId/:userId', verifyToken, deletepost);
router.put('/updatepost/:postId/:userId', verifyToken, validateBody(updatePostSchema), updatepost);

export default router;
