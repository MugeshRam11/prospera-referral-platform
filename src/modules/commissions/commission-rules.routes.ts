import { Router, Request, Response, NextFunction } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize, validateBody } from '../../middleware';
import { prisma } from '../../lib/prisma';

const router = Router();

const commissionRuleSchema = z.object({
  serviceId: z.string().uuid().optional().nullable(),
  propertyListingId: z.string().uuid().optional().nullable(),
  ruleName: z.string().trim().min(2).max(255),
  ruleType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  minDealValue: z.coerce.number().nonnegative().default(0),
  maxDealValue: z.coerce.number().positive().optional().nullable(),
  partnerCommissionBps: z.coerce.number().int().min(0).max(5000).default(0),
  agentCommissionBps: z.coerce.number().int().min(0).max(5000).default(0),
  fixedPartnerAmount: z.coerce.number().nonnegative().optional().nullable(),
  fixedAgentAmount: z.coerce.number().nonnegative().optional().nullable(),
  eligibilityConditions: z.string().max(1500).optional().nullable(),
  requiresApproval: z.boolean().default(true),
  validFrom: z.string().min(4),
  validUntil: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

router.use(authenticate);
router.use(authorize([Role.ADMIN]));

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.commissionRule.findMany({
      include: { service: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
});

router.post('/', validateBody(commissionRuleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const d = req.body;
    const rule = await prisma.commissionRule.create({
      data: {
        serviceId: d.serviceId ?? null,
        propertyListingId: d.propertyListingId ?? null,
        ruleName: d.ruleName,
        ruleType: d.ruleType,
        minDealValue: new Prisma.Decimal(d.minDealValue.toString()),
        maxDealValue: d.maxDealValue != null ? new Prisma.Decimal(d.maxDealValue.toString()) : null,
        partnerCommissionBps: d.partnerCommissionBps,
        agentCommissionBps: d.agentCommissionBps,
        fixedPartnerAmount: d.fixedPartnerAmount != null ? new Prisma.Decimal(d.fixedPartnerAmount.toString()) : null,
        fixedAgentAmount: d.fixedAgentAmount != null ? new Prisma.Decimal(d.fixedAgentAmount.toString()) : null,
        eligibilityConditions: d.eligibilityConditions ?? null,
        requiresApproval: d.requiresApproval,
        version: 1,
        validFrom: new Date(d.validFrom),
        validUntil: d.validUntil ? new Date(d.validUntil) : null,
        isActive: d.isActive,
        updatedById: req.user!.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.id,
        entityType: 'COMMISSION_RULE',
        entityId: rule.id,
        action: 'COMMISSION_RULE_CREATED',
        newValues: { ruleName: rule.ruleName, version: 1, ruleType: rule.ruleType },
      },
    });

    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validateBody(commissionRuleSchema.partial()), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const existing = await prisma.commissionRule.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Commission rule not found' } });
      return;
    }

    const d = req.body;
    const updated = await prisma.commissionRule.update({
      where: { id },
      data: {
        ...(d.ruleName !== undefined && { ruleName: d.ruleName }),
        ...(d.ruleType !== undefined && { ruleType: d.ruleType }),
        ...(d.partnerCommissionBps !== undefined && { partnerCommissionBps: d.partnerCommissionBps }),
        ...(d.agentCommissionBps !== undefined && { agentCommissionBps: d.agentCommissionBps }),
        ...(d.fixedPartnerAmount !== undefined && {
          fixedPartnerAmount: d.fixedPartnerAmount != null ? new Prisma.Decimal(d.fixedPartnerAmount.toString()) : null,
        }),
        ...(d.fixedAgentAmount !== undefined && {
          fixedAgentAmount: d.fixedAgentAmount != null ? new Prisma.Decimal(d.fixedAgentAmount.toString()) : null,
        }),
        ...(d.eligibilityConditions !== undefined && { eligibilityConditions: d.eligibilityConditions }),
        ...(d.requiresApproval !== undefined && { requiresApproval: d.requiresApproval }),
        ...(d.isActive !== undefined && { isActive: d.isActive }),
        ...(d.validUntil !== undefined && { validUntil: d.validUntil ? new Date(d.validUntil) : null }),
        version: { increment: 1 },
        updatedById: req.user!.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.id,
        entityType: 'COMMISSION_RULE',
        entityId: id,
        action: 'COMMISSION_RULE_UPDATED',
        oldValues: {
          version: existing.version,
          partnerCommissionBps: existing.partnerCommissionBps,
          agentCommissionBps: existing.agentCommissionBps,
          isActive: existing.isActive,
        },
        newValues: {
          version: updated.version,
          partnerCommissionBps: updated.partnerCommissionBps,
          agentCommissionBps: updated.agentCommissionBps,
          isActive: updated.isActive,
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export const commissionRulesRouter: Router = router;
