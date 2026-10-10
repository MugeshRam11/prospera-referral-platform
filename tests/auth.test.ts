import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { Role, AccountStatus, OtpPurpose } from '../src/types';
import { app } from '../src/app';
import { getAuthRepository, InMemoryAuthRepository } from '../src/modules/auth/auth.repository';
import { getLoginThrottler } from '../src/modules/auth/loginThrottler';
import { parseEnv } from '../src/config';
import argon2 from 'argon2';

describe('Authentication and Role-Based Access Control', () => {
  const repo = getAuthRepository() as InMemoryAuthRepository;
  const throttler = getLoginThrottler();

  beforeEach(() => {
    // Reset in-memory database and login throttlers between tests
    if (typeof repo.clearAll === 'function') {
      repo.clearAll();
    }
    if (typeof throttler.clearAll === 'function') {
      throttler.clearAll();
    }
  });

  const validPassword = 'SecurePassword123!';
  const validRegistrationPayload = {
    email: 'test.partner@example.com',
    password: validPassword,
    fullName: 'Jane Referral Partner',
    phone: '+971501234567',
    companyName: 'Partner Realty LLC',
  };

  // ==========================================================================
  // SEC-01: PRODUCTION CONFIGURATION VALIDATION TESTS
  // ==========================================================================
  describe('SEC-01: Production Secret Enforcement', () => {
    it('should reject production startup if OTP_SECRET is missing or default placeholder', () => {
      // 1. Missing OTP_SECRET in production
      expect(() =>
        parseEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://prod:secret@db.internal:5432/prospera_prod',
        })
      ).toThrow('Invalid environment configuration');

      // 2. Default dev secret used in production
      expect(() =>
        parseEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://prod:secret@db.internal:5432/prospera_prod',
          OTP_SECRET: 'dev-only-otp-hmac-secret-min-32-chars-long-prospera',
        })
      ).toThrow('Invalid environment configuration');

      // 3. Short secret (< 32 chars) in production
      expect(() =>
        parseEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://prod:secret@db.internal:5432/prospera_prod',
          OTP_SECRET: 'short-prod-secret',
        })
      ).toThrow('Invalid environment configuration');

      // 4. Strong 32+ character high-entropy secret succeeds
      const validConfig = parseEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://prod:secret@db.internal:5432/prospera_prod',
        OTP_SECRET: 'super-secure-production-hmac-secret-with-high-entropy-64bytes!',
      });
      expect(validConfig.NODE_ENV).toBe('production');
      expect(validConfig.OTP_SECRET).toBe('super-secure-production-hmac-secret-with-high-entropy-64bytes!');
    });

    it('SEC-02: should fail safely at startup if REQUIRE_SHARED_THROTTLER is configured without shared store', () => {
      expect(() =>
        parseEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://prod:secret@db.internal:5432/prospera_prod',
          OTP_SECRET: 'super-secure-production-hmac-secret-with-high-entropy-64bytes!',
          REQUIRE_SHARED_THROTTLER: 'true',
        })
      ).toThrow('Invalid environment configuration');
    });
  });

  // ==========================================================================
  // 1. REGISTRATION TESTS
  // ==========================================================================
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with REFERRAL_PARTNER role and PENDING_VERIFICATION status', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(validRegistrationPayload.email);
      expect(res.body.data.user.role).toBe(Role.REFERRAL_PARTNER);
      expect(res.body.data.user.accountStatus).toBe(AccountStatus.PENDING_VERIFICATION);
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Never leaks hash
      expect(res.body.data.otpCode).toBeDefined(); // Available in test environment
    });

    it('should reject client-supplied privileged role and strictly enforce REFERRAL_PARTNER', async () => {
      const maliciousPayload = {
        ...validRegistrationPayload,
        email: 'attacker@example.com',
        role: 'ADMIN', // Attempting privilege escalation
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(maliciousPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe(Role.REFERRAL_PARTNER); // Strictly REFERRAL_PARTNER
      expect(res.body.data.user.role).not.toBe('ADMIN');

      const savedUser = await repo.findUserByEmail('attacker@example.com');
      expect(savedUser?.role).toBe(Role.REFERRAL_PARTNER);
    });

    it('should return 409 Conflict if email is already registered', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      const duplicateRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.error.message).toContain('already exists');
    });

    it('should reject weak passwords violating security complexity requirements', async () => {
      const weakPasswords = [
        'short1!', // < 8 chars
        'alllowercase123!', // No uppercase
        'ALLUPPERCASE123!', // No lowercase
        'NoSpecialCharacters123', // No special char
        'NoNumbersHere!', // No number
      ];

      for (const password of weakPasswords) {
        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({
            ...validRegistrationPayload,
            email: `user_${Math.random()}@example.com`,
            password,
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toHaveProperty('details');
      }
    });

    it('should return 400 on malformed email address', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...validRegistrationPayload,
          email: 'not-an-email',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================================================
  // 2. OTP VERIFICATION, CONCURRENCY & REPLACEMENT TESTS (SEC-03, SEC-04)
  // ==========================================================================
  describe('POST /api/v1/auth/verify-otp and resend-otp', () => {
    it('should verify email successfully with valid 6-digit code', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      const code = regRes.body.data.otpCode;
      expect(code).toBeDefined();

      const verifyRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: validRegistrationPayload.email,
          code,
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.emailVerified).toBe(true);

      const user = await repo.findUserByEmail(validRegistrationPayload.email);
      expect(user?.emailVerifiedAt).not.toBeNull();
      expect(user?.accountStatus).toBe(AccountStatus.PENDING_APPROVAL);
    });

    it('should reject invalid verification code and report remaining attempts', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: validRegistrationPayload.email,
          code: '999999', // Incorrect code
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Invalid verification code');
      expect(res.body.error.message).toContain('Attempts remaining: 4');
    });

    it('should enforce maximum five verification attempts limit and lock out', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      // Attempt 1 to 5 with wrong code
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/verify-otp')
          .send({
            email: validRegistrationPayload.email,
            code: '111111',
            purpose: OtpPurpose.SIGNUP_VERIFICATION,
          });
      }

      // 6th attempt should be blocked with 429
      const lockedRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: validRegistrationPayload.email,
          code: '111111',
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      expect(lockedRes.status).toBe(429);
      expect(lockedRes.body.error.message).toContain('Maximum verification attempts exceeded');
    });

    it('SEC-03: should be concurrency-safe under parallel verification burst attack', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      // Fire 10 simultaneous verification requests concurrently
      const attempts = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/v1/auth/verify-otp')
          .send({
            email: validRegistrationPayload.email,
            code: '000000', // Wrong code
            purpose: OtpPurpose.SIGNUP_VERIFICATION,
          })
      );

      const results = await Promise.all(attempts);

      // At least 5 requests must be rejected with 429 Too Many Requests
      const tooManyRequests = results.filter((r) => r.status === 429);
      expect(tooManyRequests.length).toBeGreaterThanOrEqual(5);

      // Inspect challenge: attemptsCount must equal 10 (atomic increment)
      const challenge = await repo.findLatestOtpChallenge(
        validRegistrationPayload.email,
        OtpPurpose.SIGNUP_VERIFICATION
      );
      expect(challenge?.attemptsCount).toBe(10);
    });

    it('SEC-03: should enforce single-use verification under concurrent submissions of the valid OTP', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      const validCode = regRes.body.data.otpCode;
      expect(validCode).toBeDefined();

      // Submit the exact same valid OTP 5 times concurrently
      const concurrentSubmissions = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/v1/auth/verify-otp')
          .send({
            email: validRegistrationPayload.email,
            code: validCode,
            purpose: OtpPurpose.SIGNUP_VERIFICATION,
          })
      );

      const results = await Promise.all(concurrentSubmissions);

      // Exactly ONE request must succeed (HTTP 200)
      const successful = results.filter((r) => r.status === 200);
      expect(successful.length).toBe(1);
      expect(successful[0].body.data.emailVerified).toBe(true);

      // All remaining 4 concurrent requests must be rejected (HTTP 400 - already used/invalidated)
      const rejected = results.filter((r) => r.status === 400);
      expect(rejected.length).toBe(4);
      rejected.forEach((r) => {
        expect(r.body.error.message).toMatch(/(already been used|No active verification code)/);
      });

      // Verify the challenge in the repository is consumed
      const challenge = await repo.findLatestOtpChallenge(
        validRegistrationPayload.email,
        OtpPurpose.SIGNUP_VERIFICATION
      );
      expect(challenge?.consumedAt).not.toBeNull();
    });

    it('SEC-03: should prevent attempt limit bypass when concurrent correct and incorrect submissions race', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      const validCode = regRes.body.data.otpCode;
      expect(validCode).toBeDefined();

      // Pre-populate 4 failed attempts so only 1 attempt remains before the limit of 5
      const challengeBefore = await repo.findLatestOtpChallenge(
        validRegistrationPayload.email,
        OtpPurpose.SIGNUP_VERIFICATION
      );
      if (challengeBefore) {
        await repo.updateOtpChallenge(challengeBefore.id, { attemptsCount: 4 });
      }

      // Fire 4 concurrent requests: 2 with wrong code, 2 with valid code
      const burst = [
        request(app).post('/api/v1/auth/verify-otp').send({ email: validRegistrationPayload.email, code: '111111', purpose: OtpPurpose.SIGNUP_VERIFICATION }),
        request(app).post('/api/v1/auth/verify-otp').send({ email: validRegistrationPayload.email, code: validCode, purpose: OtpPurpose.SIGNUP_VERIFICATION }),
        request(app).post('/api/v1/auth/verify-otp').send({ email: validRegistrationPayload.email, code: '222222', purpose: OtpPurpose.SIGNUP_VERIFICATION }),
        request(app).post('/api/v1/auth/verify-otp').send({ email: validRegistrationPayload.email, code: validCode, purpose: OtpPurpose.SIGNUP_VERIFICATION }),
      ];

      const results = await Promise.all(burst);

      // Total attempts recorded must reach 8 (4 initial + 4 burst)
      const challengeAfter = await repo.findLatestOtpChallenge(
        validRegistrationPayload.email,
        OtpPurpose.SIGNUP_VERIFICATION
      );
      expect(challengeAfter?.attemptsCount).toBe(8);

      // At most 1 request can succeed (it could succeed only if it ran at attempt #5 before 429 lockout)
      const successCount = results.filter((r) => r.status === 200).length;
      expect(successCount).toBeLessThanOrEqual(1);

      // Any attempt evaluated after attempt #5 must be locked out with HTTP 429
      const rateLimited = results.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThanOrEqual(1);
    });

    it('SEC-04: should invalidate previous unconsumed OTP code when a new code is issued on resend', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      const initialCode = regRes.body.data.otpCode;
      expect(initialCode).toBeDefined();

      // Fast-forward cooldown by updating previous challenge's createdAt
      const initialChallenge = await repo.findLatestOtpChallenge(
        validRegistrationPayload.email,
        OtpPurpose.SIGNUP_VERIFICATION
      );
      if (initialChallenge) {
        await repo.updateOtpChallenge(initialChallenge.id, {
          createdAt: new Date(Date.now() - 1000 * 120), // 2 minutes ago
        });
      }

      // Issue replacement code
      const resendRes = await request(app)
        .post('/api/v1/auth/resend-otp')
        .send({
          email: validRegistrationPayload.email,
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      expect(resendRes.status).toBe(200);
      const replacementCode = resendRes.body.data.otpCode;
      expect(replacementCode).toBeDefined();
      expect(replacementCode).not.toBe(initialCode);

      // Initial code must be rejected (it was invalidated when replacement was issued)
      const tryOldCodeRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: validRegistrationPayload.email,
          code: initialCode,
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      // The old challenge was marked consumed/superseded
      expect(tryOldCodeRes.status).toBe(400);

      // Replacement code succeeds
      const tryNewCodeRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: validRegistrationPayload.email,
          code: replacementCode,
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      expect(tryNewCodeRes.status).toBe(200);
      expect(tryNewCodeRes.body.data.emailVerified).toBe(true);
    });

    it('should reject expired OTP code', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      const code = regRes.body.data.otpCode;

      // Manually expire the challenge in the repository
      const challenge = await repo.findLatestOtpChallenge(
        validRegistrationPayload.email,
        OtpPurpose.SIGNUP_VERIFICATION
      );
      if (challenge) {
        await repo.updateOtpChallenge(challenge.id, {
          expiresAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
        });
      }

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: validRegistrationPayload.email,
          code,
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('expired');
    });

    it('should enforce 60-second cooldown on OTP resend requests', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      // Attempt immediate resend without waiting for cooldown
      const resendRes = await request(app)
        .post('/api/v1/auth/resend-otp')
        .send({
          email: validRegistrationPayload.email,
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      expect(resendRes.status).toBe(429);
      expect(resendRes.body.error.message).toContain('Please wait');
      expect(resendRes.body.error.message).toContain('seconds before requesting');
    });
  });

  // ==========================================================================
  // 3. LOGIN THROTTLING & TIMING ATTACK RESISTANCE (SEC-02, SEC-05)
  // ==========================================================================
  describe('POST /api/v1/auth/login and protected session routes', () => {
    it('SEC-02: should throttle login after 5 failed attempts per account', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: validRegistrationPayload.email,
          code: regRes.body.data.otpCode,
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      const user = await repo.findUserByEmail(validRegistrationPayload.email);
      if (user) {
        await repo.updateUser(user.id, { accountStatus: AccountStatus.ACTIVE });
      }

      // 5 failed password attempts
      for (let i = 0; i < 5; i++) {
        const failRes = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: validRegistrationPayload.email,
            password: 'WrongPassword123!',
          });
        expect(failRes.status).toBe(401);
      }

      // 6th attempt should be blocked with 429 Too Many Requests
      const throttledRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validRegistrationPayload.email,
          password: validPassword, // Even with correct password, account is throttled
        });

      expect(throttledRes.status).toBe(429);
      expect(throttledRes.body.error.message).toContain('Too many failed login attempts');
    });

    it('SEC-05: should return consistent 401 response and equalized behavior whether email exists or not', async () => {
      // Non-existent email
      const notFoundRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent.user@example.com',
          password: validPassword,
        });

      expect(notFoundRes.status).toBe(401);
      expect(notFoundRes.body.error.message).toBe('Invalid email address or password');

      // Existing email with wrong password
      await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      const wrongPassRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validRegistrationPayload.email,
          password: 'WrongPassword999!',
        });

      expect(wrongPassRes.status).toBe(401);
      expect(wrongPassRes.body.error.message).toBe('Invalid email address or password');
    });

    it('should reject login if email has not been verified', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validRegistrationPayload.email,
          password: validPassword,
        });

      expect(loginRes.status).toBe(403);
      expect(loginRes.body.error.message).toContain('Email address not verified');
    });

    it('should authenticate successfully with valid credentials after email verification', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: validRegistrationPayload.email,
          code: regRes.body.data.otpCode,
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      const user = await repo.findUserByEmail(validRegistrationPayload.email);
      if (user) {
        await repo.updateUser(user.id, { accountStatus: AccountStatus.ACTIVE });
      }

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validRegistrationPayload.email,
          password: validPassword,
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.body.data.sessionToken).toBeDefined();
      expect(typeof loginRes.body.data.sessionToken).toBe('string');
      expect(loginRes.body.data.sessionToken.length).toBe(64); // 32-byte hex string
      expect(loginRes.body.data.user.email).toBe(validRegistrationPayload.email);
    });

    it('should allow access to /api/v1/auth/me with valid session token', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: validRegistrationPayload.email,
          code: regRes.body.data.otpCode,
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      const user = await repo.findUserByEmail(validRegistrationPayload.email);
      if (user) {
        await repo.updateUser(user.id, { accountStatus: AccountStatus.ACTIVE });
      }

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validRegistrationPayload.email,
          password: validPassword,
        });

      const token = loginRes.body.data.sessionToken;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.user.email).toBe(validRegistrationPayload.email);
      expect(meRes.body.data.session).toBeDefined();
    });

    it('should return 401 on missing or invalid session token', async () => {
      const noTokenRes = await request(app).get('/api/v1/auth/me');
      expect(noTokenRes.status).toBe(401);

      const badTokenRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-value-12345');
      expect(badTokenRes.status).toBe(401);
    });
  });

  // ==========================================================================
  // 4. SESSION IDLE TIMEOUT & WRITE THROTTLING (SEC-06, SEC-08)
  // ==========================================================================
  describe('SEC-06 & SEC-08: Session Idle Timeout and Write Throttling', () => {
    it('SEC-06: should revoke and reject session if idle timeout exceeds 2 hours', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: validRegistrationPayload.email,
          code: regRes.body.data.otpCode,
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      const user = await repo.findUserByEmail(validRegistrationPayload.email);
      if (user) {
        await repo.updateUser(user.id, { accountStatus: AccountStatus.ACTIVE });
      }

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validRegistrationPayload.email, password: validPassword });

      const token = loginRes.body.data.sessionToken;

      // Manually age the session lastActiveAt beyond 2 hours (130 minutes ago)
      const session = await repo.findSessionByTokenHash(
        argon2 ? crypto.createHash('sha256').update(token).digest('hex') : ''
      );
      if (session) {
        await repo.updateSession(session.id, {
          lastActiveAt: new Date(Date.now() - 130 * 60 * 1000),
        });
      }

      // Next request must be rejected with 401 (idle timeout)
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(401);
      expect(meRes.body.error.message).toContain('invalid, expired, or revoked');
    });

    it('SEC-08: should not update lastActiveAt in database when requests are made within 5-minute touch window', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: validRegistrationPayload.email,
          code: regRes.body.data.otpCode,
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      const user = await repo.findUserByEmail(validRegistrationPayload.email);
      if (user) {
        await repo.updateUser(user.id, { accountStatus: AccountStatus.ACTIVE });
      }

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validRegistrationPayload.email, password: validPassword });

      const token = loginRes.body.data.sessionToken;
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const initialSession = await repo.findSessionByTokenHash(tokenHash);
      const initialLastActive = initialSession?.lastActiveAt.getTime();

      // Immediate request (< 1 minute elapsed)
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      const sessionAfterTouch = await repo.findSessionByTokenHash(tokenHash);
      // DB timestamp must remain identical (throttled write)
      expect(sessionAfterTouch?.lastActiveAt.getTime()).toBe(initialLastActive);
    });
  });

  // ==========================================================================
  // 5. SESSION REVOCATION & LOGOUT TESTS
  // ==========================================================================
  describe('Session revocation and logout', () => {
    it('should revoke session on logout and deny subsequent requests', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: validRegistrationPayload.email,
          code: regRes.body.data.otpCode,
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      const user = await repo.findUserByEmail(validRegistrationPayload.email);
      if (user) {
        await repo.updateUser(user.id, { accountStatus: AccountStatus.ACTIVE });
      }

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validRegistrationPayload.email,
          password: validPassword,
        });

      const token = loginRes.body.data.sessionToken;

      // Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Verify token is now rejected
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(401);
      expect(meRes.body.error.message).toContain('revoked');
    });

    it('should revoke all active sessions for a user on revoke-all-sessions', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validRegistrationPayload);

      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: validRegistrationPayload.email,
          code: regRes.body.data.otpCode,
          purpose: OtpPurpose.SIGNUP_VERIFICATION,
        });

      const user = await repo.findUserByEmail(validRegistrationPayload.email);
      if (user) {
        await repo.updateUser(user.id, { accountStatus: AccountStatus.ACTIVE });
      }

      // Create two independent sessions
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validRegistrationPayload.email, password: validPassword });

      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validRegistrationPayload.email, password: validPassword });

      const token1 = login1.body.data.sessionToken;
      const token2 = login2.body.data.sessionToken;

      // Revoke all sessions using token1
      const revokeRes = await request(app)
        .post('/api/v1/auth/revoke-all-sessions')
        .set('Authorization', `Bearer ${token1}`);

      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.data.revokedCount).toBe(2);

      // Both tokens must now be rejected
      const test1 = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token1}`);
      expect(test1.status).toBe(401);

      const test2 = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token2}`);
      expect(test2.status).toBe(401);
    });
  });

  // ==========================================================================
  // 6. ROLE & ACCOUNT STATUS AUTHORIZATION TESTS (SEC-09)
  // ==========================================================================
  describe('Role-based authorization middleware with account status enforcement (SEC-09)', () => {
    let partnerToken: string;
    let pendingPartnerToken: string;
    let adminToken: string;
    let coordinatorToken: string;

    beforeEach(async () => {
      const passwordHash = await argon2.hash(validPassword);

      // Seed Active Partner
      const partner = await repo.createUser({
        email: 'partner@example.com',
        passwordHash,
        fullName: 'Partner User',
        role: Role.REFERRAL_PARTNER,
        accountStatus: AccountStatus.ACTIVE,
      });

      // Seed Partner with PENDING_APPROVAL status (SEC-09)
      const pendingPartner = await repo.createUser({
        email: 'pending.partner@example.com',
        passwordHash,
        fullName: 'Pending Partner User',
        role: Role.REFERRAL_PARTNER,
        accountStatus: AccountStatus.PENDING_APPROVAL,
      });

      // Seed Coordinator
      const coordinator = await repo.createUser({
        email: 'coordinator@example.com',
        passwordHash,
        fullName: 'Coordinator User',
        role: Role.COORDINATOR,
        accountStatus: AccountStatus.ACTIVE,
      });

      // Seed Admin
      const admin = await repo.createUser({
        email: 'admin@example.com',
        passwordHash,
        fullName: 'Admin User',
        role: Role.ADMIN,
        accountStatus: AccountStatus.ACTIVE,
      });

      const partnerLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: partner.email, password: validPassword });
      partnerToken = partnerLogin.body.data.sessionToken;

      const pendingLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: pendingPartner.email, password: validPassword });
      pendingPartnerToken = pendingLogin.body.data.sessionToken;

      const coordLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: coordinator.email, password: validPassword });
      coordinatorToken = coordLogin.body.data.sessionToken;

      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: admin.email, password: validPassword });
      adminToken = adminLogin.body.data.sessionToken;
    });

    it('SEC-09: should deny user whose accountStatus is PENDING_APPROVAL even if role matches', async () => {
      const res = await request(app)
        .get('/api/v1/auth/partner-only')
        .set('Authorization', `Bearer ${pendingPartnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Account status \'PENDING_APPROVAL\' is not permitted');
    });

    it('should deny REFERRAL_PARTNER access to admin-only endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin-only')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Access denied');
    });

    it('should deny REFERRAL_PARTNER access to coordinator-only endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/auth/coordinator-only')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Access denied');
    });

    it('should allow active REFERRAL_PARTNER access to partner-only endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/auth/partner-only')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Authorized referral partner');
    });

    it('should deny COORDINATOR access to admin-only endpoint with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin-only')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Access denied');
    });

    it('should allow COORDINATOR access to coordinator-only endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/auth/coordinator-only')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow ADMIN access to admin-only endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Authorized administrator');
    });

    it('should allow ADMIN access to coordinator-only endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/auth/coordinator-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 when accessing protected endpoints without authentication', async () => {
      const res = await request(app).get('/api/v1/auth/admin-only');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
