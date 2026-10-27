import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { ApiResponse, KycStatus, AccountStatus, AgencyStatus } from '../../types';
import { AgentQueryInput, AgencyQueryInput } from './admin.validation';

const adminService = new AdminService();

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : Array.isArray(ua) ? ua[0] : undefined;
}

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0];
  return param ?? '';
}

export class AdminController {
  public async getOverview(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getOverviewMetrics();
      res.status(200).json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async getAgents(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.getAgents(req.query as unknown as AgentQueryInput);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async getAgentById(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const agentId = getParam(req.params.id);
      const agent = await adminService.getAgentById(agentId);
      res.status(200).json({
        success: true,
        data: agent,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateAgentStatus(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const agentId = getParam(req.params.id);
      const adminId = req.user!.id;
      const { status, reason } = req.body;

      const result = await adminService.updateAgentStatus(
        agentId,
        status as AccountStatus,
        adminId,
        reason,
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

  public async getAgencies(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.getAgencies(req.query as unknown as AgencyQueryInput);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async getAgencyById(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const agencyId = getParam(req.params.id);
      const agency = await adminService.getAgencyById(agencyId);
      res.status(200).json({
        success: true,
        data: agency,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateAgencyStatus(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const agencyId = getParam(req.params.id);
      const adminId = req.user!.id;
      const { status, rejectionReason } = req.body;

      const result = await adminService.updateAgencyStatus(
        agencyId,
        status as AgencyStatus,
        adminId,
        rejectionReason,
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

  public async getPendingKycQueue(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

      const result = await adminService.getPendingKycQueue(page, limit);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async reviewKycDocument(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const documentId = getParam(req.params.id);
      const adminId = req.user!.id;
      const { status, rejectionReason } = req.body;

      const result = await adminService.reviewKycDocument(
        documentId,
        adminId,
        status as KycStatus,
        rejectionReason,
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

  public async verifyBankAccount(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const accountId = getParam(req.params.id);
      const adminId = req.user!.id;
      const { isVerified, rejectionReason } = req.body;

      const result = await adminService.verifyBankAccount(
        accountId,
        adminId,
        isVerified,
        rejectionReason,
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

  public async revokeUserSessions(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const targetUserId = getParam(req.params.id);
      const adminId = req.user!.id;

      const result = await adminService.revokeUserSessions(
        targetUserId,
        adminId,
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

  public async getAuditLogs(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const entityType = req.query.entityType as string | undefined;
      const actorUserId = req.query.actorUserId as string | undefined;

      const result = await adminService.getAuditLogs(page, limit, entityType, actorUserId);
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
