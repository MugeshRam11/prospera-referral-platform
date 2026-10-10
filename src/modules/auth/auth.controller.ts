import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../types';

export class AuthController {
  private authService: AuthService;

  constructor(authService?: AuthService) {
    this.authService = authService ?? new AuthService();
  }

  register = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body, req.ip);
      res.status(201).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  verifyOtp = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.verifyOtp(req.body);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  resendOtp = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.resendOtp(req.body, req.ip);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const clientInfo = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };
      const result = await this.authService.login(req.body, clientInfo);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      if (!req.session) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      await this.authService.logout(req.session.id);
      res.status(200).json({
        success: true,
        data: { message: 'Successfully logged out and session revoked' },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  revokeAllSessions = async (
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const count = await this.authService.revokeAllUserSessions(req.user.id);
      res.status(200).json({
        success: true,
        data: {
          message: 'All active sessions revoked successfully',
          revokedCount: count,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
        session: req.session,
      },
      timestamp: new Date().toISOString(),
    });
  };
}
