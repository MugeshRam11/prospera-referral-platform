import { Router } from 'express';
import { Role } from '@prisma/client';
import { ReferralController } from './referral.controller';
import {
  authenticate,
  authorize,
  validateBody,
  validateQuery,
} from '../../middleware';
import {
  createReferralSchema,
  updateReferralSchema,
  transitionStatusSchema,
  assignReferralSchema,
  listReferralsQuerySchema,
} from './referral.schemas';

const router = Router();
const controller = new ReferralController();

// 1. Create a referral/lead (Partners, Coordinators, Admins)
router.post(
  '/',
  authenticate,
  authorize([Role.REFERRAL_PARTNER, Role.COORDINATOR, Role.ADMIN]),
  validateBody(createReferralSchema),
  controller.create
);

// 2. View authenticated user's own referrals (must precede /:id)
router.get(
  '/me',
  authenticate,
  authorize([Role.REFERRAL_PARTNER, Role.AGENT, Role.COORDINATOR, Role.ADMIN]),
  validateQuery(listReferralsQuerySchema),
  controller.getMyReferrals
);

// 3. List referrals with pagination and filters (role-isolated)
router.get(
  '/',
  authenticate,
  authorize([Role.REFERRAL_PARTNER, Role.AGENT, Role.COORDINATOR, Role.ADMIN]),
  validateQuery(listReferralsQuerySchema),
  controller.list
);

// 4. View a referral by ID
router.get(
  '/:id',
  authenticate,
  authorize([Role.REFERRAL_PARTNER, Role.AGENT, Role.COORDINATOR, Role.ADMIN]),
  controller.getById
);

// 5. Update permitted referral fields
router.patch(
  '/:id',
  authenticate,
  authorize([Role.REFERRAL_PARTNER, Role.AGENT, Role.COORDINATOR, Role.ADMIN]),
  validateBody(updateReferralSchema),
  controller.update
);

// 6. Transition referral status (State Machine enforcement)
router.patch(
  '/:id/status',
  authenticate,
  authorize([Role.REFERRAL_PARTNER, Role.AGENT, Role.COORDINATOR, Role.ADMIN]),
  validateBody(transitionStatusSchema),
  controller.transitionStatus
);

// 7. Assign or reassign referrals (Coordinators and Admins only)
router.patch(
  '/:id/assign',
  authenticate,
  authorize([Role.COORDINATOR, Role.ADMIN]),
  validateBody(assignReferralSchema),
  controller.assign
);

// 8. Retrieve referral status transition history
router.get(
  '/:id/history',
  authenticate,
  authorize([Role.REFERRAL_PARTNER, Role.AGENT, Role.COORDINATOR, Role.ADMIN]),
  controller.getHistory
);

export const referralRouter = router;
