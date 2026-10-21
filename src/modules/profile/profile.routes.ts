import { Router } from 'express';
import { ProfileController } from './profile.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { updateProfileSchema } from './profile.validation';
import { uploadMiddleware } from '../../lib/documentStorage';
import { Role, AccountStatus } from '../../types';

const router = Router();
const controller = new ProfileController();

const allRoles = [Role.REFERRAL_PARTNER, Role.AGENT, Role.COORDINATOR, Role.ADMIN];
const onboardingStatuses = [
  AccountStatus.ACTIVE,
  AccountStatus.PENDING_APPROVAL,
  AccountStatus.PENDING_VERIFICATION,
];

// Profile access allowed across onboarding stages
router.use(authenticate);

router.get(
  '/',
  authorize(allRoles, onboardingStatuses),
  (req, res, next) => controller.getProfile(req, res, next)
);

router.patch(
  '/',
  authorize(allRoles, onboardingStatuses),
  validate(updateProfileSchema),
  (req, res, next) => controller.updateProfile(req, res, next)
);

router.post(
  '/avatar',
  authorize(allRoles, onboardingStatuses),
  uploadMiddleware.single('avatar'),
  (req, res, next) => controller.uploadAvatar(req, res, next)
);

router.post(
  '/request-deletion',
  authorize(allRoles, onboardingStatuses),
  (req, res, next) => controller.requestAccountDeletion(req, res, next)
);

export const profileRouter = router;
