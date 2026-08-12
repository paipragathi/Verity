import express from 'express';
import { google, signin, signup } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { signupSchema, signinSchema, googleAuthSchema } from '../validators/auth.validator.js';

const router = express.Router();

router.post('/signup', validateBody(signupSchema), signup);
router.post('/signin', validateBody(signinSchema), signin);
router.post('/google', validateBody(googleAuthSchema), google);

export default router;
