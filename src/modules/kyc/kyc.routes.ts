import { Router } from 'express';
import { KycController } from './kyc.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { uploadMiddleware } from '../../lib/documentStorage';
import { Role, AccountStatus } from '../../types';

const router = Router();
const controller = new KycController();

const allRoles = [Role.REFERRAL_PARTNER, Role.AGENT, Role.COORDINATOR, Role.ADMIN];
const onboardingStatuses = [
  AccountStatus.ACTIVE,
  AccountStatus.PENDING_APPROVAL,
  AccountStatus.PENDING_VERIFICATION,
];

router.use(authenticate);

// Document listing
router.get(
  '/documents',
  authorize(allRoles, onboardingStatuses),
  (req, res, next) => controller.getDocuments(req, res, next)
);

// Document upload
router.post(
  '/upload',
  authorize(allRoles, onboardingStatuses),
  uploadMiddleware.single('file'),
  (req, res, next) => controller.uploadDocument(req, res, next)
);

// Final submission for review
router.post(
  '/submit',
  authorize(allRoles, onboardingStatuses),
  (req, res, next) => controller.submitKyc(req, res, next)
);

export const kycRouter = router;
