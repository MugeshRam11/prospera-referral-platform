import { Router } from 'express';
import { AgencyController } from './agency.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  registerAgencySchema,
  updateAgencySchema,
  inviteAgentSchema,
  joinAgencySchema,
} from './agency.validation';
import { Role, AccountStatus } from '../../types';

const router = Router();
const controller = new AgencyController();

const allRoles = [Role.REFERRAL_PARTNER, Role.AGENT, Role.COORDINATOR, Role.ADMIN];
const onboardingStatuses = [
  AccountStatus.ACTIVE,
  AccountStatus.PENDING_APPROVAL,
  AccountStatus.PENDING_VERIFICATION,
];

router.use(authenticate);

// Get my agency overview and members
router.get(
  '/my-agency',
  authorize(allRoles, onboardingStatuses),
  (req, res, next) => controller.getMyAgency(req, res, next)
);

// Register a new agency
router.post(
  '/register',
  authorize(allRoles, onboardingStatuses),
  validate(registerAgencySchema),
  (req, res, next) => controller.registerAgency(req, res, next)
);

// Update agency fields
router.patch(
  '/:id',
  authorize(allRoles, onboardingStatuses),
  validate(updateAgencySchema),
  (req, res, next) => controller.updateAgency(req, res, next)
);

// Invite an agent to agency
router.post(
  '/:id/invitations',
  authorize(allRoles, onboardingStatuses),
  validate(inviteAgentSchema),
  (req, res, next) => controller.inviteAgent(req, res, next)
);

// Join an agency using invitation token
router.post(
  '/join',
  authorize(allRoles, onboardingStatuses),
  validate(joinAgencySchema),
  (req, res, next) => controller.joinAgency(req, res, next)
);

// Remove member from agency
router.delete(
  '/:id/members/:memberId',
  authorize(allRoles, onboardingStatuses),
  (req, res, next) => controller.removeMember(req, res, next)
);

export const agencyRouter = router;
