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
} from './admin.validation';
import { Role, AccountStatus } from '../../types';

const router = Router();
const controller = new AdminController();

// All Admin routes require authentication and strictly ADMIN role with ACTIVE status
router.use(authenticate);
router.use(authorize(Role.ADMIN, [AccountStatus.ACTIVE]));

// Overview Metrics
router.get('/overview', (req, res, next) => controller.getOverview(req, res, next));

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

// KYC Document Review Workspace
router.get('/kyc/pending', (req, res, next) => controller.getPendingKycQueue(req, res, next));
router.patch('/kyc/:id/review', validate(reviewKycDocumentSchema), (req, res, next) =>
  controller.reviewKycDocument(req, res, next)
);

// Bank Account Verification
router.patch('/banking/:id/verify', validate(verifyBankSchema), (req, res, next) =>
  controller.verifyBankAccount(req, res, next)
);

// Session Revocation
router.post('/users/:id/revoke-sessions', (req, res, next) =>
  controller.revokeUserSessions(req, res, next)
);

// Audit Trail
router.get('/audit-logs', (req, res, next) => controller.getAuditLogs(req, res, next));

export const adminRouter = router;
