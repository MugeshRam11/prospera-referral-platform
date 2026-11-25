import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize, validateBody } from '../../middleware';
import { prisma } from '../../lib/prisma';
import { ALLOWED_CRM_STAGES, leadratAdapter } from './leadrat.adapter';

const router = Router();

const inboundWebhookSchema = z.object({
  eventId: z.string().min(1).max(120),
  crmLeadId: z.string().max(128).optional(),
  prosperaReference: z.string().max(32).optional(),
  crmStage: z.enum(ALLOWED_CRM_STAGES),
}).refine((d) => Boolean(d.crmLeadId || d.prosperaReference), {
  message: 'Either crmLeadId or prosperaReference is required',
});

router.get(
  '/status',
  authenticate,
  authorize([Role.ADMIN]),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await leadratAdapter.getIntegrationStatus();
      res.json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/events',
  authenticate,
  authorize([Role.ADMIN]),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const events = await prisma.crmSyncEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json({ success: true, data: events });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/referrals/:id/sync',
  authenticate,
  authorize([Role.ADMIN, Role.COORDINATOR]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const event = await leadratAdapter.enqueueAndSyncLead(id, req.user?.id);
      res.json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/events/:id/retry',
  authenticate,
  authorize([Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eventId = String(req.params.id);
      const existing = await prisma.crmSyncEvent.findUnique({ where: { id: eventId } });
      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sync event not found' } });
        return;
      }
      const event = await leadratAdapter.enqueueAndSyncLead(existing.leadId, req.user?.id);
      res.json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/leadrat/webhook',
  validateBody(inboundWebhookSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sig = req.header('x-leadrat-signature');
      if (!leadratAdapter.verifyWebhookSignature(JSON.stringify(req.body), sig)) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid webhook signature' } });
        return;
      }
      const event = await leadratAdapter.handleInboundStageUpdate(req.body);
      res.json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  }
);

export const integrationsRouter: Router = router;
