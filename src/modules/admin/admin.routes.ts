import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  agentQuerySchema,
  agencyQuerySchema,
  updateAgentStatusSchema,
  updateAgencyStatusSchema,
  reviewKycDocumentSchema,
  verifyBankSchema,
  userQuerySchema,
  createUserSchema,
  inviteUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  adminReferralQuerySchema,
  adminServiceSchema,
} from './admin.validation';
import { Role, AccountStatus } from '../../types';

const router = Router();
const controller = new AdminController();

// All Admin routes require authentication and strictly ADMIN role with ACTIVE status
router.use(authenticate);
router.use(authorize(Role.ADMIN, [AccountStatus.ACTIVE]));

// Overview Metrics
router.get('/overview', (req, res, next) => controller.getOverview(req, res, next));

// User Management (Section 1)
router.get('/users', validate(userQuerySchema, 'query'), (req, res, next) =>
  controller.getUsers(req, res, next)
);
router.post('/users', validate(createUserSchema), (req, res, next) =>
  controller.createUser(req, res, next)
);
router.post('/users/invite', validate(inviteUserSchema), (req, res, next) =>
  controller.inviteUser(req, res, next)
);
router.get('/users/:id', (req, res, next) => controller.getUserDetails(req, res, next));
router.patch('/users/:id', validate(updateUserSchema), (req, res, next) =>
  controller.updateUser(req, res, next)
);
router.patch('/users/:id/status', validate(updateUserStatusSchema), (req, res, next) =>
  controller.updateUserStatus(req, res, next)
);
router.post('/users/:id/password-reset', (req, res, next) =>
  controller.requestPasswordReset(req, res, next)
);
router.post('/users/:id/revoke-sessions', (req, res, next) =>
  controller.revokeUserSessions(req, res, next)
);

// Agent Directory and Details
router.get('/agents', validate(agentQuerySchema, 'query'), (req, res, next) =>
  controller.getAgents(req, res, next)
);
router.get('/agents/:id', (req, res, next) => controller.getAgentById(req, res, next));
router.patch('/agents/:id/status', validate(updateAgentStatusSchema), (req, res, next) =>
  controller.updateAgentStatus(req, res, next)
);

// Agency Management
router.get('/agencies', validate(agencyQuerySchema, 'query'), (req, res, next) =>
  controller.getAgencies(req, res, next)
);
router.get('/agencies/:id', (req, res, next) => controller.getAgencyById(req, res, next));
router.patch('/agencies/:id/status', validate(updateAgencyStatusSchema), (req, res, next) =>
  controller.updateAgencyStatus(req, res, next)
);

// Coordinators Directory
router.get('/coordinators', (req, res, next) => controller.getCoordinators(req, res, next));

// Referral Partners Directory
router.get('/partners', (req, res, next) => controller.getReferralPartners(req, res, next));

// Global Referrals Management
router.get('/referrals', validate(adminReferralQuerySchema, 'query'), (req, res, next) =>
  controller.getAllReferrals(req, res, next)
);

// Services Catalog Management
router.get('/services', (req, res, next) => controller.getAllServices(req, res, next));
router.post('/services', validate(adminServiceSchema), (req, res, next) =>
  controller.createService(req, res, next)
);

// KYC Document Review Workspace
router.get('/kyc/pending', (req, res, next) => controller.getPendingKycQueue(req, res, next));
router.patch('/kyc/:id/review', validate(reviewKycDocumentSchema), (req, res, next) =>
  controller.reviewKycDocument(req, res, next)
);

// Bank Account Verification Workspace
router.get('/banking', (req, res, next) => controller.getAllBankAccounts(req, res, next));
router.patch('/banking/:id/verify', validate(verifyBankSchema), (req, res, next) =>
  controller.verifyBankAccount(req, res, next)
);

// Commissions Ledger
router.get('/commissions', (req, res, next) => controller.getCommissionsLedger(req, res, next));

// Institutional Reports
router.get('/reports', (req, res, next) => controller.getPlatformReports(req, res, next));

// Audit Trail
router.get('/audit-logs', (req, res, next) => controller.getAuditLogs(req, res, next));

// Demo Personas Directory (Development Only)
router.get('/demo-personas', (req, res, next) => controller.getDemoPersonas(req, res, next));

export const adminRouter: Router = router;
