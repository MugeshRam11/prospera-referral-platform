import crypto from 'crypto';
import { prisma } from '../../lib/prisma';

export interface LeadratOutboundDto {
  prosperaReference: string;
  source: 'PROSPERA_REFERRAL_PORTAL';
  serviceName: string;
  serviceSlug: string;
  packageId: string | null;
  propertyListingId: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  expectedDealValue: string;
  currency: string;
  attribution: {
    partnerId: string;
    partnerName: string | null;
    agencyId: string | null;
  };
}

export const ALLOWED_CRM_STAGES = [
  'CRM_LEAD_ACCEPTED',
  'CONTACT_ATTEMPTED',
  'CONTACTED',
  'QUALIFICATION_PENDING',
  'DOCUMENTS_REQUESTED',
  'CONSULTATION_SCHEDULED',
  'PROPOSAL_SUBMITTED',
  'WON',
  'LOST',
] as const;

export type AllowedCrmStage = (typeof ALLOWED_CRM_STAGES)[number];

export class LeadratAdapter {
  private get apiUrl(): string | undefined {
    return process.env.LEADRAT_API_URL?.trim() || undefined;
  }

  private get apiKey(): string | undefined {
    return process.env.LEADRAT_API_KEY?.trim() || undefined;
  }

  private get webhookSecret(): string | undefined {
    return process.env.LEADRAT_WEBHOOK_SECRET?.trim() || undefined;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiUrl && this.apiKey);
  }

  public mapReferralToCrmDto(lead: {
    referenceNo: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string | null;
    expectedDealValue: { toString(): string } | number;
    currency: string;
    packageId?: string | null;
    propertyListingId?: string | null;
    consentAt?: Date | null;
    partnerId: string;
    originatingAgencyId?: string | null;
    partner?: { fullName?: string | null } | null;
    service?: { name?: string | null; slug?: string | null } | null;
  }): LeadratOutboundDto {
    if (!lead.consentAt) {
      throw new Error('Client consent is required before syncing referral data to CRM.');
    }

    return {
      prosperaReference: lead.referenceNo,
      source: 'PROSPERA_REFERRAL_PORTAL',
      serviceName: lead.service?.name || 'Prospera Service',
      serviceSlug: lead.service?.slug || 'general',
      packageId: lead.packageId ?? null,
      propertyListingId: lead.propertyListingId ?? null,
      clientName: lead.clientName,
      clientPhone: lead.clientPhone,
      clientEmail: lead.clientEmail ?? null,
      expectedDealValue: lead.expectedDealValue.toString(),
      currency: lead.currency || 'AED',
      attribution: {
        partnerId: lead.partnerId,
        partnerName: lead.partner?.fullName ?? null,
        agencyId: lead.originatingAgencyId ?? null,
      },
    };
  }

  public verifyWebhookSignature(rawBody: string, signatureHeader?: string): boolean {
    if (!this.webhookSecret || !signatureHeader) return false;
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const actualBuf = Buffer.from(signatureHeader);
    const expectedBuf = Buffer.from(expected);
    if (actualBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(actualBuf, expectedBuf);
  }

  public async enqueueAndSyncLead(leadId: string, actorUserId?: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        partner: { select: { fullName: true } },
        service: { select: { name: true, slug: true } },
      },
    });
    if (!lead) {
      throw Object.assign(new Error('Referral not found'), { statusCode: 404 });
    }
    if (!lead.consentAt) {
      throw Object.assign(new Error('Client consent record is required prior to CRM sync'), { statusCode: 400 });
    }

    const idempotencyKey = `outbound-lead-create:${lead.id}`;
    const dto = this.mapReferralToCrmDto(lead);

    const existing = await prisma.crmSyncEvent.findUnique({ where: { idempotencyKey } });
    if (existing && existing.status === 'SUCCEEDED') {
      return existing;
    }

    const event = existing
      ? await prisma.crmSyncEvent.update({
          where: { id: existing.id },
          data: { status: 'PROCESSING', attempts: { increment: 1 }, payload: dto as object },
        })
      : await prisma.crmSyncEvent.create({
          data: {
            leadId: lead.id,
            direction: 'OUTBOUND',
            eventType: 'LEAD_CREATE',
            idempotencyKey,
            status: 'PROCESSING',
            attempts: 1,
            payload: dto as object,
          },
        });

    if (!this.isConfigured()) {
      const updated = await prisma.crmSyncEvent.update({
        where: { id: event.id },
        data: {
          status: 'PENDING',
          nextRetryAt: new Date(Date.now() + 15 * 60 * 1000),
          errorMessage: 'Leadrat API credentials and verified endpoint are not configured in this environment.',
        },
      });
      await prisma.lead.update({
        where: { id: lead.id },
        data: { crmSyncStatus: 'PENDING_CONFIGURATION' },
      });
      return updated;
    }

    try {
      const resp = await fetch(`${this.apiUrl}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(dto),
      });

      if (!resp.ok) {
        const backoffMinutes = Math.min(60, Math.pow(2, event.attempts));
        const failed = await prisma.crmSyncEvent.update({
          where: { id: event.id },
          data: {
            status: resp.status === 429 || resp.status >= 500 ? 'FAILED' : 'DEAD_LETTER',
            nextRetryAt: new Date(Date.now() + backoffMinutes * 60 * 1000),
            errorMessage: `CRM provider returned HTTP ${resp.status}`,
          },
        });
        await prisma.lead.update({
          where: { id: lead.id },
          data: { crmSyncStatus: 'SYNC_FAILED' },
        });
        return failed;
      }

      const body = (await resp.json().catch(() => ({}))) as { id?: string; leadId?: string };
      const crmLeadId = body.id || body.leadId || null;

      const succeeded = await prisma.crmSyncEvent.update({
        where: { id: event.id },
        data: {
          status: 'SUCCEEDED',
          externalId: crmLeadId,
          responseSummary: { accepted: true, crmLeadId },
          errorMessage: null,
        },
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          crmLeadId,
          crmSyncStatus: 'SYNCED',
          crmLastSyncedAt: new Date(),
        },
      });

      if (actorUserId) {
        await prisma.auditLog.create({
          data: {
            actorUserId,
            entityType: 'LEAD',
            entityId: lead.id,
            action: 'CRM_OUTBOUND_SYNC',
            newValues: { crmLeadId, status: 'SYNCED' },
          },
        });
      }

      return succeeded;
    } catch {
      const backoffMinutes = Math.min(60, Math.pow(2, event.attempts));
      const failed = await prisma.crmSyncEvent.update({
        where: { id: event.id },
        data: {
          status: 'FAILED',
          nextRetryAt: new Date(Date.now() + backoffMinutes * 60 * 1000),
          errorMessage: 'Network failure communicating with CRM provider.',
        },
      });
      await prisma.lead.update({
        where: { id: lead.id },
        data: { crmSyncStatus: 'SYNC_FAILED' },
      });
      return failed;
    }
  }

  public async handleInboundStageUpdate(input: {
    crmLeadId?: string;
    prosperaReference?: string;
    crmStage: AllowedCrmStage;
    eventId: string;
  }) {
    const lead = await prisma.lead.findFirst({
      where: input.crmLeadId
        ? { crmLeadId: input.crmLeadId }
        : { referenceNo: input.prosperaReference },
    });
    if (!lead) {
      throw Object.assign(new Error('Matching Prospera referral not found'), { statusCode: 404 });
    }

    const idempotencyKey = `inbound:${input.eventId}`;
    const existing = await prisma.crmSyncEvent.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;

    const event = await prisma.crmSyncEvent.create({
      data: {
        leadId: lead.id,
        direction: 'INBOUND',
        eventType: 'CRM_STAGE_UPDATE',
        idempotencyKey,
        status: 'SUCCEEDED',
        attempts: 1,
        externalId: input.crmLeadId ?? lead.crmLeadId,
        payload: { crmStage: input.crmStage },
      },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        crmStage: input.crmStage,
        crmLastSyncedAt: new Date(),
        crmSyncStatus: 'SYNCED',
      },
    });

    return event;
  }

  public async getIntegrationStatus() {
    const [totalEvents, pendingCount, failedCount, lastSuccess] = await Promise.all([
      prisma.crmSyncEvent.count(),
      prisma.crmSyncEvent.count({ where: { status: 'PENDING' } }),
      prisma.crmSyncEvent.count({ where: { status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
      prisma.crmSyncEvent.findFirst({
        where: { status: 'SUCCEEDED' },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

    return {
      provider: 'LEADRAT_CRM',
      configured: this.isConfigured(),
      webhookConfigured: Boolean(this.webhookSecret),
      propertyInventoryVerified: false,
      propertyInventoryBlocker:
        'Leadrat property inventory OpenAPI endpoint has not been provisioned; admin-approved catalog and manual import workflow active.',
      totalEvents,
      pendingCount,
      failedCount,
      lastSuccessfulSyncAt: lastSuccess?.updatedAt ?? null,
    };
  }
}

export const leadratAdapter = new LeadratAdapter();
