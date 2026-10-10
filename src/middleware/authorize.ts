import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiResponse } from '../types';

/**
 * Deny-by-default role-based access control middleware.
 * If user is unauthenticated or their role is not explicitly allowed, returns 403 Forbidden.
 */
export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required before checking permissions',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          message: `Access denied: Role '${req.user.role}' is not authorized for this resource`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};
