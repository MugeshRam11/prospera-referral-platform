import { Router } from 'express';
import { BankingController } from './banking.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createBankAccountSchema } from './banking.validation';
import { uploadMiddleware } from '../../lib/documentStorage';
import { Role, AccountStatus } from '../../types';

const router = Router();
const controller = new BankingController();

const allRoles = [Role.REFERRAL_PARTNER, Role.AGENT, Role.COORDINATOR, Role.ADMIN];
const onboardingStatuses = [
  AccountStatus.ACTIVE,
  AccountStatus.PENDING_APPROVAL,
  AccountStatus.PENDING_VERIFICATION,
];

router.use(authenticate);

router.get(
  '/accounts',
  authorize(allRoles, onboardingStatuses),
  (req, res, next) => controller.getBankAccounts(req, res, next)
);

router.post(
  '/accounts',
  authorize(allRoles, onboardingStatuses),
  uploadMiddleware.single('confirmationDoc'),
  validate(createBankAccountSchema),
  (req, res, next) => controller.addBankAccount(req, res, next)
);

router.delete(
  '/accounts/:id',
  authorize(allRoles, onboardingStatuses),
  (req, res, next) => controller.deleteBankAccount(req, res, next)
);

export const bankingRouter = router;
