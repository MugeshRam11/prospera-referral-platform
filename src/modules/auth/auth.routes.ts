import { Router } from 'express';
import { Role } from '@prisma/client';
import { AuthController } from './auth.controller';
import { validateBody, authenticate, authorize } from '../../middleware';
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
} from './auth.schemas';

const router = Router();
const authController = new AuthController();

// Public Authentication Endpoints
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/verify-otp', validateBody(verifyOtpSchema), authController.verifyOtp);
router.post('/resend-otp', validateBody(resendOtpSchema), authController.resendOtp);
router.post('/login', validateBody(loginSchema), authController.login);

// Protected Session Endpoints (Requires valid session token)
router.post('/logout', authenticate, authController.logout);
router.post('/revoke-all-sessions', authenticate, authController.revokeAllSessions);
router.get('/me', authenticate, authController.me);

// Protected Role-Authorization Verification Endpoints (Deny-by-default)
router.get(
  '/admin-only',
  authenticate,
  authorize(Role.ADMIN),
  (_req, res) => {
    res.status(200).json({
      success: true,
      data: { message: 'Access granted: Authorized administrator resource' },
      timestamp: new Date().toISOString(),
    });
  }
);

router.get(
  '/coordinator-only',
  authenticate,
  authorize(Role.COORDINATOR, Role.ADMIN),
  (_req, res) => {
    res.status(200).json({
      success: true,
      data: { message: 'Access granted: Authorized coordinator resource' },
      timestamp: new Date().toISOString(),
    });
  }
);

router.get(
  '/partner-only',
  authenticate,
  authorize(Role.REFERRAL_PARTNER),
  (_req, res) => {
    res.status(200).json({
      success: true,
      data: { message: 'Access granted: Authorized referral partner resource' },
      timestamp: new Date().toISOString(),
    });
  }
);

export const authRouter = router;
