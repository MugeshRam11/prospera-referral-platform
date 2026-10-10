import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { referralRouter } from '../modules/referrals/referral.routes';

const router = Router();

// Health routes
router.use('/', healthRouter);

// Authentication & Session routes
router.use('/auth', authRouter);

// Referral Management routes
router.use('/referrals', referralRouter);

export const apiRouter = router;
