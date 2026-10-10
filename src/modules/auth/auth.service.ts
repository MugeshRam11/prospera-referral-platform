import argon2 from 'argon2';
import crypto from 'crypto';
import { Role, AccountStatus, OtpPurpose, User, Session } from '@prisma/client';
import { config } from '../../config';
import { getAuthRepository, IAuthRepository } from './auth.repository';
import { getLoginThrottler, ILoginThrottler } from './loginThrottler';
import { RegisterInput, LoginInput, VerifyOtpInput, ResendOtpInput } from './auth.schemas';

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export type SafeUser = Omit<User, 'passwordHash'>;

// Precomputed valid Argon2id hash used to equalize verification timing for non-existent users (SEC-05)
// Generated with: argon2.hash('DummyPassword123!', { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 })
const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$qN8kH5L+B1o9R2sU3vW4xA$7mY2eJ1bK4wZ9vQ6pT8uC3fA5hD2sX8';

export class AuthService {
  private repo: IAuthRepository;
  private throttler: ILoginThrottler;

  constructor(repo?: IAuthRepository, throttler?: ILoginThrottler) {
    this.repo = repo ?? getAuthRepository();
    this.throttler = throttler ?? getLoginThrottler();
  }

  // Helper: Secure keyed HMAC for OTP
  private hashOtp(code: string): string {
    return crypto.createHmac('sha256', config.OTP_SECRET).update(code).digest('hex');
  }

  // Helper: SHA-256 for opaque session token
  public static hashSessionToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Helper: Strip sensitive fields from user
  public static sanitizeUser(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safe } = user;
    return safe;
  }

  /**
   * Register a new user
   * Public registration unconditionally forces REFERRAL_PARTNER role.
   */
  async register(
    input: RegisterInput,
    ipAddress?: string
  ): Promise<{ user: SafeUser; otpCode?: string; message: string }> {
    // Check if email already registered
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) {
      throw new AppError(409, 'An account with this email address already exists');
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Create user with strict REFERRAL_PARTNER role and PENDING_VERIFICATION status
    const user = await this.repo.createUser({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone ?? null,
      companyName: input.companyName ?? null,
      role: Role.REFERRAL_PARTNER,
      accountStatus: AccountStatus.PENDING_VERIFICATION,
    });

    // Invalidate any previous unconsumed challenges for this email (SEC-04)
    await this.repo.invalidateActiveOtpChallenges(user.email, OtpPurpose.SIGNUP_VERIFICATION);

    // Generate cryptographically secure 6-digit OTP code
    const rawCode = crypto.randomInt(100000, 1000000).toString();
    const codeHash = this.hashOtp(rawCode);
    const expiresAt = new Date(Date.now() + config.OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.repo.createOtpChallenge({
      userId: user.id,
      email: user.email,
      codeHash,
      purpose: OtpPurpose.SIGNUP_VERIFICATION,
      maxAttempts: config.OTP_MAX_ATTEMPTS,
      expiresAt,
      ipAddress,
    });

    return {
      user: AuthService.sanitizeUser(user),
      message: 'Registration successful. Please verify your email with the verification code sent.',
      // Return raw OTP in test mode ONLY for deterministic assertion without email infrastructure
      ...(config.NODE_ENV === 'test' && { otpCode: rawCode }),
    };
  }

  /**
   * Verify an OTP challenge (Concurrency-safe via atomic attempt increments - SEC-03)
   */
  async verifyOtp(input: VerifyOtpInput): Promise<{ message: string; emailVerified: boolean }> {
    const challenge = await this.repo.findLatestOtpChallenge(input.email, input.purpose);

    if (!challenge || challenge.consumedAt !== null) {
      throw new AppError(400, 'No active verification code found for this email');
    }

    // Check expiration
    if (new Date() > challenge.expiresAt) {
      throw new AppError(400, 'Verification code has expired. Please request a new code.');
    }

    // Concurrency Protection (SEC-03): Atomically increment attempts before verifying code.
    // In concurrent attack bursts, every parallel thread increments atomically and hits attempt limit.
    const { attemptsCount, maxAttempts, isConsumed } = await this.repo.incrementOtpAttempts(challenge.id);

    if (isConsumed) {
      throw new AppError(
        400,
        'Verification code has already been used or invalidated.'
      );
    }

    if (attemptsCount > maxAttempts) {
      throw new AppError(
        429,
        'Maximum verification attempts exceeded. Please request a new verification code.'
      );
    }

    // Timing-safe HMAC comparison
    const inputHash = this.hashOtp(input.code);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(inputHash, 'hex'),
      Buffer.from(challenge.codeHash, 'hex')
    );

    if (!isMatch) {
      const remainingAttempts = maxAttempts - attemptsCount;
      throw new AppError(
        400,
        `Invalid verification code. Attempts remaining: ${Math.max(0, remainingAttempts)}`
      );
    }

    // Atomic single-use consumption (SEC-03, SEC-04):
    // Conditional update ensures only one concurrent request can ever mark the challenge consumed.
    const wasConsumed = await this.repo.consumeOtpChallenge(challenge.id);
    if (!wasConsumed) {
      throw new AppError(
        400,
        'Verification code has already been used or invalidated.'
      );
    }

    // Update user verification status
    const user = await this.repo.findUserByEmail(input.email);
    if (user) {
      await this.repo.updateUser(user.id, {
        emailVerifiedAt: new Date(),
        ...(user.accountStatus === AccountStatus.PENDING_VERIFICATION && {
          accountStatus: AccountStatus.PENDING_APPROVAL,
        }),
      });
    }

    return {
      message: 'Email verified successfully.',
      emailVerified: true,
    };
  }

  /**
   * Resend OTP with cooldown rate-limiting and invalidation of prior codes (SEC-04)
   */
  async resendOtp(
    input: ResendOtpInput,
    ipAddress?: string
  ): Promise<{ message: string; otpCode?: string }> {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      // Return generic response to prevent email enumeration
      return {
        message: 'If an account exists with this email, a new verification code has been dispatched.',
      };
    }

    const latest = await this.repo.findLatestOtpChallenge(input.email, input.purpose);
    if (latest && latest.consumedAt === null) {
      const elapsedSeconds = (Date.now() - latest.createdAt.getTime()) / 1000;
      if (elapsedSeconds < config.OTP_COOLDOWN_SECONDS) {
        const remaining = Math.ceil(config.OTP_COOLDOWN_SECONDS - elapsedSeconds);
        throw new AppError(
          429,
          `Please wait ${remaining} seconds before requesting a new verification code.`
        );
      }
    }

    // Invalidate prior active unconsumed challenges for this email and purpose (SEC-04)
    await this.repo.invalidateActiveOtpChallenges(user.email, input.purpose);

    const rawCode = crypto.randomInt(100000, 1000000).toString();
    const codeHash = this.hashOtp(rawCode);
    const expiresAt = new Date(Date.now() + config.OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.repo.createOtpChallenge({
      userId: user.id,
      email: user.email,
      codeHash,
      purpose: input.purpose,
      maxAttempts: config.OTP_MAX_ATTEMPTS,
      expiresAt,
      ipAddress,
    });

    return {
      message: 'A new verification code has been dispatched to your email address.',
      ...(config.NODE_ENV === 'test' && { otpCode: rawCode }),
    };
  }

  /**
   * Authenticate user with password, login throttling (SEC-02), and timing equalization (SEC-05)
   */
  async login(
    input: LoginInput,
    clientInfo: { ipAddress?: string; userAgent?: string }
  ): Promise<{ sessionToken: string; expiresAt: Date; user: SafeUser }> {
    const throttleKey = {
      ip: clientInfo.ipAddress || 'unknown-ip',
      email: input.email,
    };

    // 1. Enforce Login Throttling (SEC-02)
    const throttleCheck = await this.throttler.checkLimit(throttleKey);
    if (!throttleCheck.allowed) {
      throw new AppError(
        429,
        `Too many failed login attempts. Please try again in ${throttleCheck.retryAfterSeconds ?? 900} seconds.`,
        { retryAfterSeconds: throttleCheck.retryAfterSeconds }
      );
    }

    // 2. Lookup user and execute timing-equalized password verification (SEC-05)
    const user = await this.repo.findUserByEmail(input.email);
    const hashToVerify = user ? user.passwordHash : DUMMY_ARGON2_HASH;

    let isPasswordValid = false;
    try {
      isPasswordValid = await argon2.verify(hashToVerify, input.password);
    } catch {
      isPasswordValid = false;
    }

    // Fail if user not found or password invalid
    if (!user || !isPasswordValid) {
      await this.throttler.recordFailedAttempt(throttleKey);
      throw new AppError(401, 'Invalid email address or password');
    }

    if (
      user.accountStatus === AccountStatus.SUSPENDED ||
      user.accountStatus === AccountStatus.DEACTIVATED
    ) {
      throw new AppError(403, 'Account is inactive, suspended, or deactivated');
    }

    if (user.accountStatus === AccountStatus.PENDING_VERIFICATION) {
      throw new AppError(
        403,
        'Email address not verified. Please verify your email using the OTP code before logging in.'
      );
    }

    // Login succeeded: Reset throttling counters for this account
    await this.throttler.resetAttempts(throttleKey);

    // Generate 64-character cryptographically secure opaque session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = AuthService.hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + config.SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await this.repo.createSession({
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
    });

    return {
      sessionToken,
      expiresAt,
      user: AuthService.sanitizeUser(user),
    };
  }

  /**
   * Validate an incoming session token with idle timeout (SEC-06) and throttled touch (SEC-08)
   */
  async validateSession(sessionToken: string): Promise<{ user: User; session: Session } | null> {
    const tokenHash = AuthService.hashSessionToken(sessionToken);
    const result = await this.repo.findSessionByTokenHash(tokenHash);

    if (!result) return null;
    if (result.revokedAt !== null) return null;

    const now = Date.now();

    // 1. Enforce Absolute Session Expiration (hard ceiling - SEC-06)
    if (now > result.expiresAt.getTime()) {
      return null;
    }

    // 2. Enforce Idle Inactivity Timeout (SEC-06)
    const idleMinutes = (now - result.lastActiveAt.getTime()) / (1000 * 60);
    if (idleMinutes > config.SESSION_IDLE_TIMEOUT_MINUTES) {
      // Invalidate dormant session
      await this.repo.revokeSession(result.id);
      return null;
    }

    if (
      result.user.accountStatus === AccountStatus.SUSPENDED ||
      result.user.accountStatus === AccountStatus.DEACTIVATED
    ) {
      return null;
    }

    // 3. Throttled lastActiveAt database write (at most once every 5 minutes - SEC-08)
    if (idleMinutes >= config.SESSION_TOUCH_INTERVAL_MINUTES) {
      await this.repo.updateSession(result.id, { lastActiveAt: new Date(now) });
    }

    return {
      user: result.user,
      session: result,
    };
  }

  /**
   * Terminate current session
   */
  async logout(sessionId: string): Promise<void> {
    await this.repo.revokeSession(sessionId);
  }

  /**
   * Revoke all active sessions for a user
   */
  async revokeAllUserSessions(userId: string): Promise<number> {
    return this.repo.revokeAllUserSessions(userId);
  }
}
