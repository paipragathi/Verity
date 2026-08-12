import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import {
  createComment,
  deleteComment,
  editComment,
  getPostComments,
  getcomments,
  likeComment,
} from '../controllers/comment.controller.js';
import { validateBody } from '../middleware/validate.js';
import { createCommentSchema, editCommentSchema } from '../validators/comment.validator.js';

const router = express.Router();

router.post('/create', verifyToken, validateBody(createCommentSchema), createComment);
router.get('/getPostComments/:postId', getPostComments);
router.put('/likeComment/:commentId', verifyToken, likeComment);
router.put('/editComment/:commentId', verifyToken, validateBody(editCommentSchema), editComment);
router.delete('/deleteComment/:commentId', verifyToken, deleteComment);
router.get('/getcomments', verifyToken, getcomments);

export default router;
