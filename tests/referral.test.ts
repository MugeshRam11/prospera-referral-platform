import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { Role, AccountStatus, LeadStatus } from '../src/types';
import { app } from '../src/app';
import { getAuthRepository, InMemoryAuthRepository } from '../src/modules/auth/auth.repository';
import { getReferralRepository, InMemoryReferralRepository } from '../src/modules/referrals/referral.repository';
import argon2 from 'argon2';

describe('Referral Management Module (Unit Tests with In-Memory Repository)', () => {
  const authRepo = getAuthRepository() as InMemoryAuthRepository;
  const referralRepo = getReferralRepository() as InMemoryReferralRepository;

  let activeServiceId: string;

  beforeEach(() => {
    if (typeof authRepo.clearAll === 'function') {
      authRepo.clearAll();
    }
    if (typeof referralRepo.clearAll === 'function') {
      referralRepo.clearAll();
    }

    // Seed a valid active service in repository
    const service = referralRepo.seedService({
      name: 'Dubai Golden Visa Assistance',
      slug: 'dubai-golden-visa',
      defaultPartnerCommissionBps: 250,
      defaultAgentCommissionBps: 150,
      isActive: true,
    });
    activeServiceId = service.id;
  });

  // Helper to create user and session token for testing
  async function createTestUserSession(
    email: string,
    role: Role,
    accountStatus: AccountStatus = AccountStatus.ACTIVE,
    coordinatorId: string | null = null
  ): Promise<{ userId: string; token: string }> {
    const passwordHash = await argon2.hash('Password123!');
    const user = await authRepo.createUser({
      email,
      passwordHash,
      fullName: `User ${email.split('@')[0]}`,
      role,
      accountStatus,
    });

    if (coordinatorId) {
      await authRepo.updateUser(user.id, { coordinatorId });
    }

    // Also mirror into referralRepo user lookup
    referralRepo.seedUser({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accountStatus: user.accountStatus,
      coordinatorId,
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await authRepo.createSession({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest/Agent',
    });

    return { userId: user.id, token };
  }

  // ==========================================================================
  // 1. REFERRAL CREATION TESTS
  // ==========================================================================
  describe('POST /api/v1/referrals (Creation & Validation)', () => {
    it('should allow active referral partner to create referral with SUBMITTED status', async () => {
      const { token } = await createTestUserSession('partner1@prospera.ae', Role.REFERRAL_PARTNER);

      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Ahmed Al Mansoori',
          clientEmail: 'ahmed@client.com',
          clientPhone: '+971501234567',
          expectedDealValue: 50000.0,
          currency: 'AED',
          notes: 'High net worth investor seeking Golden Visa',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.referenceNo).toMatch(/^REF-\d{4}-\d+/);
      expect(res.body.data.status).toBe(LeadStatus.SUBMITTED);
      expect(res.body.data.clientName).toBe('Ahmed Al Mansoori');
      expect(Number(res.body.data.expectedDealValue)).toBe(50000);
      expect(res.body.data.currency).toBe('AED');
      expect(res.body.data.serviceId).toBe(activeServiceId);
    });

    it('should auto-attribute partner coordinator when partner has assigned coordinator', async () => {
      const { userId: coordId } = await createTestUserSession('coord@prospera.ae', Role.COORDINATOR);
      const { token } = await createTestUserSession(
        'partner2@prospera.ae',
        Role.REFERRAL_PARTNER,
        AccountStatus.ACTIVE,
        coordId
      );

      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Rashid Khan',
          clientPhone: '+971509998877',
          expectedDealValue: 120000,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.coordinatorId).toBe(coordId);
    });

    it('should reject partner attempting to inject partnerId of another user', async () => {
      const { token: partnerToken, userId: actualPartnerId } = await createTestUserSession(
        'realpartner@prospera.ae',
        Role.REFERRAL_PARTNER
      );
      const { userId: victimId } = await createTestUserSession('victim@prospera.ae', Role.REFERRAL_PARTNER);

      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Client Attempt',
          clientPhone: '+971507777777',
          expectedDealValue: 30000,
          partnerId: victimId, // Attempted spoof
        });

      // The service forces partnerId to the authenticated partner
      expect(res.status).toBe(201);
      expect(res.body.data.partnerId).toBe(actualPartnerId);
      expect(res.body.data.partnerId).not.toBe(victimId);
    });

    it('should reject creation if client phone is already in an active lead for same partner (409 Conflict)', async () => {
      const { token } = await createTestUserSession('partner.dup@prospera.ae', Role.REFERRAL_PARTNER);

      const payload = {
        serviceId: activeServiceId,
        clientName: 'Duplicate Lead Client',
        clientPhone: '+971551112233',
        expectedDealValue: 25000,
      };

      const firstRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
      expect(firstRes.status).toBe(201);

      // Attempt duplicate submission with same phone
      const dupRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.error.message).toContain('active referral already exists');
    });

    it('should reject creation with invalid serviceId or inactive service (404)', async () => {
      const { token } = await createTestUserSession('partner.svc@prospera.ae', Role.REFERRAL_PARTNER);

      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: crypto.randomUUID(), // non-existent
          clientName: 'Valid Client',
          clientPhone: '+971501112222',
          expectedDealValue: 10000,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('service is invalid or inactive');
    });

    it('should reject negative or zero expectedDealValue with 400 Bad Request', async () => {
      const { token } = await createTestUserSession('partner.val@prospera.ae', Role.REFERRAL_PARTNER);

      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Invalid Deal Val',
          clientPhone: '+971501112222',
          expectedDealValue: -500, // Invalid
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('greater than zero');
    });

    it('should deny unapproved or pending partner from creating referral (403 Forbidden)', async () => {
      const { token } = await createTestUserSession(
        'pending.partner@prospera.ae',
        Role.REFERRAL_PARTNER,
        AccountStatus.PENDING_APPROVAL
      );

      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Client Name',
          clientPhone: '+971501234567',
          expectedDealValue: 10000,
        });

      expect(res.status).toBe(403);
    });

    it('should deny AGENT from creating referrals (403 Forbidden)', async () => {
      const { token } = await createTestUserSession('sales.agent@prospera.ae', Role.AGENT);

      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Agent Direct Intake',
          clientPhone: '+971501234567',
          expectedDealValue: 10000,
        });

      expect(res.status).toBe(403);
    });
  });

  // ==========================================================================
  // 2. RETRIEVAL & DATA ISOLATION TESTS
  // ==========================================================================
  describe('GET /api/v1/referrals/:id (Ownership & Cross-Tenant Access Denial)', () => {
    it('should allow partner to view their own referral by ID', async () => {
      const { token: partnerToken } = await createTestUserSession('p.owner@prospera.ae', Role.REFERRAL_PARTNER);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Owner Lead',
          clientPhone: '+971501110000',
          expectedDealValue: 75000,
        });

      const leadId = createRes.body.data.id;

      const getRes = await request(app)
        .get(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.id).toBe(leadId);
      expect(getRes.body.data.clientName).toBe('Owner Lead');
    });

    it('should DENY partner from viewing another partner referral (Cross-Tenant Isolation)', async () => {
      const { token: partnerAToken } = await createTestUserSession('partnerA@prospera.ae', Role.REFERRAL_PARTNER);
      const { token: partnerBToken } = await createTestUserSession('partnerB@prospera.ae', Role.REFERRAL_PARTNER);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerAToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Partner A Secret Lead',
          clientPhone: '+971501119999',
          expectedDealValue: 100000,
        });

      const leadId = createRes.body.data.id;

      // Partner B attempts to read Partner A's referral
      const spyRes = await request(app)
        .get(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${partnerBToken}`);

      expect(spyRes.status).toBe(404);
      expect(spyRes.body.error.message).toContain('Referral not found');
    });

    it('should deny AGENT from viewing referral not assigned to them', async () => {
      const { token: partnerToken } = await createTestUserSession('partner.unassigned@prospera.ae', Role.REFERRAL_PARTNER);
      const { token: agentToken } = await createTestUserSession('agent.unassigned@prospera.ae', Role.AGENT);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Unassigned Lead',
          clientPhone: '+971504443322',
          expectedDealValue: 40000,
        });

      const leadId = createRes.body.data.id;

      const agentRes = await request(app)
        .get(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(agentRes.status).toBe(404);
    });

    it('should allow ADMIN to view any referral', async () => {
      const { token: partnerToken } = await createTestUserSession('partner.lead@prospera.ae', Role.REFERRAL_PARTNER);
      const { token: adminToken } = await createTestUserSession('admin.super@prospera.ae', Role.ADMIN);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Admin Accessible Lead',
          clientPhone: '+971508881122',
          expectedDealValue: 80000,
        });

      const leadId = createRes.body.data.id;

      const adminRes = await request(app)
        .get(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.id).toBe(leadId);
    });
  });

  // ==========================================================================
  // 3. LISTING, FILTERING & PAGINATION
  // ==========================================================================
  describe('GET /api/v1/referrals (Listing & Data Isolation)', () => {
    it('should strictly filter listing to only authenticated partner own referrals', async () => {
      const { token: token1 } = await createTestUserSession('p1.list@prospera.ae', Role.REFERRAL_PARTNER);
      const { token: token2 } = await createTestUserSession('p2.list@prospera.ae', Role.REFERRAL_PARTNER);

      // Create 2 leads for Partner 1
      await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token1}`)
        .send({ serviceId: activeServiceId, clientName: 'P1 Client A', clientPhone: '+971501000001', expectedDealValue: 10000 });
      await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token1}`)
        .send({ serviceId: activeServiceId, clientName: 'P1 Client B', clientPhone: '+971501000002', expectedDealValue: 20000 });

      // Create 1 lead for Partner 2
      await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${token2}`)
        .send({ serviceId: activeServiceId, clientName: 'P2 Client C', clientPhone: '+971502000001', expectedDealValue: 30000 });

      // Partner 1 list
      const listRes1 = await request(app)
        .get('/api/v1/referrals')
        .set('Authorization', `Bearer ${token1}`);

      expect(listRes1.status).toBe(200);
      expect(listRes1.body.data.items.length).toBe(2);
      listRes1.body.data.items.forEach((item: { clientName: string }) => {
        expect(item.clientName).toContain('P1 Client');
      });

      // Partner 2 list
      const listRes2 = await request(app)
        .get('/api/v1/referrals')
        .set('Authorization', `Bearer ${token2}`);

      expect(listRes2.status).toBe(200);
      expect(listRes2.body.data.items.length).toBe(1);
      expect(listRes2.body.data.items[0].clientName).toBe('P2 Client C');
    });

    it('should support pagination and status filtering correctly', async () => {
      const { token: adminToken } = await createTestUserSession('admin.paged@prospera.ae', Role.ADMIN);
      const { token: partnerToken } = await createTestUserSession('partner.paged@prospera.ae', Role.REFERRAL_PARTNER);

      // Create 5 leads
      for (let i = 1; i <= 5; i++) {
        await request(app)
          .post('/api/v1/referrals')
          .set('Authorization', `Bearer ${partnerToken}`)
          .send({
            serviceId: activeServiceId,
            clientName: `Paged Client ${i}`,
            clientPhone: `+97150900000${i}`,
            expectedDealValue: 10000 * i,
          });
      }

      // Query page 1 with limit 2
      const page1Res = await request(app)
        .get('/api/v1/referrals?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(page1Res.status).toBe(200);
      expect(page1Res.body.data.items.length).toBe(2);
      expect(page1Res.body.data.pagination.page).toBe(1);
      expect(page1Res.body.data.pagination.limit).toBe(2);
      expect(page1Res.body.data.pagination.total).toBe(5);
      expect(page1Res.body.data.pagination.totalPages).toBe(3);

      // Filter by search query
      const searchRes = await request(app)
        .get('/api/v1/referrals?search=Client 3')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.items.length).toBe(1);
      expect(searchRes.body.data.items[0].clientName).toBe('Paged Client 3');
    });

    it('should return user own referrals on GET /api/v1/referrals/me', async () => {
      const { token: partnerToken } = await createTestUserSession('partner.me@prospera.ae', Role.REFERRAL_PARTNER);

      await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'My Direct Lead',
          clientPhone: '+971503332211',
          expectedDealValue: 15000,
        });

      const meRes = await request(app)
        .get('/api/v1/referrals/me')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.items.length).toBe(1);
      expect(meRes.body.data.items[0].clientName).toBe('My Direct Lead');
    });
  });

  // ==========================================================================
  // 4. UPDATING PERMITTED FIELDS & MASS ASSIGNMENT PROTECTION
  // ==========================================================================
  describe('PATCH /api/v1/referrals/:id (Field Updates & Protected Attributes)', () => {
    it('should allow partner to update client details on SUBMITTED referral', async () => {
      const { token: partnerToken } = await createTestUserSession('partner.upd@prospera.ae', Role.REFERRAL_PARTNER);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Initial Name',
          clientPhone: '+971501112233',
          expectedDealValue: 50000,
        });

      const leadId = createRes.body.data.id;

      const updateRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          clientName: 'Updated Name',
          notes: 'Customer prefers morning calls',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.clientName).toBe('Updated Name');
      expect(updateRes.body.data.notes).toBe('Customer prefers morning calls');
    });

    it('should reject partner attempting to modify protected fields like actualDealValue (403)', async () => {
      const { token: partnerToken } = await createTestUserSession('partner.prot@prospera.ae', Role.REFERRAL_PARTNER);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Protected Test',
          clientPhone: '+971501239999',
          expectedDealValue: 50000,
        });

      const leadId = createRes.body.data.id;

      // Attempt to tamper with actual deal value
      const tamperRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          actualDealValue: 200000,
        });

      expect(tamperRes.status).toBe(403);
      expect(tamperRes.body.error.message).toContain('not authorized to update actual deal value');
    });

    it('should reject partner attempting to edit lead once advanced to ASSIGNED or beyond (400)', async () => {
      const { token: partnerToken } = await createTestUserSession('partner.locked@prospera.ae', Role.REFERRAL_PARTNER);
      const { token: adminToken } = await createTestUserSession('admin.locked@prospera.ae', Role.ADMIN);
      const { userId: agentId } = await createTestUserSession('agent.locked@prospera.ae', Role.AGENT);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Advancing Lead',
          clientPhone: '+971501234455',
          expectedDealValue: 30000,
        });

      const leadId = createRes.body.data.id;

      // Admin assigns lead -> moves status to ASSIGNED
      await request(app)
        .patch(`/api/v1/referrals/${leadId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ agentId });

      // Partner attempts to edit now that it is ASSIGNED
      const editRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({ clientName: 'Hacked Name' });

      expect(editRes.status).toBe(400);
      expect(editRes.body.error.message).toContain('cannot be edited in');
    });
  });

  // ==========================================================================
  // 5. STATUS TRANSITION STATE MACHINE & HISTORY
  // ==========================================================================
  describe('PATCH /api/v1/referrals/:id/status (State Machine & Status Transitions)', () => {
    it('should allow partner to CANCEL their own submitted referral', async () => {
      const { token: partnerToken } = await createTestUserSession('partner.cancel@prospera.ae', Role.REFERRAL_PARTNER);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Cancelable Lead',
          clientPhone: '+971501112288',
          expectedDealValue: 20000,
        });

      const leadId = createRes.body.data.id;

      const cancelRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          status: LeadStatus.CANCELLED,
          transitionNote: 'Client decided to postpone venture',
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe(LeadStatus.CANCELLED);
    });

    it('should DENY partner from self-approving or transitioning lead to WON (403)', async () => {
      const { token: partnerToken } = await createTestUserSession('partner.fraud@prospera.ae', Role.REFERRAL_PARTNER);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Self-Award Attempt',
          clientPhone: '+971501114444',
          expectedDealValue: 50000,
        });

      const leadId = createRes.body.data.id;

      // Partner tries to mark WON
      const wonRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({ status: LeadStatus.WON });

      expect(wonRes.status).toBe(403);
      expect(wonRes.body.error.message).toContain('cannot transition referrals');
    });

    it('should allow assigned AGENT to progress lead through valid sales stages to WON', async () => {
      const { token: partnerToken } = await createTestUserSession('partner.pipeline@prospera.ae', Role.REFERRAL_PARTNER);
      const { token: adminToken } = await createTestUserSession('admin.pipe@prospera.ae', Role.ADMIN);
      const { token: agentToken, userId: agentId } = await createTestUserSession('agent.pipe@prospera.ae', Role.AGENT);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Progressing Lead',
          clientPhone: '+971505556677',
          expectedDealValue: 100000,
        });

      const leadId = createRes.body.data.id;

      // Assign agent
      await request(app)
        .patch(`/api/v1/referrals/${leadId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ agentId });

      // Agent: ASSIGNED -> CONTACTED
      const contactedRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: LeadStatus.CONTACTED, transitionNote: 'Spoke with client on phone' });
      expect(contactedRes.status).toBe(200);
      expect(contactedRes.body.data.status).toBe(LeadStatus.CONTACTED);

      // Agent: CONTACTED -> QUALIFIED
      const qualRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: LeadStatus.QUALIFIED, transitionNote: 'KYC verified and budget confirmed' });
      expect(qualRes.status).toBe(200);
      expect(qualRes.body.data.status).toBe(LeadStatus.QUALIFIED);

      // Agent: QUALIFIED -> PROPOSAL_SENT
      const propRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: LeadStatus.PROPOSAL_SENT, transitionNote: 'Sent contract' });
      expect(propRes.status).toBe(200);

      // Agent: PROPOSAL_SENT -> NEGOTIATION
      const negRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: LeadStatus.NEGOTIATION, transitionNote: 'Final pricing terms discussed' });
      expect(negRes.status).toBe(200);

      // Agent: NEGOTIATION -> WON
      const wonRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: LeadStatus.WON,
          actualDealValue: 105000,
          transitionNote: 'Contract executed and funds cleared',
        });
      expect(wonRes.status).toBe(200);
      expect(wonRes.body.data.status).toBe(LeadStatus.WON);
      expect(wonRes.body.data.wonAt).toBeDefined();
      expect(Number(wonRes.body.data.actualDealValue)).toBe(105000);

      // Verify lead cannot be transitioned once WON (terminal state)
      const afterWonRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: LeadStatus.CONTACTED });
      expect(afterWonRes.status).toBe(400);
      expect(afterWonRes.body.error.message).toContain('Cannot transition referral from terminal');
    });

    it('should reject invalid status skip transitions (e.g. SUBMITTED directly to WON) (400)', async () => {
      const { token: adminToken } = await createTestUserSession('admin.skip@prospera.ae', Role.ADMIN);
      const { token: partnerToken } = await createTestUserSession('partner.skip@prospera.ae', Role.REFERRAL_PARTNER);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Direct Won Test',
          clientPhone: '+971501112299',
          expectedDealValue: 20000,
        });

      const leadId = createRes.body.data.id;

      // Admin tries invalid transition directly from SUBMITTED -> WON
      const skipRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: LeadStatus.WON });

      expect(skipRes.status).toBe(400);
      expect(skipRes.body.error.message).toContain('Invalid status transition');
    });
  });

  // ==========================================================================
  // 6. ASSIGNMENT & REASSIGNMENT WORKFLOWS
  // ==========================================================================
  describe('PATCH /api/v1/referrals/:id/assign (Assignment & Permission Enforcements)', () => {
    it('should allow coordinator to assign sales agent and auto-advance SUBMITTED to ASSIGNED', async () => {
      const { token: coordToken, userId: coordId } = await createTestUserSession('coord.asgn@prospera.ae', Role.COORDINATOR);
      const { token: partnerToken } = await createTestUserSession('partner.asgn@prospera.ae', Role.REFERRAL_PARTNER);
      const { userId: agentId } = await createTestUserSession('agent.target@prospera.ae', Role.AGENT);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Assignment Test Lead',
          clientPhone: '+971508889911',
          expectedDealValue: 45000,
        });

      const leadId = createRes.body.data.id;

      const assignRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/assign`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          coordinatorId: coordId,
          agentId,
          assignmentNote: 'Routing to senior tech setup agent',
        });

      expect(assignRes.status).toBe(200);
      expect(assignRes.body.data.status).toBe(LeadStatus.ASSIGNED);
      expect(assignRes.body.data.coordinatorId).toBe(coordId);
      expect(assignRes.body.data.agentId).toBe(agentId);
    });

    it('should DENY referral partner from assigning referrals (403 Forbidden)', async () => {
      const { token: partnerToken } = await createTestUserSession('partner.noassign@prospera.ae', Role.REFERRAL_PARTNER);
      const { userId: agentId } = await createTestUserSession('agent.rnd@prospera.ae', Role.AGENT);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Partner Cannot Assign',
          clientPhone: '+971501112200',
          expectedDealValue: 10000,
        });

      const leadId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/v1/referrals/${leadId}/assign`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({ agentId });

      expect(res.status).toBe(403);
    });

    it('should reject assigning non-existent or invalid agent (400 Bad Request)', async () => {
      const { token: adminToken } = await createTestUserSession('admin.badagent@prospera.ae', Role.ADMIN);
      const { token: partnerToken } = await createTestUserSession('partner.tgt@prospera.ae', Role.REFERRAL_PARTNER);

      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Bad Agent Target',
          clientPhone: '+971507773344',
          expectedDealValue: 15000,
        });

      const leadId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/v1/referrals/${leadId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ agentId: crypto.randomUUID() }); // Non-existent agent

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('not an active agent');
    });
  });

  // ==========================================================================
  // 7. STATUS HISTORY RETRIEVAL
  // ==========================================================================
  describe('GET /api/v1/referrals/:id/history (Audit Trail Retrieval)', () => {
    it('should record and retrieve full chronological status history for referral', async () => {
      const { token: partnerToken } = await createTestUserSession('partner.hist@prospera.ae', Role.REFERRAL_PARTNER);
      const { token: adminToken } = await createTestUserSession('admin.hist@prospera.ae', Role.ADMIN);
      const { userId: agentId } = await createTestUserSession('agent.hist@prospera.ae', Role.AGENT);

      // 1. Creation generates initial history entry
      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'History Audit Client',
          clientPhone: '+971501112233',
          expectedDealValue: 60000,
        });

      const leadId = createRes.body.data.id;

      // 2. Assignment generates second history entry
      await request(app)
        .patch(`/api/v1/referrals/${leadId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ agentId, assignmentNote: 'Assigned by admin' });

      // 3. Status update generates third history entry
      await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: LeadStatus.CONTACTED, transitionNote: 'Initial contact made' });

      // Retrieve history
      const historyRes = await request(app)
        .get(`/api/v1/referrals/${leadId}/history`)
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.length).toBe(3);
      expect(historyRes.body.data[0].newStatus).toBe(LeadStatus.SUBMITTED);
      expect(historyRes.body.data[1].newStatus).toBe(LeadStatus.ASSIGNED);
      expect(historyRes.body.data[2].newStatus).toBe(LeadStatus.CONTACTED);
      expect(historyRes.body.data[2].transitionNote).toBe('Initial contact made');
    });
  });
});
