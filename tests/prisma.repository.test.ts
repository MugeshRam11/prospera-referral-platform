// ============================================================================
// ISOLATED UNIT TESTS: PrismaAuthRepository (MOCKED PRISMA CLIENT)
//
// Note: These unit tests verify query arguments, atomic updates, and error
// handling of PrismaAuthRepository using a mocked Prisma Client.
// Real database migrations and live DB integration tests will run in Phase 4+.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Role, AccountStatus, OtpPurpose } from '../src/types';
import { PrismaAuthRepository } from '../src/modules/auth/auth.repository';
import { prisma } from '../src/lib/prisma';

// Mock the Prisma Client singleton
vi.mock('../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    otpChallenge: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

type MockFn = ReturnType<typeof vi.fn>;

interface MockPrismaClient {
  user: {
    findUnique: MockFn;
    create: MockFn;
    update: MockFn;
  };
  otpChallenge: {
    create: MockFn;
    findFirst: MockFn;
    update: MockFn;
    updateMany: MockFn;
  };
  session: {
    create: MockFn;
    findUnique: MockFn;
    update: MockFn;
    updateMany: MockFn;
  };
}

const prismaMock = prisma as unknown as MockPrismaClient;

describe('PrismaAuthRepository (Isolated Mocked Delegate Tests - SEC-07)', () => {
  let repository: PrismaAuthRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaAuthRepository();
  });

  describe('User Operations', () => {
    it('findUserByEmail should query user by lowercased email', async () => {
      const mockUser = { id: 'u-1', email: 'test@example.com', role: Role.REFERRAL_PARTNER };
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findUserByEmail('TEST@Example.com');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('createUser should call prisma.user.create with normalized lowercased email', async () => {
      const input = {
        email: 'Partner@Example.COM',
        passwordHash: 'argon2-hash-xyz',
        fullName: 'Partner User',
        role: Role.REFERRAL_PARTNER,
        accountStatus: AccountStatus.PENDING_VERIFICATION,
      };
      prismaMock.user.create.mockResolvedValue({ id: 'u-2', ...input, email: 'partner@example.com' });

      const result = await repository.createUser(input);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          ...input,
          email: 'partner@example.com',
        },
      });
      expect(result.id).toBe('u-2');
    });

    it('updateUser should call prisma.user.update with target id and payload', async () => {
      prismaMock.user.update.mockResolvedValue({ id: 'u-1', accountStatus: AccountStatus.ACTIVE });

      await repository.updateUser('u-1', { accountStatus: AccountStatus.ACTIVE });

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { accountStatus: AccountStatus.ACTIVE },
      });
    });
  });

  describe('OTP Operations & Concurrency (SEC-03, SEC-04)', () => {
    it('incrementOtpAttempts should execute atomic Prisma increment (SEC-03)', async () => {
      prismaMock.otpChallenge.update.mockResolvedValue({
        id: 'otp-1',
        attemptsCount: 3,
        maxAttempts: 5,
        consumedAt: null,
      });

      const result = await repository.incrementOtpAttempts('otp-1');

      expect(prismaMock.otpChallenge.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { attemptsCount: { increment: 1 } },
      });
      expect(result).toEqual({ attemptsCount: 3, maxAttempts: 5, isConsumed: false });
    });

    it('consumeOtpChallenge should atomically mark unconsumed challenge as consumed (SEC-03, SEC-04)', async () => {
      prismaMock.otpChallenge.updateMany.mockResolvedValue({ count: 1 });

      const consumed = await repository.consumeOtpChallenge('otp-1');

      expect(prismaMock.otpChallenge.updateMany).toHaveBeenCalledWith({
        where: { id: 'otp-1', consumedAt: null },
        data: { consumedAt: expect.any(Date) },
      });
      expect(consumed).toBe(true);
    });

    it('consumeOtpChallenge should return false if challenge is already consumed or missing', async () => {
      prismaMock.otpChallenge.updateMany.mockResolvedValue({ count: 0 });

      const consumed = await repository.consumeOtpChallenge('otp-already-used');

      expect(prismaMock.otpChallenge.updateMany).toHaveBeenCalledWith({
        where: { id: 'otp-already-used', consumedAt: null },
        data: { consumedAt: expect.any(Date) },
      });
      expect(consumed).toBe(false);
    });

    it('invalidateActiveOtpChallenges should update all unconsumed challenges matching email (SEC-04)', async () => {
      prismaMock.otpChallenge.updateMany.mockResolvedValue({ count: 2 });

      const count = await repository.invalidateActiveOtpChallenges('User@Test.com', OtpPurpose.SIGNUP_VERIFICATION);

      expect(prismaMock.otpChallenge.updateMany).toHaveBeenCalledWith({
        where: {
          email: 'user@test.com',
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
          consumedAt: null,
        },
        data: {
          consumedAt: expect.any(Date),
        },
      });
      expect(count).toBe(2);
    });

    it('findLatestOtpChallenge should order by createdAt descending', async () => {
      prismaMock.otpChallenge.findFirst.mockResolvedValue({ id: 'otp-latest' });

      await repository.findLatestOtpChallenge('user@test.com', OtpPurpose.SIGNUP_VERIFICATION);

      expect(prismaMock.otpChallenge.findFirst).toHaveBeenCalledWith({
        where: { email: 'user@test.com', purpose: OtpPurpose.SIGNUP_VERIFICATION },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('Session Operations', () => {
    it('createSession should invoke prisma.session.create with correct attributes', async () => {
      const sessionData = {
        userId: 'u-1',
        tokenHash: 'sha256-hash-value',
        expiresAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest/Agent',
      };
      prismaMock.session.create.mockResolvedValue({ id: 's-1', ...sessionData });

      const result = await repository.createSession(sessionData);

      expect(prismaMock.session.create).toHaveBeenCalledWith({ data: sessionData });
      expect(result.id).toBe('s-1');
    });

    it('findSessionByTokenHash should query by tokenHash and include user relation', async () => {
      prismaMock.session.findUnique.mockResolvedValue({ id: 's-1', user: { id: 'u-1' } });

      await repository.findSessionByTokenHash('hashed-token');

      expect(prismaMock.session.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: 'hashed-token' },
        include: { user: true },
      });
    });

    it('revokeSession should set revokedAt timestamp', async () => {
      prismaMock.session.update.mockResolvedValue({ id: 's-1', revokedAt: new Date() });

      await repository.revokeSession('s-1');

      expect(prismaMock.session.update).toHaveBeenCalledWith({
        where: { id: 's-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('revokeAllUserSessions should update active sessions for the user', async () => {
      prismaMock.session.updateMany.mockResolvedValue({ count: 4 });

      const count = await repository.revokeAllUserSessions('u-1');

      expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(count).toBe(4);
    });

    it('should propagate Prisma database errors to caller', async () => {
      const dbError = new Error('Database connection failure');
      prismaMock.user.findUnique.mockRejectedValue(dbError);

      await expect(repository.findUserByEmail('err@test.com')).rejects.toThrow('Database connection failure');
    });
  });
});
