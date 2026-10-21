import { Request, Response, NextFunction } from 'express';
import { ProfileService } from './profile.service';
import { ApiResponse } from '../../types';

const profileService = new ProfileService();

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : Array.isArray(ua) ? ua[0] : undefined;
}

export class ProfileController {
  public async getProfile(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const profile = await profileService.getProfile(userId);

      res.status(200).json({
        success: true,
        data: profile,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateProfile(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const profile = await profileService.updateProfile(
        userId,
        req.body,
        req.ip,
        getUserAgent(req)
      );

      res.status(200).json({
        success: true,
        data: profile,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async uploadAvatar(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { message: 'No image file uploaded' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await profileService.uploadAvatar(
        userId,
        req.file,
        req.ip,
        getUserAgent(req)
      );

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async requestAccountDeletion(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await profileService.requestAccountDeletion(userId, req.ip, getUserAgent(req));

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}
