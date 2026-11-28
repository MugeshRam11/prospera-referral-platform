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
import { integrationsRouter } from '../modules/integrations/integrations.routes';
import { propertyRouter } from '../modules/properties/property.routes';
import { commissionRulesRouter } from '../modules/commissions/commission-rules.routes';
import { legalRouter } from '../modules/legal/legal.routes';

const router = Router();

if (process.env.CLIENT_BETA === 'true') {
  router.use(['/auth/register', '/auth/verify-otp', '/auth/resend-otp'], (_req, res) => {
    res.status(403).json({ success: false, error: { message: 'Access is by invitation. Use your assigned review account.' } });
  });
  router.use(['/integrations', '/properties', '/legal/accept'], (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    res.status(403).json({ success: false, error: { message: 'This action is disabled during client beta review.' } });
  });
}

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
router.use('/admin/commission-rules', commissionRulesRouter);

// CRM Integrations & Property Inventory routes
router.use('/integrations', integrationsRouter);
router.use('/properties', propertyRouter);

// Legal Governance & Policy Acceptance routes
router.use('/legal', legalRouter);

// Authorized Private Document Streaming routes
router.use('/documents', documentRouter);

export const apiRouter: Router = router;

