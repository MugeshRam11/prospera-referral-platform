import argon2 from 'argon2';
import crypto from 'crypto';
import { Role, AccountStatus, OtpPurpose, User, Session } from '@prisma/client';
import { config } from '../../config';
import { getAuthRepository, IAuthRepository } from './auth.repository';
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

export class AuthService {
  private repo: IAuthRepository;

  constructor(repo?: IAuthRepository) {
    this.repo = repo ?? getAuthRepository();
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
   * Verify an OTP challenge
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

    // Check attempt limits
    if (challenge.attemptsCount >= challenge.maxAttempts) {
      throw new AppError(
        429,
        'Maximum verification attempts exceeded. Please request a new verification code.'
      );
    }

    // Increment attempts
    const newAttemptCount = challenge.attemptsCount + 1;
    await this.repo.updateOtpChallenge(challenge.id, {
      attemptsCount: newAttemptCount,
    });

    // Timing-safe HMAC comparison
    const inputHash = this.hashOtp(input.code);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(inputHash, 'hex'),
      Buffer.from(challenge.codeHash, 'hex')
    );

    if (!isMatch) {
      const remainingAttempts = challenge.maxAttempts - newAttemptCount;
      throw new AppError(
        400,
        `Invalid verification code. Attempts remaining: ${Math.max(0, remainingAttempts)}`
      );
    }

    // Mark challenge consumed
    await this.repo.updateOtpChallenge(challenge.id, {
      consumedAt: new Date(),
    });

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
   * Resend OTP with cooldown rate-limiting
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
   * Authenticate user with password and issue opaque session token
   */
  async login(
    input: LoginInput,
    clientInfo: { ipAddress?: string; userAgent?: string }
  ): Promise<{ sessionToken: string; expiresAt: Date; user: SafeUser }> {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user) {
      throw new AppError(401, 'Invalid email address or password');
    }

    if (
      user.accountStatus === AccountStatus.SUSPENDED ||
      user.accountStatus === AccountStatus.DEACTIVATED
    ) {
      throw new AppError(403, 'Account is inactive, suspended, or deactivated');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid email address or password');
    }

    if (user.accountStatus === AccountStatus.PENDING_VERIFICATION) {
      throw new AppError(
        403,
        'Email address not verified. Please verify your email using the OTP code before logging in.'
      );
    }

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
   * Validate an incoming session token
   */
  async validateSession(sessionToken: string): Promise<{ user: User; session: Session } | null> {
    const tokenHash = AuthService.hashSessionToken(sessionToken);
    const result = await this.repo.findSessionByTokenHash(tokenHash);

    if (!result) return null;
    if (result.revokedAt !== null) return null;
    if (new Date() > result.expiresAt) return null;

    if (
      result.user.accountStatus === AccountStatus.SUSPENDED ||
      result.user.accountStatus === AccountStatus.DEACTIVATED
    ) {
      return null;
    }

    // Update last active timestamp
    await this.repo.updateSession(result.id, { lastActiveAt: new Date() });

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
