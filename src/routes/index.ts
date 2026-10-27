import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { referralRouter } from '../modules/referrals/referral.routes';
import { profileRouter } from '../modules/profile/profile.routes';
import { kycRouter } from '../modules/kyc/kyc.routes';
import { bankingRouter } from '../modules/banking/banking.routes';
import { agencyRouter } from '../modules/agency/agency.routes';
import { adminRouter } from '../modules/admin/admin.routes';
import { documentRouter } from './document.routes';

const router = Router();

// Health routes
router.use('/', healthRouter);

// Authentication & Session routes
router.use('/auth', authRouter);

// Referral Management routes
router.use('/referrals', referralRouter);

// Profile & Account Settings routes
router.use('/profile', profileRouter);

// Compliance & KYC routes
router.use('/kyc', kycRouter);

// Banking Verification routes
router.use('/banking', bankingRouter);

// Agency & Organization Management routes
router.use('/agency', agencyRouter);

// Prospera Admin Portal routes
router.use('/admin', adminRouter);

// Authorized Private Document Streaming routes
router.use('/documents', documentRouter);

export const apiRouter = router;

