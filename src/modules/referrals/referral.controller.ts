import { Request, Response, NextFunction } from 'express';
import { AppError } from '../auth/auth.service';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ReferralService } from './referral.service';
import { ListReferralsQuery } from './referral.schemas';
import { ApiResponse } from '../../types';

export class ReferralController {
  private service: ReferralService;

  constructor(service?: ReferralService) {
    this.service = service ?? new ReferralService();
  }

  private async operationsLead(req: Request) {
    const lead = await this.service.getReferralById(String(req.params.id), req.user!);
    if (lead.status === 'DRAFT' || (req.user!.role === 'AGENT' && lead.agentId !== req.user!.id)) {
      throw new AppError(403, 'Internal follow-ups are restricted to the handling team');
    }
    return lead;
  }

  followUps = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lead = await this.operationsLead(req);
      const data = await prisma.auditLog.findMany({
        where: { entityType: 'LEAD', entityId: lead.id, action: 'REFERRAL_FOLLOW_UP' },
        select: { id: true, createdAt: true, newValues: true }, orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  };

  recordFollowUp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lead = await this.operationsLead(req);
      if (['WON', 'LOST', 'CANCELLED'].includes(lead.status)) throw new AppError(409, 'This referral is closed');
      await prisma.$transaction(async tx => {
        await tx.lead.update({ where: { id: lead.id, revision: lead.revision }, data: { revision: { increment: 1 } } });
        await tx.auditLog.create({ data: {
          entityType: 'LEAD', entityId: lead.id, actorUserId: req.user!.id,
          action: 'REFERRAL_FOLLOW_UP', newValues: req.body,
        } });
      });
      res.status(201).json({ success: true, data: { saved: true } });
    } catch (err) { next(err); }
  };

  upcomingFollowUps = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scope = req.user!.role === 'ADMIN' ? Prisma.empty :
        Prisma.sql`AND (l.coordinator_id IS NULL OR l.coordinator_id = ${req.user!.id}::uuid)`;
      const data = await prisma.$queryRaw`
        SELECT * FROM (
          SELECT DISTINCT ON (l.id) l.id, l.reference_no AS "referenceNo",
            a.new_values->>'nextAction' AS "nextAction", a.new_values->>'due' AS due
          FROM audit_logs a JOIN leads l ON a.entity_id = l.id::text
          WHERE a.entity_type = 'LEAD' AND a.action = 'REFERRAL_FOLLOW_UP'
            AND l.status NOT IN ('DRAFT', 'WON', 'LOST', 'CANCELLED') ${scope}
          ORDER BY l.id, a.created_at DESC, a.id DESC
        ) tasks ORDER BY due, id LIMIT 50
      `;
      res.json({ success: true, data });
    } catch (err) { next(err); }
  };

  commissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await prisma.commissionLedgerEntry.findMany({
        where: { recipientUserId: req.user!.id, status: 'AVAILABLE', availableAt: { lte: new Date() } },
        select: { id: true, entryType: true, currency: true, amount: true, availableAt: true, lead: { select: { referenceNo: true } } },
        orderBy: { availableAt: 'desc' }, take: 100,
      });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  };

  reviewAgencyReferral = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.reviewAgencyReferral(String(req.params.id), req.body, req.user!);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  };

  assignees = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await prisma.user.findMany({
        where: { role: 'AGENT', agentType: 'INDEPENDENT', accountStatus: 'ACTIVE' },
        select: { id: true, fullName: true }, orderBy: { fullName: 'asc' },
      });
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (err) { next(err); }
  };

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

  getServices = async (_req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getServices();
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
