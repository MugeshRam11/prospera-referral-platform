import { User, Session, OtpChallenge, Role, AccountStatus, OtpPurpose } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import crypto from 'crypto';

export type UserCreateInput = {
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string | null;
  companyName?: string | null;
  role: Role;
  accountStatus: AccountStatus;
};

export type OtpCreateInput = {
  email: string;
  codeHash: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  maxAttempts: number;
  ipAddress?: string | null;
  userId?: string | null;
};

export type SessionCreateInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export interface IAuthRepository {
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  createUser(data: UserCreateInput): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;

  createOtpChallenge(data: OtpCreateInput): Promise<OtpChallenge>;
  findLatestOtpChallenge(email: string, purpose: OtpPurpose): Promise<OtpChallenge | null>;
  updateOtpChallenge(id: string, data: Partial<OtpChallenge>): Promise<OtpChallenge>;
  incrementOtpAttempts(id: string): Promise<{ attemptsCount: number; maxAttempts: number; isConsumed: boolean }>;
  consumeOtpChallenge(id: string): Promise<boolean>;
  invalidateActiveOtpChallenges(email: string, purpose: OtpPurpose): Promise<number>;

  createSession(data: SessionCreateInput): Promise<Session>;
  findSessionByTokenHash(tokenHash: string): Promise<(Session & { user: User }) | null>;
  updateSession(id: string, data: Partial<Session>): Promise<Session>;
  revokeSession(id: string): Promise<Session>;
  revokeAllUserSessions(userId: string): Promise<number>;
  clearAll?(): void;
}

export class PrismaAuthRepository implements IAuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: UserCreateInput): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
      },
    });
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async createOtpChallenge(data: OtpCreateInput): Promise<OtpChallenge> {
    return prisma.otpChallenge.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
      },
    });
  }

  async findLatestOtpChallenge(email: string, purpose: OtpPurpose): Promise<OtpChallenge | null> {
    return prisma.otpChallenge.findFirst({
      where: { email: email.toLowerCase(), purpose },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOtpChallenge(id: string, data: Partial<OtpChallenge>): Promise<OtpChallenge> {
    return prisma.otpChallenge.update({ where: { id }, data });
  }

  /**
   * Atomic increment for OTP attempts to prevent concurrency race conditions (SEC-03)
   */
  async incrementOtpAttempts(id: string): Promise<{ attemptsCount: number; maxAttempts: number; isConsumed: boolean }> {
    const updated = await prisma.otpChallenge.update({
      where: { id },
      data: { attemptsCount: { increment: 1 } },
    });
    return {
      attemptsCount: updated.attemptsCount,
      maxAttempts: updated.maxAttempts,
      isConsumed: updated.consumedAt !== null,
    };
  }

  /**
   * Atomic conditional consumption of OTP challenge (SEC-03 / SEC-04)
   * Enforces single-use verification under concurrent requests.
   */
  async consumeOtpChallenge(id: string): Promise<boolean> {
    const res = await prisma.otpChallenge.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return res.count > 0;
  }

  /**
   * Invalidate prior active unconsumed OTP challenges when issuing a replacement (SEC-04)
   */
  async invalidateActiveOtpChallenges(email: string, purpose: OtpPurpose): Promise<number> {
    const res = await prisma.otpChallenge.updateMany({
      where: { email: email.toLowerCase(), purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return res.count;
  }

  async createSession(data: SessionCreateInput): Promise<Session> {
    return prisma.session.create({ data });
  }

  async findSessionByTokenHash(tokenHash: string): Promise<(Session & { user: User }) | null> {
    return prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async updateSession(id: string, data: Partial<Session>): Promise<Session> {
    return prisma.session.update({ where: { id }, data });
  }

  async revokeSession(id: string): Promise<Session> {
    return prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }
}

export class InMemoryAuthRepository implements IAuthRepository {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();
  private otpChallenges: Map<string, OtpChallenge> = new Map();

  clearAll(): void {
    this.users.clear();
    this.sessions.clear();
    this.otpChallenges.clear();
  }

  async findUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return { ...user };
      }
    }
    return null;
  }

  async findUserById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async createUser(data: UserCreateInput): Promise<User> {
    const id = crypto.randomUUID();
    const now = new Date();
    const user: User = {
      id,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      phone: data.phone ?? null,
      role: data.role,
      accountStatus: data.accountStatus,
      coordinatorId: null,
      companyName: data.companyName ?? null,
      referralCode: null,
      emailVerifiedAt: null,
      kycVerifiedAt: null,
      approvedAt: null,
      approvedById: null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return { ...user };
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new Error(`User ${id} not found`);
    }
    const updated: User = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return { ...updated };
  }

  async createOtpChallenge(data: OtpCreateInput): Promise<OtpChallenge> {
    const id = crypto.randomUUID();
    const challenge: OtpChallenge = {
      id,
      userId: data.userId ?? null,
      email: data.email.toLowerCase(),
      codeHash: data.codeHash,
      purpose: data.purpose,
      attemptsCount: 0,
      maxAttempts: data.maxAttempts,
      expiresAt: data.expiresAt,
      consumedAt: null,
      ipAddress: data.ipAddress ?? null,
      createdAt: new Date(),
    };
    this.otpChallenges.set(id, challenge);
    return { ...challenge };
  }

  async findLatestOtpChallenge(email: string, purpose: OtpPurpose): Promise<OtpChallenge | null> {
    let latest: OtpChallenge | null = null;
    for (const challenge of this.otpChallenges.values()) {
      if (challenge.email.toLowerCase() === email.toLowerCase() && challenge.purpose === purpose) {
        if (!latest || challenge.createdAt > latest.createdAt) {
          latest = challenge;
        }
      }
    }
    return latest ? { ...latest } : null;
  }

  async updateOtpChallenge(id: string, data: Partial<OtpChallenge>): Promise<OtpChallenge> {
    const existing = this.otpChallenges.get(id);
    if (!existing) {
      throw new Error(`OtpChallenge ${id} not found`);
    }
    const updated: OtpChallenge = {
      ...existing,
      ...data,
    };
    this.otpChallenges.set(id, updated);
    return { ...updated };
  }

  /**
   * Atomic increment for in-memory repo (SEC-03)
   */
  async incrementOtpAttempts(id: string): Promise<{ attemptsCount: number; maxAttempts: number; isConsumed: boolean }> {
    const existing = this.otpChallenges.get(id);
    if (!existing) {
      throw new Error(`OtpChallenge ${id} not found`);
    }
    existing.attemptsCount += 1;
    return {
      attemptsCount: existing.attemptsCount,
      maxAttempts: existing.maxAttempts,
      isConsumed: existing.consumedAt !== null,
    };
  }

  /**
   * Atomic conditional consumption for in-memory repo (SEC-03 / SEC-04)
   */
  async consumeOtpChallenge(id: string): Promise<boolean> {
    const existing = this.otpChallenges.get(id);
    if (!existing || existing.consumedAt !== null) {
      return false;
    }
    existing.consumedAt = new Date();
    return true;
  }

  /**
   * Invalidate prior active challenges (SEC-04)
   */
  async invalidateActiveOtpChallenges(email: string, purpose: OtpPurpose): Promise<number> {
    let count = 0;
    const now = new Date();
    for (const challenge of this.otpChallenges.values()) {
      if (
        challenge.email.toLowerCase() === email.toLowerCase() &&
        challenge.purpose === purpose &&
        challenge.consumedAt === null
      ) {
        challenge.consumedAt = now;
        count++;
      }
    }
    return count;
  }

  async createSession(data: SessionCreateInput): Promise<Session> {
    const id = crypto.randomUUID();
    const now = new Date();
    const session: Session = {
      id,
      userId: data.userId,
      tokenHash: data.tokenHash,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      expiresAt: data.expiresAt,
      lastActiveAt: now,
      revokedAt: null,
      createdAt: now,
    };
    this.sessions.set(id, session);
    return { ...session };
  }

  async findSessionByTokenHash(tokenHash: string): Promise<(Session & { user: User }) | null> {
    for (const session of this.sessions.values()) {
      if (session.tokenHash === tokenHash) {
        const user = this.users.get(session.userId);
        if (!user) return null;
        return {
          ...session,
          user: { ...user },
        };
      }
    }
    return null;
  }

  async updateSession(id: string, data: Partial<Session>): Promise<Session> {
    const existing = this.sessions.get(id);
    if (!existing) {
      throw new Error(`Session ${id} not found`);
    }
    const updated: Session = {
      ...existing,
      ...data,
    };
    this.sessions.set(id, updated);
    return { ...updated };
  }

  async revokeSession(id: string): Promise<Session> {
    return this.updateSession(id, { revokedAt: new Date() });
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    let count = 0;
    const now = new Date();
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt) {
        session.revokedAt = now;
        count++;
      }
    }
    return count;
  }
}

// In test environment or when database is not yet migrated, default to InMemoryAuthRepository
let currentRepository: IAuthRepository =
  process.env.NODE_ENV === 'test' ? new InMemoryAuthRepository() : new PrismaAuthRepository();

export const getAuthRepository = (): IAuthRepository => currentRepository;

export const setAuthRepository = (repo: IAuthRepository): void => {
  currentRepository = repo;
};
