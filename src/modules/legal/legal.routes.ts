import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, validateBody } from '../../middleware';
import { prisma } from '../../lib/prisma';

const router = Router();

export const LEGAL_DOCUMENTS = [
  {
    documentKey: 'GOVERNANCE_POLICY',
    title: 'Governance Policy',
    version: '2026-11-25-draft',
    status: 'PENDING_LEGAL_REVIEW',
    required: true,
    summary: 'Draft corporate governance and anti-self-dealing standards for Prospera participants.',
  },
  {
    documentKey: 'DATA_PROTECTION_POLICY',
    title: 'Data Protection Policy',
    version: '2026-11-25-draft',
    status: 'PENDING_LEGAL_REVIEW',
    required: true,
    summary: 'Draft UAE PDPL-aligned client consent, document privacy, and CRM transfer safeguards.',
  },
  {
    documentKey: 'REFERRAL_TERMS',
    title: 'Referral Terms & Conditions',
    version: '2026-11-25-draft',
    status: 'PENDING_LEGAL_REVIEW',
    required: true,
    summary: 'Draft conditional referral eligibility, milestone verification, and commission rules.',
  },
  {
    documentKey: 'PRIVACY_POLICY',
    title: 'Privacy Policy',
    version: '2026-11-25-draft',
    status: 'PENDING_LEGAL_REVIEW',
    required: true,
    summary: 'Draft platform privacy notice covering account, KYC, and referral data handling.',
  },
  {
    documentKey: 'REFERRAL_PARTNER_AGREEMENT',
    title: 'Referral Partner Agreement',
    version: '2026-11-25-draft',
    status: 'PENDING_LEGAL_REVIEW',
    required: false,
    summary: 'Draft partner agreement (pending formal legal review; distinct from client referral consent).',
  },
] as const;

const acceptSchema = z.object({
  documentKey: z.enum([
    'GOVERNANCE_POLICY',
    'DATA_PROTECTION_POLICY',
    'REFERRAL_TERMS',
    'PRIVACY_POLICY',
    'REFERRAL_PARTNER_AGREEMENT',
  ]),
  version: z.string().min(1).max(32),
});

router.get('/documents', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const acceptances = await prisma.legalDocumentAcceptance.findMany({
      where: { userId: req.user!.id },
      orderBy: { acceptedAt: 'desc' },
    });
    const docs = LEGAL_DOCUMENTS.map((doc) => {
      const accepted = acceptances.find(
        (a) => a.documentKey === doc.documentKey && a.version === doc.version
      );
      return {
        ...doc,
        accepted: Boolean(accepted),
        acceptedAt: accepted?.acceptedAt ?? null,
      };
    });
    res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
});

router.post('/accept', authenticate, validateBody(acceptSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = LEGAL_DOCUMENTS.find(
      (d) => d.documentKey === req.body.documentKey && d.version === req.body.version
    );
    if (!doc) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document version not found' } });
      return;
    }

    const record = await prisma.legalDocumentAcceptance.upsert({
      where: {
        userId_documentKey_version: {
          userId: req.user!.id,
          documentKey: doc.documentKey,
          version: doc.version,
        },
      },
      update: {},
      create: {
        userId: req.user!.id,
        documentKey: doc.documentKey,
        version: doc.version,
        required: doc.required,
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent')?.slice(0, 512) || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user!.id,
        entityType: 'LEGAL_DOCUMENT',
        entityId: record.id,
        action: 'LEGAL_DOCUMENT_ACCEPTED',
        newValues: { documentKey: doc.documentKey, version: doc.version, status: doc.status },
      },
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

export const legalRouter: Router = router;
