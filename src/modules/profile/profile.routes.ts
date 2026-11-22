import { z } from 'zod';
import { prisma } from '../../lib/prisma';
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

router.get('/orientation', authorize(allRoles, onboardingStatuses), async (req, res) => {
  const record = await prisma.orientation.findUnique({ where: { userId: req.user!.id }, select: { step: true, state: true } });
  res.json({ success: true, data: record ?? { step: 0, state: 'active' } });
});

router.patch('/orientation', authorize(allRoles, onboardingStatuses),
  validate(z.object({ step: z.number().int().min(0).max(10), state: z.enum(['active', 'skipped', 'complete']) }).strict()),
  async (req, res) => {
    const userId = req.user!.id;
    const data = { step: req.body.step, state: req.body.state };
    await prisma.orientation.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    res.json({ success: true, data });
  });


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

export const profileRouter: Router = router;
