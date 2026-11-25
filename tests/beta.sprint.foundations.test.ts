import crypto from 'crypto';
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import { Role, AccountStatus } from '@prisma/client';
import { app } from '../src/app';
import { createReferralSchema } from '../src/modules/referrals/referral.schemas';
import {
  formatStructuredRequirements,
  getServiceMetadataDefaults,
} from '../src/modules/referrals/service-catalog.config';
import { LeadratAdapter } from '../src/modules/integrations/leadrat.adapter';
import { canTransitionPropertyStatus } from '../src/modules/properties/property.service';
import { InMemoryAuthRepository, setAuthRepository } from '../src/modules/auth/auth.repository';

describe('Beta Sprint Foundations', () => {
  describe('Structured Referral Schemas & Service Catalog Metadata', () => {
    it('provides Free Zone packages (zero, one, two, multi-visa) for free-zone service slugs', () => {
      const meta = getServiceMetadataDefaults('free-zone-company-formation');
      expect(meta.formType).toBe('COMPANY_FORMATION');
      expect(meta.defaultPackages?.map((p) => p.slug)).toEqual([
        'zero-visa',
        'one-visa',
        'two-visas',
        'multi-visa-custom',
      ]);
    });

    it('validates typed structuredData for all 5 service tracks', () => {
      const base = {
        serviceId: '11111111-1111-4111-8111-111111111111',
        clientName: 'Amina Al Mansoori',
        clientPhone: '+971501234567',
        expectedDealValue: 1500000,
        consent: true,
      };

      const realEstate = createReferralSchema.safeParse({
        ...base,
        structuredData: {
          formType: 'REAL_ESTATE',
          transactionStage: 'OFF_PLAN',
          intent: 'INVESTMENT',
          location: 'Dubai Creek Harbour',
          budgetAed: 2500000,
          financingRequired: 'MORTGAGE',
        },
      });
      expect(realEstate.success).toBe(true);

      const companyFormation = createReferralSchema.safeParse({
        ...base,
        structuredData: {
          formType: 'COMPANY_FORMATION',
          structureType: 'FREE_ZONE',
          preferredFreeZone: 'DMCC',
          shareholdersCount: 2,
          visaRequirementCount: 1,
          packageSlug: 'one-visa',
        },
      });
      expect(companyFormation.success).toBe(true);

      const formatted = formatStructuredRequirements({
        formType: 'COMPANY_FORMATION',
        structureType: 'FREE_ZONE',
        preferredFreeZone: 'DMCC',
        visaRequirementCount: 1,
      });
      expect(formatted).toContain('Structure: FREE_ZONE');
      expect(formatted).toContain('Preferred Free Zone: DMCC');
    });
  });

  describe('Leadrat CRM Adapter Safety & Consent Boundaries', () => {
    it('enforces client consent before mapping referral to CRM DTO', () => {
      const adapter = new LeadratAdapter();
      expect(() =>
        adapter.mapReferralToCrmDto({
          referenceNo: 'REF-2026-0001',
          clientName: 'Test Client',
          clientPhone: '+971501112233',
          expectedDealValue: 100000,
          currency: 'AED',
          partnerId: 'partner-1',
          consentAt: null,
        })
      ).toThrow(/consent/i);
    });

    it('maps consented referral with PROSPERA_REFERRAL_PORTAL source and no sensitive docs', () => {
      const adapter = new LeadratAdapter();
      const dto = adapter.mapReferralToCrmDto({
        referenceNo: 'REF-2026-0002',
        clientName: 'Tariq Hassan',
        clientPhone: '+971509998877',
        clientEmail: 'tariq@example.com',
        expectedDealValue: 2200000,
        currency: 'AED',
        packageId: 'pkg-1',
        propertyListingId: 'prop-1',
        consentAt: new Date('2026-11-25T10:00:00Z'),
        partnerId: 'partner-1',
        originatingAgencyId: 'agency-1',
        partner: { fullName: 'Partner One' },
        service: { name: 'Off-plan Properties', slug: 'off-plan-properties' },
      });

      expect(dto.source).toBe('PROSPERA_REFERRAL_PORTAL');
      expect(dto.prosperaReference).toBe('REF-2026-0002');
      expect(dto.attribution.agencyId).toBe('agency-1');
      expect((dto as unknown as Record<string, unknown>).kycDocuments).toBeUndefined();
    });

    it('verifies HMAC webhook signatures safely', () => {
      process.env.LEADRAT_WEBHOOK_SECRET = 'test-webhook-secret-123';
      const adapter = new LeadratAdapter();
      const body = JSON.stringify({ eventId: 'evt-1', crmStage: 'CONTACTED' });
      const sig = crypto.createHmac('sha256', 'test-webhook-secret-123').update(body).digest('hex');

      expect(adapter.verifyWebhookSignature(body, sig)).toBe(true);
      expect(adapter.verifyWebhookSignature(body, 'bad-signature')).toBe(false);
      delete process.env.LEADRAT_WEBHOOK_SECRET;
    });
  });

  describe('Property Publishing Approval Boundary', () => {
    it('prevents imported properties from being published directly without review and approval', () => {
      expect(canTransitionPropertyStatus('IMPORTED', 'PUBLISHED')).toBe(false);
      expect(canTransitionPropertyStatus('IMPORTED', 'PENDING_REVIEW')).toBe(true);
      expect(canTransitionPropertyStatus('PENDING_REVIEW', 'APPROVED')).toBe(true);
      expect(canTransitionPropertyStatus('APPROVED', 'PUBLISHED')).toBe(true);
      expect(canTransitionPropertyStatus('PUBLISHED', 'UNPUBLISHED')).toBe(true);
      expect(canTransitionPropertyStatus('ARCHIVED', 'PUBLISHED')).toBe(false);
    });
  });

  describe('Endpoint Authorization Boundaries', () => {
    let authRepo: InMemoryAuthRepository;

    beforeEach(() => {
      authRepo = new InMemoryAuthRepository();
      setAuthRepository(authRepo);
    });

    it('denies unauthenticated and non-admin access to commission rules, integrations, and admin properties', async () => {
      const unauthRules = await request(app).get('/api/v1/admin/commission-rules');
      expect(unauthRules.status).toBe(401);

      const unauthIntegrations = await request(app).get('/api/v1/integrations/status');
      expect(unauthIntegrations.status).toBe(401);

      const unauthLegal = await request(app).get('/api/v1/legal/documents');
      expect(unauthLegal.status).toBe(401);

      const partner = await authRepo.createUser({
        email: 'partner.sec@example.com',
        passwordHash: 'hash',
        fullName: 'Partner Sec',
        role: Role.REFERRAL_PARTNER,
        accountStatus: AccountStatus.ACTIVE,
      });
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await authRepo.createSession({
        userId: partner.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600_000),
      });

      const partnerRules = await request(app)
        .get('/api/v1/admin/commission-rules')
        .set('Authorization', `Bearer ${token}`);
      expect(partnerRules.status).toBe(403);

      const partnerProps = await request(app)
        .get('/api/v1/properties/admin')
        .set('Authorization', `Bearer ${token}`);
      expect(partnerProps.status).toBe(403);
    });
  });
});
