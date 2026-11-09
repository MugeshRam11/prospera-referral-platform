// ============================================================================
// INTEGRATION & COMPLIANCE TEST SUITE: REFERRAL SERVICE CATALOG & WIZARD
//
// Tests:
// 1. GET /api/v1/referrals/services - active catalog query with approved rates
// 2. Proving referral submission succeeds for EVERY active catalog service
// 3. Server-enforced duplicate detection (409 Conflict)
// 4. Access-controlled server-side drafts (LeadStatus.DRAFT)
// 5. Draft-to-SUBMITTED transition with duplicate validation
// 6. Agent submission rejection (403 Forbidden)
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { Role, AccountStatus, LeadStatus, Service } from '@prisma/client';
import {
  getReferralRepository,
  InMemoryReferralRepository,
} from '../src/modules/referrals/referral.repository';
import {
  getAuthRepository,
  InMemoryAuthRepository,
} from '../src/modules/auth/auth.repository';
import argon2 from 'argon2';

describe('Referral Service Catalog & Wizard Compliance Tests', () => {
  let repo: InMemoryReferralRepository;
  let authRepo: InMemoryAuthRepository;
  let seededServices: Service[] = [];
  const testPassword = 'TestPassword123!';

  const createTestUserSession = async (
    email: string,
    role: Role,
    accountStatus: AccountStatus = AccountStatus.ACTIVE,
    coordinatorId: string | null = null
  ) => {
    const passwordHash = await argon2.hash(testPassword);
    const user = await authRepo.createUser({
      email,
      fullName: `User ${email.split('@')[0]}`,
      passwordHash,
      role,
      accountStatus,
      coordinatorId,
    });

    repo.seedUser({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accountStatus: user.accountStatus,
      coordinatorId: user.coordinatorId,
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: testPassword });

    return {
      userId: user.id,
      token: loginRes.body.data.sessionToken as string,
    };
  };

  beforeEach(() => {
    repo = getReferralRepository() as InMemoryReferralRepository;
    authRepo = getAuthRepository() as InMemoryAuthRepository;
    repo.clearAll();
    authRepo.clearAll();

    // Seed comprehensive multi-sector service catalog with approved commission BPS
    seededServices = [
      repo.seedService({
        slug: 'uae-luxury-real-estate',
        name: 'UAE Luxury Real Estate',
        description: 'Prime residential and off-plan investments across Dubai & Abu Dhabi.',
        defaultPartnerCommissionBps: 200,
        defaultAgentCommissionBps: 150,
        isActive: true,
      }),
      repo.seedService({
        slug: 'mortgage-advisory',
        name: 'UAE Mortgage Financing',
        description: 'Competitive resident and non-resident home financing.',
        defaultPartnerCommissionBps: 75,
        defaultAgentCommissionBps: 50,
        isActive: true,
      }),
      repo.seedService({
        slug: 'uae-golden-visa',
        name: 'UAE Golden Visa Program',
        description: '10-Year investor and specialized talent residency processing.',
        defaultPartnerCommissionBps: 300,
        defaultAgentCommissionBps: 200,
        isActive: true,
      }),
      repo.seedService({
        slug: 'corporate-advisory',
        name: 'Corporate Advisory & SPVs',
        description: 'DIFC and ADGM SPV asset protection and entity setup.',
        defaultPartnerCommissionBps: 150,
        defaultAgentCommissionBps: 100,
        isActive: true,
      }),
      repo.seedService({
        slug: 'bank-account-opening',
        name: 'Corporate Bank Account Opening',
        description: 'Corporate banking facilitation with Tier-1 UAE banks.',
        defaultPartnerCommissionBps: 100,
        defaultAgentCommissionBps: 75,
        isActive: true,
      }),
      repo.seedService({
        slug: 'company-formation',
        name: 'Company Formation & Licensing',
        description: 'Mainland and Freezone commercial trade licensing.',
        defaultPartnerCommissionBps: 200,
        defaultAgentCommissionBps: 150,
        isActive: true,
      }),
    ];
  });

  describe('1. Active Service Catalog API', () => {
    it('should return all active services for authenticated partner', async () => {
      const { token } = await createTestUserSession('partner.cat@prospera.ae', Role.REFERRAL_PARTNER);

      const res = await request(app)
        .get('/api/v1/referrals/services')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(6);

      const slugs = res.body.data.map((s: Service) => s.slug);
      expect(slugs).toContain('uae-luxury-real-estate');
      expect(slugs).toContain('mortgage-advisory');
      expect(slugs).toContain('uae-golden-visa');
      expect(slugs).toContain('corporate-advisory');
      expect(slugs).toContain('bank-account-opening');
      expect(slugs).toContain('company-formation');
    });

    it('should deny unauthenticated requests to /services', async () => {
      const res = await request(app).get('/api/v1/referrals/services');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Proving Each Service Submits a Valid Referral', () => {
    it('should successfully submit a valid referral for EVERY active catalog service', async () => {
      const { token } = await createTestUserSession('partner.all@prospera.ae', Role.REFERRAL_PARTNER);

      // Iterate over every active service in the catalog
      for (let i = 0; i < seededServices.length; i++) {
        const srv = seededServices[i];
        const clientPhone = `+9715011122${i}0`;

        const res = await request(app)
          .post('/api/v1/referrals')
          .set('Authorization', `Bearer ${token}`)
          .send({
            serviceId: srv.id,
            clientName: `Client for ${srv.name}`,
            clientPhone,
            clientEmail: `client.${srv.slug}@test.com`,
            expectedDealValue: 500000 + i * 100000,
            currency: 'AED',
            notes: `[Service: ${srv.name}]\n[UAE PDPL Consent: Confirmed]\nClient interested in ${srv.name}`,
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.serviceId).toBe(srv.id);
        expect(res.body.data.status).toBe(LeadStatus.SUBMITTED);
        expect(res.body.data.referenceNo).toMatch(/^REF-\d{4}-\d+/);
        expect(Number(res.body.data.expectedDealValue)).toBe(500000 + i * 100000);
      }
    });
  });

  describe('3. Duplicate Prevention & Server Idempotency', () => {
    it('should prevent duplicate referral submission for same partner + phone in active status (409 Conflict)', async () => {
      const { token } = await createTestUserSession('partner.dup@prospera.ae', Role.REFERRAL_PARTNER);
      const srv = seededServices[0];
      const payload = {
        serviceId: srv.id,
        clientName: 'Sheikh Hamdan',
        clientPhone: '+971550099881',
        expectedDealValue: 2000000,
      };

      const firstRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
      expect(firstRes.status).toBe(201);

      // Duplicate attempt
      const dupRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.message).toContain('active referral already exists');
    });
  });

  describe('4. Server-Side Drafts & Transition Lifecycle', () => {
    it('should create an access-controlled draft referral when asDraft: true', async () => {
      const { token, userId } = await createTestUserSession('partner.draft@prospera.ae', Role.REFERRAL_PARTNER);
      const srv = seededServices[2];

      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: srv.id,
          clientName: 'Draft Investor',
          clientPhone: '+971509988776',
          expectedDealValue: 150000,
          notes: 'Unfinished draft for review',
          asDraft: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(LeadStatus.DRAFT);
      expect(res.body.data.partnerId).toBe(userId);
    });

    it('should transition referral from DRAFT to SUBMITTED', async () => {
      const { token } = await createTestUserSession('partner.transit@prospera.ae', Role.REFERRAL_PARTNER);
      const srv = seededServices[1];

      const draftRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: srv.id,
          clientName: 'Mortgage Incomplete Lead',
          clientPhone: '+971503344556',
          expectedDealValue: 800000,
          asDraft: true,
        });

      const leadId = draftRes.body.data.id;
      expect(draftRes.body.data.status).toBe(LeadStatus.DRAFT);

      // Finalize and submit draft
      const submitRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: LeadStatus.SUBMITTED,
          transitionNote: 'Completed all required fields and client PDPL consent',
        });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.status).toBe(LeadStatus.SUBMITTED);
    });

    it('should reject draft submission if duplicate active lead exists (409 Conflict)', async () => {
      const { token } = await createTestUserSession('partner.dupcheck@prospera.ae', Role.REFERRAL_PARTNER);
      const srv = seededServices[0];
      const conflictPhone = '+971507771234';

      // 1. Create active submitted lead
      await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: srv.id,
          clientName: 'Active Client',
          clientPhone: conflictPhone,
          expectedDealValue: 500000,
        });

      // 2. Create draft lead with same phone
      const draftRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: srv.id,
          clientName: 'Duplicate Draft Client',
          clientPhone: conflictPhone,
          expectedDealValue: 500000,
          asDraft: true,
        });
      expect(draftRes.status).toBe(201);
      const draftId = draftRes.body.data.id;

      // 3. Attempt to transition draft to SUBMITTED
      const submitRes = await request(app)
        .patch(`/api/v1/referrals/${draftId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: LeadStatus.SUBMITTED });

      expect(submitRes.status).toBe(409);
      expect(submitRes.body.error.message).toContain('active referral already exists');
    });
  });

  describe('5. Agent Referral Submission & Coordinator Triage Boundaries', () => {
    it('should PERMIT AGENT to create referrals with valid status', async () => {
      const { token } = await createTestUserSession('agent.attempt@prospera.ae', Role.AGENT);

      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: seededServices[0].id,
          clientName: 'Direct Broker Referral',
          clientPhone: '+971501239876',
          expectedDealValue: 1000000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(LeadStatus.SUBMITTED);
    });

    it('should DENY COORDINATOR from creating referrals (403 Forbidden)', async () => {
      const { token } = await createTestUserSession('coord.attempt@prospera.ae', Role.COORDINATOR);

      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: seededServices[0].id,
          clientName: 'Coordinator Referral Attempt',
          clientPhone: '+971509988776',
          expectedDealValue: 500000,
        });

      expect(res.status).toBe(403);
    });
  });
});

