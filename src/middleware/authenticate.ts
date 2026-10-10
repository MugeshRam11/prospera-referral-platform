import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../modules/auth/auth.service';
import { ApiResponse } from '../types';

const authService = new AuthService();

export const authenticate = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  let sessionToken: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    sessionToken = authHeader.substring(7).trim();
  } else if (req.headers['x-session-token']) {
    sessionToken = String(req.headers['x-session-token']).trim();
  }

  if (!sessionToken) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required: Missing session authorization token',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const sessionContext = await authService.validateSession(sessionToken);

    if (!sessionContext) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Session is invalid, expired, or revoked',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    req.user = {
      id: sessionContext.user.id,
      email: sessionContext.user.email,
      fullName: sessionContext.user.fullName,
      phone: sessionContext.user.phone,
      role: sessionContext.user.role,
      accountStatus: sessionContext.user.accountStatus,
      companyName: sessionContext.user.companyName,
      referralCode: sessionContext.user.referralCode,
      emailVerifiedAt: sessionContext.user.emailVerifiedAt,
    };

    req.session = {
      id: sessionContext.session.id,
      userId: sessionContext.session.userId,
      expiresAt: sessionContext.session.expiresAt,
      lastActiveAt: sessionContext.session.lastActiveAt,
    };

    next();
  } catch (error) {
    next(error);
  }
};
