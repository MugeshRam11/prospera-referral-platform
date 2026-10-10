import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from '../modules/auth/auth.routes';

const router = Router();

// Health routes
router.use('/', healthRouter);

// Authentication & Session routes
router.use('/auth', authRouter);

export const apiRouter = router;
