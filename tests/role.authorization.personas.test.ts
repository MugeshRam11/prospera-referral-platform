// ============================================================================
// COMPREHENSIVE ROLE-BASED AUTHORIZATION & PERSONA ISOLATION TEST SUITE
//
// Validates:
// 1. All seven demo personas against real API routes
// 2. Server-enforced referral submission for eligible AGENTS and PARTNERS
// 3. Coordinator focus on assigned leads and triage desk (creation denied)
// 4. Agency member submission attribution to both member and agency
// 5. Cross-agency isolation, personal referral access, and anti-IDOR protections
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { Role, AccountStatus, AgentType, AgencyRole, AgencyStatus, LeadStatus, Agency } from '@prisma/client';
import { getAuthRepository, InMemoryAuthRepository } from '../src/modules/auth/auth.repository';
import { getReferralRepository, InMemoryReferralRepository } from '../src/modules/referrals/referral.repository';
import argon2 from 'argon2';

describe('Role-Based Authorization & Persona Isolation Test Suite', () => {
  let authRepo: InMemoryAuthRepository;
  let referralRepo: InMemoryReferralRepository;
  let activeServiceId: string;

  // Session Tokens for all 7 Personas
  let adminToken: string;
  let agencyOwnerToken: string;
  let agencyAdminToken: string;
  let agencyMemberToken: string;
  let independentAgentToken: string;
  let coordinatorToken: string;
  let partnerToken: string;

  // IDs
  let agencyOwnerId: string;
  let agencyAdminId: string;
  let agencyMemberId: string;
  let independentAgentId: string;
  let coordinatorId: string;
  let partnerId: string;

  // Agency A & Agency B definitions
  const agencyAId = 'agency-1111-2222-3333';
  const agencyA: Agency = {
    id: agencyAId,
    name: 'Prestige Luxury Real Estate',
    legalName: 'Prestige Luxury Real Estate LLC',
    tradeLicenseNo: 'TL-DXB-987654',
    orn: 'ORN-12345',
    dedLicenseNo: 'DED-54321',
    email: 'contact@prestigeluxury.ae',
    phone: '+97143330000',
    address: 'Downtown Dubai, UAE',
    poBox: 'PO Box 12345',
    status: AgencyStatus.VERIFIED,
    rejectionReason: null,
    createdById: 'placeholder',
    verifiedById: null,
    verifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const agencyBId = 'agency-4444-5555-6666';
  const agencyB: Agency = {
    id: agencyBId,
    name: 'Apex Sovereign Properties',
    legalName: 'Apex Sovereign Properties LLC',
    tradeLicenseNo: 'TL-DXB-112233',
    orn: 'ORN-67890',
    dedLicenseNo: 'DED-99887',
    email: 'contact@apexsovereign.ae',
    phone: '+97144440000',
    address: 'DIFC, Dubai, UAE',
    poBox: 'PO Box 67890',
    status: AgencyStatus.VERIFIED,
    rejectionReason: null,
    createdById: 'placeholder',
    verifiedById: null,
    verifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validPassword = 'SecurePassword123!';

  const createPersonaSession = async (
    email: string,
    fullName: string,
    role: Role,
    agentType: AgentType = AgentType.INDEPENDENT,
    accountStatus: AccountStatus = AccountStatus.ACTIVE,
    coordId: string | null = null,
    agencyContext?: { agencyId: string; agencyRole: AgencyRole; agency: Agency }
  ) => {
    const passwordHash = await argon2.hash(validPassword);
    const user = await authRepo.createUser({
      email,
      fullName,
      passwordHash,
      role,
      agentType,
      accountStatus,
      coordinatorId: coordId,
    });

    if (agencyContext) {
      authRepo.seedAgencyMembership?.(user.id, {
        id: crypto.randomUUID(),
        agencyId: agencyContext.agencyId,
        userId: user.id,
        role: agencyContext.agencyRole,
        status: 'ACTIVE',
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        agency: agencyContext.agency,
      });
    }

    // Also seed user in referralRepo for consistent lead attribution
    referralRepo.seedUser({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      agentType: user.agentType,
      accountStatus: user.accountStatus,
      coordinatorId: user.coordinatorId,
      agencyId: agencyContext?.agencyId ?? null,
      agencyName: agencyContext?.agency?.name ?? null,
      agencyRole: agencyContext?.agencyRole ?? null,
      agency: agencyContext?.agency ?? null,
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: validPassword });

    return {
      userId: user.id,
      token: loginRes.body.data.sessionToken as string,
    };
  };

  beforeEach(async () => {
    authRepo = getAuthRepository() as InMemoryAuthRepository;
    referralRepo = getReferralRepository() as InMemoryReferralRepository;
    authRepo.clearAll();
    referralRepo.clearAll();

    // 1. Seed Active Service
    const srv = referralRepo.seedService({
      slug: 'uae-luxury-real-estate',
      name: 'UAE Luxury Real Estate',
      defaultPartnerCommissionBps: 200,
      defaultAgentCommissionBps: 150,
      isActive: true,
    });
    activeServiceId = srv.id;

    // 2. Initialize all 7 personas
    // Persona 1: Platform Admin
    const pAdmin = await createPersonaSession(
      'admin@demo.prospera.test',
      'Sultan Al Qasimi (Admin)',
      Role.ADMIN
    );
    adminToken = pAdmin.token;

    // Persona 6: Lead Coordinator
    const pCoord = await createPersonaSession(
      'coordinator@demo.prospera.test',
      'Mariam Al Hashimi (Coordinator)',
      Role.COORDINATOR
    );
    coordinatorId = pCoord.userId;
    coordinatorToken = pCoord.token;

    // Persona 7: Corporate Referral Partner (Attributed to Coordinator)
    const pPartner = await createPersonaSession(
      'partner.corporate@demo.prospera.test',
      'Kareem Mansoor (Corporate Partner)',
      Role.REFERRAL_PARTNER,
      AgentType.INDEPENDENT,
      AccountStatus.ACTIVE,
      coordinatorId
    );
    partnerId = pPartner.userId;
    partnerToken = pPartner.token;

    // Persona 5: Independent Agent
    const pIndAgent = await createPersonaSession(
      'agent.independent@demo.prospera.test',
      'Tariq Mansour (Independent Agent)',
      Role.AGENT,
      AgentType.INDEPENDENT
    );
    independentAgentId = pIndAgent.userId;
    independentAgentToken = pIndAgent.token;

    // Persona 2: Agency Owner (Agency A)
    const pOwner = await createPersonaSession(
      'agency.owner@demo.prospera.test',
      'Layla Al Nuaimi (Agency Owner)',
      Role.AGENT,
      AgentType.AGENCY_MEMBER,
      AccountStatus.ACTIVE,
      null,
      { agencyId: agencyAId, agencyRole: AgencyRole.AGENCY_OWNER, agency: agencyA }
    );
    agencyOwnerId = pOwner.userId;
    agencyOwnerToken = pOwner.token;

    // Persona 3: Agency Admin (Agency A)
    const pAdminMember = await createPersonaSession(
      'agency.admin@demo.prospera.test',
      'Farhan Zaidi (Agency Admin)',
      Role.AGENT,
      AgentType.AGENCY_MEMBER,
      AccountStatus.ACTIVE,
      null,
      { agencyId: agencyAId, agencyRole: AgencyRole.AGENCY_ADMIN, agency: agencyA }
    );
    agencyAdminId = pAdminMember.userId;
    agencyAdminToken = pAdminMember.token;

    // Persona 4: Agency Member (Broker in Agency A)
    const pMember = await createPersonaSession(
      'agency.member@demo.prospera.test',
      'Elena Rostova (Agency Member)',
      Role.AGENT,
      AgentType.AGENCY_MEMBER,
      AccountStatus.ACTIVE,
      null,
      { agencyId: agencyAId, agencyRole: AgencyRole.AGENT, agency: agencyA }
    );
    agencyMemberId = pMember.userId;
    agencyMemberToken = pMember.token;
  });

  // ==========================================================================
  // SUITE 1: VERIFY 7 DEMO PERSONAS AUTHENTICATION & CONTEXT
  // ==========================================================================
  describe('1. Seven Demo Personas Authentication & Profile Context', () => {
    it('Platform Admin can access /auth/me and platform referrals desk', async () => {
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.role).toBe(Role.ADMIN);

      const referralsRes = await request(app)
        .get('/api/v1/referrals')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(referralsRes.status).toBe(200);
      expect(referralsRes.body.success).toBe(true);
    });

    it('Corporate Referral Partner can access /auth/me with partner role', async () => {
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${partnerToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.role).toBe(Role.REFERRAL_PARTNER);
    });

    it('Lead Coordinator can access /auth/me with coordinator role', async () => {
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${coordinatorToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.role).toBe(Role.COORDINATOR);
    });

    it('Independent Agent can access /auth/me with INDEPENDENT agentType', async () => {
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${independentAgentToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.role).toBe(Role.AGENT);
      expect(meRes.body.data.user.agentType).toBe(AgentType.INDEPENDENT);
    });

    it('Agency Owner, Admin, and Member authenticate with AGENCY_MEMBER and agency context', async () => {
      const ownerRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${agencyOwnerToken}`);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.data.user.role).toBe(Role.AGENT);
      expect(ownerRes.body.data.user.agentType).toBe(AgentType.AGENCY_MEMBER);
      expect(ownerRes.body.data.user.agencyRole).toBe(AgencyRole.AGENCY_OWNER);
      expect(ownerRes.body.data.user.agencyId).toBe(agencyAId);

      const adminMemberRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${agencyAdminToken}`);
      expect(adminMemberRes.status).toBe(200);
      expect(adminMemberRes.body.data.user.role).toBe(Role.AGENT);
      expect(adminMemberRes.body.data.user.agencyRole).toBe(AgencyRole.AGENCY_ADMIN);
      expect(adminMemberRes.body.data.user.agencyId).toBe(agencyAId);

      const memberRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${agencyMemberToken}`);
      expect(memberRes.status).toBe(200);
      expect(memberRes.body.data.user.role).toBe(Role.AGENT);
      expect(memberRes.body.data.user.agencyRole).toBe(AgencyRole.AGENT);
      expect(memberRes.body.data.user.agencyId).toBe(agencyAId);
    });
  });

  // ==========================================================================
  // SUITE 2: SERVER-ENFORCED REFERRAL SUBMISSIONS (ALL ELIGIBLE PERSONAS)
  // ==========================================================================
  describe('2. Server-Enforced Referral Submission for Every Eligible Persona', () => {
    it('Corporate Referral Partner CAN submit new referrals', async () => {
      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Partner Institutional Client',
          clientPhone: '+971509990001',
          expectedDealValue: 750000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.partnerId).toBe(partnerId);
      expect(res.body.data.status).toBe(LeadStatus.SUBMITTED);
    });

    it('Independent Agent CAN submit new referrals with own attribution', async () => {
      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${independentAgentToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Independent Broker Direct Client',
          clientPhone: '+971509990002',
          expectedDealValue: 1250000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.partnerId).toBe(independentAgentId);
      expect(res.body.data.status).toBe(LeadStatus.SUBMITTED);
    });

    it('Agency Member (Broker) CAN submit new referrals attributed to member and agency', async () => {
      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${agencyMemberToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Agency Member VIP Client',
          clientPhone: '+971509990003',
          expectedDealValue: 3000000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.partnerId).toBe(agencyMemberId);
      expect(res.body.data.partner.agencyId).toBe(agencyAId);
      expect(res.body.data.partner.agencyName).toBe('Prestige Luxury Real Estate');
    });

    it('Agency Admin CAN submit new referrals', async () => {
      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${agencyAdminToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Agency Admin Client',
          clientPhone: '+971509990004',
          expectedDealValue: 2000000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.partnerId).toBe(agencyAdminId);
      expect(res.body.data.partner.agencyId).toBe(agencyAId);
    });

    it('Agency Owner CAN submit new referrals', async () => {
      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${agencyOwnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Agency Owner High-Roller',
          clientPhone: '+971509990005',
          expectedDealValue: 5000000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.partnerId).toBe(agencyOwnerId);
      expect(res.body.data.partner.agencyId).toBe(agencyAId);
    });
  });

  // ==========================================================================
  // SUITE 3: COORDINATOR FOCUS ON TRIAGE & ASSIGNMENT (CREATION DENIED)
  // ==========================================================================
  describe('3. Coordinator Focus & Triage Desk Boundaries', () => {
    it('should DENY Lead Coordinator from creating referrals (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Coordinator Attempt',
          clientPhone: '+971509990006',
          expectedDealValue: 500000,
        });

      expect(res.status).toBe(403);
    });

    it('Coordinator CAN assign leads to agents and advance SUBMITTED to ASSIGNED', async () => {
      // 1. Partner creates lead
      const leadRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Unassigned Deal',
          clientPhone: '+971509990007',
          expectedDealValue: 800000,
        });
      const leadId = leadRes.body.data.id;

      // 2. Coordinator assigns lead to Independent Agent
      const assignRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/assign`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          coordinatorId,
          agentId: independentAgentId,
          assignmentNote: 'Assigned to independent agent by coordinator',
        });

      expect(assignRes.status).toBe(200);
      expect(assignRes.body.data.agentId).toBe(independentAgentId);
      expect(assignRes.body.data.status).toBe(LeadStatus.ASSIGNED);
    });
  });

  // ==========================================================================
  // SUITE 4: PERSONAL REFERRAL ACCESS & SALES LIFECYCLE PROGRESSION
  // ==========================================================================
  describe('4. Personal Referral Access & State Progression', () => {
    it('Submitting Agent CAN access their own submitted referral via /referrals/:id and /referrals/me', async () => {
      const createRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${independentAgentToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Personal Broker Deal',
          clientPhone: '+971509990008',
          expectedDealValue: 1500000,
        });
      const leadId = createRes.body.data.id;

      // Access by ID
      const getRes = await request(app)
        .get(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${independentAgentToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.id).toBe(leadId);

      // Access via /me
      const meListRes = await request(app)
        .get('/api/v1/referrals/me')
        .set('Authorization', `Bearer ${independentAgentToken}`);
      expect(meListRes.status).toBe(200);
      expect(meListRes.body.data.items.some((l: { id: string }) => l.id === leadId)).toBe(true);
    });

    it('Assigned Agent can progress lead through sales stages to WON', async () => {
      // 1. Partner creates lead
      const leadRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Sales Progression Client',
          clientPhone: '+971509990009',
          expectedDealValue: 2500000,
        });
      const leadId = leadRes.body.data.id;

      // 2. Coordinator assigns lead
      await request(app)
        .patch(`/api/v1/referrals/${leadId}/assign`)
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({ agentId: independentAgentId });

      // 3. Assigned agent transitions to CONTACTED
      const contactedRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${independentAgentToken}`)
        .send({ status: LeadStatus.CONTACTED });
      expect(contactedRes.status).toBe(200);
      expect(contactedRes.body.data.status).toBe(LeadStatus.CONTACTED);

      // 4. Assigned agent transitions to QUALIFIED
      const qualifiedRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${independentAgentToken}`)
        .send({ status: LeadStatus.QUALIFIED });
      expect(qualifiedRes.status).toBe(200);

      // 5. Assigned agent transitions to WON
      const wonRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/status`)
        .set('Authorization', `Bearer ${independentAgentToken}`)
        .send({
          status: LeadStatus.WON,
          actualDealValue: 2400000,
        });
      expect(wonRes.status).toBe(200);
      expect(wonRes.body.data.status).toBe(LeadStatus.WON);
    });
  });

  // ==========================================================================
  // SUITE 5: CROSS-AGENCY ISOLATION & ANTI-IDOR PROTECTIONS
  // ==========================================================================
  describe('5. Cross-Agency Isolation & Anti-IDOR Protections', () => {
    let agencyBOwnerToken: string;
    let agencyBMemberToken: string;

    beforeEach(async () => {
      // Seed second agency (Agency B: Apex Sovereign Properties)
      const pBOwner = await createPersonaSession(
        'agencyb.owner@demo.prospera.test',
        'Zaid Al Mansoori (Agency B Owner)',
        Role.AGENT,
        AgentType.AGENCY_MEMBER,
        AccountStatus.ACTIVE,
        null,
        { agencyId: agencyBId, agencyRole: AgencyRole.AGENCY_OWNER, agency: agencyB }
      );
      agencyBOwnerToken = pBOwner.token;

      const pBMember = await createPersonaSession(
        'agencyb.member@demo.prospera.test',
        'Rami Haddad (Agency B Member)',
        Role.AGENT,
        AgentType.AGENCY_MEMBER,
        AccountStatus.ACTIVE,
        null,
        { agencyId: agencyBId, agencyRole: AgencyRole.AGENT, agency: agencyB }
      );
      agencyBMemberToken = pBMember.token;
    });

    it('Agency A Owner and Admin CAN view referrals submitted by Agency A Member', async () => {
      // Agency A Member creates lead
      const leadRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${agencyMemberToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Agency A Confidential Opportunity',
          clientPhone: '+971509990010',
          expectedDealValue: 4000000,
        });
      const leadId = leadRes.body.data.id;

      // Agency A Owner reads lead -> GRANTED
      const ownerRes = await request(app)
        .get(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${agencyOwnerToken}`);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.data.id).toBe(leadId);

      // Agency A Admin reads lead -> GRANTED
      const adminRes = await request(app)
        .get(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${agencyAdminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.id).toBe(leadId);
    });

    it('CROSS-AGENCY ISOLATION: Agency B Member and Owner CANNOT access Agency A referral (404 Not Found)', async () => {
      // Agency A Member creates lead
      const leadRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${agencyMemberToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Agency A Secret Deal',
          clientPhone: '+971509990011',
          expectedDealValue: 5000000,
        });
      const leadId = leadRes.body.data.id;

      // Agency B Member attempts to access Agency A lead -> 404
      const bMemberRes = await request(app)
        .get(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${agencyBMemberToken}`);
      expect(bMemberRes.status).toBe(404);

      // Agency B Owner attempts to access Agency A lead -> 404
      const bOwnerRes = await request(app)
        .get(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${agencyBOwnerToken}`);
      expect(bOwnerRes.status).toBe(404);

      // Independent Agent attempts to access Agency A lead -> 404
      const indRes = await request(app)
        .get(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${independentAgentToken}`);
      expect(indRes.status).toBe(404);
    });

    it('CROSS-TENANT ISOLATION: Partner A CANNOT view Partner B referrals (404 Not Found)', async () => {
      const pPartnerB = await createPersonaSession(
        'partnerb.corporate@demo.prospera.test',
        'Competitor Corporate Partner',
        Role.REFERRAL_PARTNER
      );

      const leadRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${pPartnerB.token}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Partner B VIP Client',
          clientPhone: '+971509990012',
          expectedDealValue: 10000000,
        });
      const leadId = leadRes.body.data.id;

      // Partner A attempts to view Partner B's lead -> 404
      const res = await request(app)
        .get(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${partnerToken}`);
      expect(res.status).toBe(404);
    });

    it('Agent CANNOT view unassigned referral not submitted by them (404 Not Found)', async () => {
      const leadRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Unassigned Secret Client',
          clientPhone: '+971509990013',
          expectedDealValue: 3000000,
        });
      const leadId = leadRes.body.data.id;

      // Independent agent attempts to read unassigned lead -> 404
      const res = await request(app)
        .get(`/api/v1/referrals/${leadId}`)
        .set('Authorization', `Bearer ${independentAgentToken}`);
      expect(res.status).toBe(404);
    });

    it('Referral Partner CANNOT assign leads to agents (403 Forbidden)', async () => {
      const leadRes = await request(app)
        .post('/api/v1/referrals')
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({
          serviceId: activeServiceId,
          clientName: 'Partner Self-Assign Lead',
          clientPhone: '+971509990014',
          expectedDealValue: 1000000,
        });
      const leadId = leadRes.body.data.id;

      const assignRes = await request(app)
        .patch(`/api/v1/referrals/${leadId}/assign`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({ agentId: independentAgentId });
      expect(assignRes.status).toBe(403);
    });

    it('Referral Partner CANNOT access platform administrative endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${partnerToken}`);
      expect(res.status).toBe(403);
    });
  });
});
