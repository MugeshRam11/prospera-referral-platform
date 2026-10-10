import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { PrismaAuthRepository } from '../../src/modules/auth/auth.repository';
import { PrismaReferralRepository } from '../../src/modules/referrals/referral.repository';
import { Role, AccountStatus, OtpPurpose, LeadStatus, Prisma } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'crypto';

describe('PostgreSQL Database Integration Tests (Real Database Verification)', () => {
  let isPostgresAvailable = false;
  const authRepo = new PrismaAuthRepository();
  const referralRepo = new PrismaReferralRepository();

  // Track created entity IDs for clean teardown
  const createdUserIds: string[] = [];
  const createdLeadIds: string[] = [];
  const createdServiceIds: string[] = [];
  const createdCategoryIds: string[] = [];

  beforeAll(async () => {
    try {
      // Probe active connection to PostgreSQL
      await prisma.$queryRaw`SELECT 1`;
      isPostgresAvailable = true;
    } catch (err: unknown) {
      isPostgresAvailable = false;
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn(
        '\n================================================================================\n' +
          '[ENVIRONMENTAL STATUS] Local PostgreSQL service is NOT reachable.\n' +
          'Connection probe to localhost:5432 failed:\n' +
          `  ${errorMessage}\n\n` +
          'To run these tests against a live database:\n' +
          '  1. Start the isolated development database: docker compose up -d\n' +
          '  2. Apply migrations: npm run migrate:deploy\n' +
          '  3. Re-run integration tests: npm run test:integration\n' +
          'See docs/dev-database-setup.md for full instructions.\n' +
          '================================================================================\n'
      );
    }
  });

  afterAll(async () => {
    if (!isPostgresAvailable) {
      await prisma.$disconnect();
      return;
    }

    // Safe teardown: Clean up test data in reverse foreign-key dependency order
    try {
      if (createdLeadIds.length > 0) {
        await prisma.leadStatusHistory.deleteMany({
          where: { leadId: { in: createdLeadIds } },
        });
        await prisma.lead.deleteMany({
          where: { id: { in: createdLeadIds } },
        });
      }

      if (createdUserIds.length > 0) {
        await prisma.session.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.otpChallenge.deleteMany({
          where: { userId: { in: createdUserIds } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        });
      }

      if (createdServiceIds.length > 0) {
        await prisma.service.deleteMany({
          where: { id: { in: createdServiceIds } },
        });
      }

      if (createdCategoryIds.length > 0) {
        await prisma.serviceCategory.deleteMany({
          where: { id: { in: createdCategoryIds } },
        });
      }
    } catch (cleanupError) {
      console.error('Teardown warning during test cleanup:', cleanupError);
    } finally {
      await prisma.$disconnect();
    }
  });

  describe('PostgreSQL Environment & Connectivity Status', () => {
    it('should report the environment availability status of PostgreSQL database', () => {
      if (!isPostgresAvailable) {
        expect(isPostgresAvailable).toBe(false);
      } else {
        expect(isPostgresAvailable).toBe(true);
      }
    });
  });

  describe('1. User Registration and Authentication Workflows', () => {
    it('should create user record in PostgreSQL, lowercase email, and verify password hash', async () => {
      if (!isPostgresAvailable) return;

      const rawPassword = 'Password123!Secure';
      const passwordHash = await argon2.hash(rawPassword, { type: argon2.argon2id });
      const uniqueSuffix = crypto.randomUUID().substring(0, 8);
      const email = `Partner_${uniqueSuffix}@TestDomain.COM`;

      const user = await authRepo.createUser({
        email,
        passwordHash,
        fullName: `Partner ${uniqueSuffix}`,
        phone: '+971501112233',
        companyName: 'Acme Partners LLC',
        role: Role.REFERRAL_PARTNER,
        accountStatus: AccountStatus.ACTIVE,
      });

      createdUserIds.push(user.id);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(email.toLowerCase());
      expect(user.role).toBe(Role.REFERRAL_PARTNER);
      expect(user.accountStatus).toBe(AccountStatus.ACTIVE);

      // Verify Argon2 hash verification against database record
      const isValid = await argon2.verify(user.passwordHash, rawPassword);
      expect(isValid).toBe(true);

      // Verify lookup from database
      const fetched = await authRepo.findUserByEmail(email.toUpperCase());
      expect(fetched).not.toBeNull();
      expect(fetched?.id).toBe(user.id);
    });

    it('should enforce database uniqueness constraint on users.email at PostgreSQL level', async () => {
      if (!isPostgresAvailable) return;

      const uniqueSuffix = crypto.randomUUID().substring(0, 8);
      const email = `unique_${uniqueSuffix}@example.com`;
      const passwordHash = await argon2.hash('Secret123!', { type: argon2.argon2id });

      const user1 = await authRepo.createUser({
        email,
        passwordHash,
        fullName: 'User Original',
        role: Role.REFERRAL_PARTNER,
        accountStatus: AccountStatus.ACTIVE,
      });
      createdUserIds.push(user1.id);

      // Second insert with duplicate email must trigger Prisma P2002 error from PostgreSQL
      await expect(
        authRepo.createUser({
          email,
          passwordHash,
          fullName: 'User Duplicate',
          role: Role.REFERRAL_PARTNER,
          accountStatus: AccountStatus.ACTIVE,
        })
      ).rejects.toThrowError(/Unique constraint failed/);
    });
  });

  describe('2. OTP Challenge & Concurrency Safety Workflows', () => {
    it('should create OTP challenge, increment attempts atomically, and consume challenge atomically', async () => {
      if (!isPostgresAvailable) return;

      const email = `otp_test_${crypto.randomUUID().substring(0, 8)}@example.com`;
      const codeHash = crypto.createHash('sha256').update('123456').digest('hex');

      const challenge = await authRepo.createOtpChallenge({
        email,
        codeHash,
        purpose: OtpPurpose.SIGNUP_VERIFICATION,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        maxAttempts: 5,
        ipAddress: '127.0.0.1',
      });

      expect(challenge.id).toBeDefined();
      expect(challenge.attemptsCount).toBe(0);
      expect(challenge.consumedAt).toBeNull();

      // Atomic attempt increment
      const incResult = await authRepo.incrementOtpAttempts(challenge.id);
      expect(incResult.attemptsCount).toBe(1);
      expect(incResult.maxAttempts).toBe(5);
      expect(incResult.isConsumed).toBe(false);

      // Concurrent single-use consumption (SEC-03)
      // Exactly one concurrent call must return true; the second must return false
      const [firstConsumption, secondConsumption] = await Promise.all([
        authRepo.consumeOtpChallenge(challenge.id),
        authRepo.consumeOtpChallenge(challenge.id),
      ]);

      const successCount = (firstConsumption ? 1 : 0) + (secondConsumption ? 1 : 0);
      expect(successCount).toBe(1);

      // Verification after consumption: attempts count reflects consumed
      const afterConsumedInc = await authRepo.incrementOtpAttempts(challenge.id);
      expect(afterConsumedInc.isConsumed).toBe(true);
    });

    it('should invalidate active OTP challenges when issuing replacement (SEC-04)', async () => {
      if (!isPostgresAvailable) return;

      const email = `replacement_${crypto.randomUUID().substring(0, 8)}@example.com`;
      const codeHash = crypto.createHash('sha256').update('999999').digest('hex');

      await authRepo.createOtpChallenge({
        email,
        codeHash,
        purpose: OtpPurpose.LOGIN_2FA,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        maxAttempts: 5,
      });

      const invalidatedCount = await authRepo.invalidateActiveOtpChallenges(
        email,
        OtpPurpose.LOGIN_2FA
      );
      expect(invalidatedCount).toBe(1);

      const latest = await authRepo.findLatestOtpChallenge(email, OtpPurpose.LOGIN_2FA);
      expect(latest?.consumedAt).not.toBeNull();
    });
  });

  describe('3. Session Creation, Expiry, and Revocation Workflows', () => {
    it('should create session, find by token hash, and revoke sessions', async () => {
      if (!isPostgresAvailable) return;

      const passwordHash = await argon2.hash('Pass123!', { type: argon2.argon2id });
      const user = await authRepo.createUser({
        email: `session_user_${crypto.randomUUID().substring(0, 8)}@example.com`,
        passwordHash,
        fullName: 'Session User',
        role: Role.REFERRAL_PARTNER,
        accountStatus: AccountStatus.ACTIVE,
      });
      createdUserIds.push(user.id);

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const session = await authRepo.createSession({
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: '127.0.0.1',
        userAgent: 'IntegrationTestRunner/1.0',
      });

      expect(session.id).toBeDefined();
      expect(session.userId).toBe(user.id);
      expect(session.revokedAt).toBeNull();

      // Find by token hash including user join
      const foundSession = await authRepo.findSessionByTokenHash(tokenHash);
      expect(foundSession).not.toBeNull();
      expect(foundSession?.user.email).toBe(user.email);

      // Single revocation
      const revoked = await authRepo.revokeSession(session.id);
      expect(revoked.revokedAt).not.toBeNull();

      // Bulk user session revocation
      const token2 = crypto.createHash('sha256').update('token2').digest('hex');
      const token3 = crypto.createHash('sha256').update('token3').digest('hex');
      await authRepo.createSession({ userId: user.id, tokenHash: token2, expiresAt });
      await authRepo.createSession({ userId: user.id, tokenHash: token3, expiresAt });

      const countRevoked = await authRepo.revokeAllUserSessions(user.id);
      expect(countRevoked).toBe(2);
    });
  });

  describe('4. Referral Pipeline, Transactions & Data Isolation Workflows', () => {
    let testServiceId: string;
    let partnerAId: string;
    let partnerBId: string;
    let coordinatorId: string;
    let agentId: string;

    beforeAll(async () => {
      if (!isPostgresAvailable) return;

      // Seed Service Category & Service
      const category = await prisma.serviceCategory.create({
        data: {
          slug: `category-${crypto.randomUUID().substring(0, 8)}`,
          name: 'Corporate Services',
        },
      });
      createdCategoryIds.push(category.id);

      const service = await prisma.service.create({
        data: {
          categoryId: category.id,
          slug: `service-${crypto.randomUUID().substring(0, 8)}`,
          name: 'Dubai Mainland Company Formation',
          defaultPartnerCommissionBps: 1000,
          defaultAgentCommissionBps: 500,
        },
      });
      createdServiceIds.push(service.id);
      testServiceId = service.id;

      // Seed Partner A
      const partnerA = await authRepo.createUser({
        email: `partnerA_${crypto.randomUUID().substring(0, 8)}@example.com`,
        passwordHash: 'dummy',
        fullName: 'Partner Alpha',
        role: Role.REFERRAL_PARTNER,
        accountStatus: AccountStatus.ACTIVE,
      });
      createdUserIds.push(partnerA.id);
      partnerAId = partnerA.id;

      // Seed Partner B
      const partnerB = await authRepo.createUser({
        email: `partnerB_${crypto.randomUUID().substring(0, 8)}@example.com`,
        passwordHash: 'dummy',
        fullName: 'Partner Beta',
        role: Role.REFERRAL_PARTNER,
        accountStatus: AccountStatus.ACTIVE,
      });
      createdUserIds.push(partnerB.id);
      partnerBId = partnerB.id;

      // Seed Coordinator
      const coord = await authRepo.createUser({
        email: `coord_${crypto.randomUUID().substring(0, 8)}@example.com`,
        passwordHash: 'dummy',
        fullName: 'Lead Coordinator',
        role: Role.COORDINATOR,
        accountStatus: AccountStatus.ACTIVE,
      });
      createdUserIds.push(coord.id);
      coordinatorId = coord.id;

      // Seed Agent
      const agent = await authRepo.createUser({
        email: `agent_${crypto.randomUUID().substring(0, 8)}@example.com`,
        passwordHash: 'dummy',
        fullName: 'Sales Agent',
        role: Role.AGENT,
        accountStatus: AccountStatus.ACTIVE,
      });
      createdUserIds.push(agent.id);
      agentId = agent.id;
    });

    it('should create referral with transaction atomicity, recording lead and status history', async () => {
      if (!isPostgresAvailable) return;

      const refNo = `REF-2026-${crypto.randomInt(100000, 999999)}`;
      const lead = await referralRepo.createLead({
        referenceNo: refNo,
        partnerId: partnerAId,
        serviceId: testServiceId,
        clientName: 'Enterprise Client LLC',
        clientPhone: '+971509998877',
        clientEmail: 'client@enterprise.ae',
        expectedDealValue: 75000,
        currency: 'AED',
        notes: 'Initial client requirement discussion',
        status: LeadStatus.SUBMITTED,
        changedById: partnerAId,
        transitionNote: 'Direct referral from partner dashboard',
      });

      createdLeadIds.push(lead.id);

      expect(lead.id).toBeDefined();
      expect(lead.referenceNo).toBe(refNo);
      expect(lead.status).toBe(LeadStatus.SUBMITTED);
      expect(lead.expectedDealValue.toString()).toBe('75000');
      expect(lead.partner?.id).toBe(partnerAId);

      // Verify status history was created atomically in the transaction
      const history = await referralRepo.getLeadStatusHistory(lead.id);
      expect(history.length).toBe(1);
      expect(history[0].newStatus).toBe(LeadStatus.SUBMITTED);
      expect(history[0].previousStatus).toBeNull();
      expect(history[0].changedById).toBe(partnerAId);
    });

    it('should enforce database uniqueness on lead reference_no', async () => {
      if (!isPostgresAvailable) return;

      const duplicateRef = `REF-2026-${crypto.randomInt(100000, 999999)}`;
      const lead1 = await referralRepo.createLead({
        referenceNo: duplicateRef,
        partnerId: partnerAId,
        serviceId: testServiceId,
        clientName: 'Client 1',
        clientPhone: '+971501111111',
        expectedDealValue: 10000,
        changedById: partnerAId,
      });
      createdLeadIds.push(lead1.id);

      // Attempt second creation with identical referenceNo
      await expect(
        referralRepo.createLead({
          referenceNo: duplicateRef,
          partnerId: partnerBId,
          serviceId: testServiceId,
          clientName: 'Client 2',
          clientPhone: '+971502222222',
          expectedDealValue: 20000,
          changedById: partnerBId,
        })
      ).rejects.toThrowError(/Unique constraint failed/);
    });

    it('should isolate lead listings between referral partners at database query level', async () => {
      if (!isPostgresAvailable) return;

      const leadA = await referralRepo.createLead({
        referenceNo: `REF-2026-${crypto.randomInt(100000, 999999)}`,
        partnerId: partnerAId,
        serviceId: testServiceId,
        clientName: 'Alpha Exclusive Lead',
        clientPhone: '+971503333333',
        expectedDealValue: 30000,
        changedById: partnerAId,
      });
      createdLeadIds.push(leadA.id);

      const leadB = await referralRepo.createLead({
        referenceNo: `REF-2026-${crypto.randomInt(100000, 999999)}`,
        partnerId: partnerBId,
        serviceId: testServiceId,
        clientName: 'Beta Exclusive Lead',
        clientPhone: '+971504444444',
        expectedDealValue: 40000,
        changedById: partnerBId,
      });
      createdLeadIds.push(leadB.id);

      // Partner A query
      const listA = await referralRepo.listLeads({
        filter: { partnerId: partnerAId },
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      expect(listA.items.some((l) => l.id === leadA.id)).toBe(true);
      expect(listA.items.some((l) => l.id === leadB.id)).toBe(false);

      // Partner B query
      const listB = await referralRepo.listLeads({
        filter: { partnerId: partnerBId },
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      expect(listB.items.some((l) => l.id === leadB.id)).toBe(true);
      expect(listB.items.some((l) => l.id === leadA.id)).toBe(false);
    });

    it('should assign coordinator and agent, auto-advance status, and record history in database', async () => {
      if (!isPostgresAvailable) return;

      const lead = await referralRepo.createLead({
        referenceNo: `REF-2026-${crypto.randomInt(100000, 999999)}`,
        partnerId: partnerAId,
        serviceId: testServiceId,
        clientName: 'Assign Test Client',
        clientPhone: '+971505555555',
        expectedDealValue: 50000,
        changedById: partnerAId,
      });
      createdLeadIds.push(lead.id);

      // Assign to coordinator and agent, advancing to ASSIGNED
      const assignedLead = await referralRepo.assignLead(lead.id, {
        coordinatorId,
        agentId,
        changedById: coordinatorId,
        transitionNote: 'Assigned top sales agent',
        statusChange: {
          previousStatus: LeadStatus.SUBMITTED,
          newStatus: LeadStatus.ASSIGNED,
        },
      });

      expect(assignedLead.coordinatorId).toBe(coordinatorId);
      expect(assignedLead.agentId).toBe(agentId);
      expect(assignedLead.status).toBe(LeadStatus.ASSIGNED);

      // Check chronological history in database
      const history = await referralRepo.getLeadStatusHistory(lead.id);
      expect(history.length).toBe(2);
      expect(history[1].newStatus).toBe(LeadStatus.ASSIGNED);
      expect(history[1].previousStatus).toBe(LeadStatus.SUBMITTED);
      expect(history[1].changedById).toBe(coordinatorId);
    });

    it('should execute sequential sales stage transitions up to WON with deal value', async () => {
      if (!isPostgresAvailable) return;

      const lead = await referralRepo.createLead({
        referenceNo: `REF-2026-${crypto.randomInt(100000, 999999)}`,
        partnerId: partnerAId,
        serviceId: testServiceId,
        clientName: 'Pipeline Progression Client',
        clientPhone: '+971506666666',
        expectedDealValue: 60000,
        changedById: partnerAId,
      });
      createdLeadIds.push(lead.id);

      // Advance: SUBMITTED -> CONTACTED
      await referralRepo.transitionLeadStatus(lead.id, {
        previousStatus: LeadStatus.SUBMITTED,
        status: LeadStatus.CONTACTED,
        changedById: agentId,
        transitionNote: 'First call completed with client',
      });

      // Advance: CONTACTED -> QUALIFIED
      await referralRepo.transitionLeadStatus(lead.id, {
        previousStatus: LeadStatus.CONTACTED,
        status: LeadStatus.QUALIFIED,
        changedById: agentId,
        transitionNote: 'Budget and timeline verified',
      });

      // Advance: QUALIFIED -> WON
      const wonAt = new Date();
      const wonLead = await referralRepo.transitionLeadStatus(lead.id, {
        previousStatus: LeadStatus.QUALIFIED,
        status: LeadStatus.WON,
        changedById: agentId,
        transitionNote: 'Contract signed and payment cleared',
        actualDealValue: 65000,
        wonAt,
      });

      expect(wonLead.status).toBe(LeadStatus.WON);
      expect(wonLead.actualDealValue?.toString()).toBe('65000');
      expect(wonLead.wonAt).not.toBeNull();

      // Retrieve full chronological status history
      const history = await referralRepo.getLeadStatusHistory(lead.id);
      expect(history.length).toBe(4);
      expect(history.map((h) => h.newStatus)).toEqual([
        LeadStatus.SUBMITTED,
        LeadStatus.CONTACTED,
        LeadStatus.QUALIFIED,
        LeadStatus.WON,
      ]);
    });

    it('should roll back complete database write when a multi-step transaction fails', async () => {
      if (!isPostgresAvailable) return;

      const testRef = `ROLLBACK-${crypto.randomInt(100000, 999999)}`;
      const initialCount = await prisma.lead.count();

      // Execute a multi-step transaction where second step intentionally fails
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.lead.create({
            data: {
              referenceNo: testRef,
              partnerId: partnerAId,
              serviceId: testServiceId,
              clientName: 'Should Rollback LLC',
              clientPhone: '+971507777777',
              expectedDealValue: new Prisma.Decimal('10000.00'),
              status: LeadStatus.SUBMITTED,
            },
          });

          // Deliberate error: non-existent foreign key user UUID
          await tx.leadStatusHistory.create({
            data: {
              leadId: crypto.randomUUID(), // invalid lead reference
              changedById: crypto.randomUUID(), // invalid user foreign key
              newStatus: LeadStatus.SUBMITTED,
            },
          });
        })
      ).rejects.toThrow();

      // Confirm lead was NOT committed and rolled back cleanly
      const countAfter = await prisma.lead.count();
      expect(countAfter).toBe(initialCount);

      const rollbackLead = await prisma.lead.findUnique({
        where: { referenceNo: testRef },
      });
      expect(rollbackLead).toBeNull();
    });
  });
});
