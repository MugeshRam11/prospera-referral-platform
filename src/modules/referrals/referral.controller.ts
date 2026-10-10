import { Request, Response, NextFunction } from 'express';
import { ReferralService } from './referral.service';
import { ListReferralsQuery } from './referral.schemas';
import { ApiResponse } from '../../types';

export class ReferralController {
  private service: ReferralService;

  constructor(service?: ReferralService) {
    this.service = service ?? new ReferralService();
  }

  create = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.createReferral(req.body, req.user!);
      res.status(201).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listReferrals(
        req.query as unknown as ListReferralsQuery,
        req.user!
      );
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  getMyReferrals = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getMyReferrals(
        req.query as unknown as ListReferralsQuery,
        req.user!
      );
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.service.getReferralById(id, req.user!);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.service.updateReferral(id, req.body, req.user!);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  transitionStatus = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.service.transitionStatus(id, req.body, req.user!);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  assign = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.service.assignReferral(id, req.body, req.user!);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.service.getReferralHistory(id, req.user!);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };
}
