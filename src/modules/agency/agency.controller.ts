import { Request, Response, NextFunction } from 'express';
import { AgencyService } from './agency.service';
import { ApiResponse } from '../../types';

const agencyService = new AgencyService();

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : Array.isArray(ua) ? ua[0] : undefined;
}

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0];
  return param ?? '';
}

export class AgencyController {
  public async getMyAgency(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const data = await agencyService.getMyAgency(userId);

      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async registerAgency(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const agency = await agencyService.registerAgency(
        userId,
        req.body,
        req.ip,
        getUserAgent(req)
      );

      res.status(201).json({
        success: true,
        data: agency,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateAgency(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const agencyId = getParam(req.params.id);
      const updated = await agencyService.updateAgency(
        userId,
        agencyId,
        req.body,
        req.ip,
        getUserAgent(req)
      );

      res.status(200).json({
        success: true,
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async inviteAgent(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const agencyId = getParam(req.params.id);
      const invitation = await agencyService.inviteAgent(
        userId,
        agencyId,
        req.body,
        req.ip,
        getUserAgent(req)
      );

      res.status(201).json({
        success: true,
        data: invitation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async joinAgency(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { inviteToken } = req.body;
      const result = await agencyService.joinAgency(
        userId,
        inviteToken,
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

  public async removeMember(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const agencyId = getParam(req.params.id);
      const memberId = getParam(req.params.memberId);
      const result = await agencyService.removeMember(
        userId,
        agencyId,
        memberId,
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
}
