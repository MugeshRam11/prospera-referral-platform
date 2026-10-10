import { Request, Response, NextFunction } from 'express';
import { Role, AccountStatus, ApiResponse } from '../types';

/**
 * Deny-by-default role-based and account-status access control middleware (SEC-09).
 * - Enforces authentication
 * - Enforces role match
 * - Enforces account status (default requires ACTIVE, blocking unverified or pending accounts)
 */
export const authorize = (
  roles: Role | Role[],
  allowedStatuses: AccountStatus[] = [AccountStatus.ACTIVE]
) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

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

    // Role verification (deny-by-default)
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

    // Account status verification (SEC-09)
    if (!allowedStatuses.includes(req.user.accountStatus)) {
      res.status(403).json({
        success: false,
        error: {
          message: `Access denied: Account status '${req.user.accountStatus}' is not permitted to access this resource. Active approval required.`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};
