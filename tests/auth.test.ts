import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { Role, AccountStatus, OtpPurpose } from '../src/types';
import { app } from '../src/app';
import { getAuthRepository, InMemoryAuthRepository } from '../src/modules/auth/auth.repository';
import argon2 from 'argon2';

describe('Authentication and Role-Based Access Control', () => {
  const repo = getAuthRepository() as InMemoryAuthRepository;

  beforeEach(() => {
    // Reset in-memory database between tests
    if (typeof repo.clearAll === 'function') {
      repo.clearAll();
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
  // 2. OTP VERIFICATION & RATE LIMIT TESTS
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
  // 3. LOGIN & SESSION MANAGEMENT TESTS
  // ==========================================================================
  describe('POST /api/v1/auth/login and protected session routes', () => {
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

      // Update status to ACTIVE
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

    it('should reject login with incorrect password with 401 Unauthorized', async () => {
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

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validRegistrationPayload.email,
          password: 'WrongPassword123!',
        });

      expect(loginRes.status).toBe(401);
      expect(loginRes.body.error.message).toContain('Invalid email address or password');
    });

    it('should reject login with non-existent email with 401 Unauthorized', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: validPassword,
        });

      expect(loginRes.status).toBe(401);
      expect(loginRes.body.error.message).toContain('Invalid email address or password');
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
  // 4. SESSION REVOCATION & LOGOUT TESTS
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
  // 5. ROLE-BASED ACCESS CONTROL (DENY-BY-DEFAULT) TESTS
  // ==========================================================================
  describe('Role-based authorization middleware (deny-by-default)', () => {
    let partnerToken: string;
    let adminToken: string;
    let coordinatorToken: string;

    beforeEach(async () => {
      const passwordHash = await argon2.hash(validPassword);

      // Seed Partner
      const partner = await repo.createUser({
        email: 'partner@example.com',
        passwordHash,
        fullName: 'Partner User',
        role: Role.REFERRAL_PARTNER,
        accountStatus: AccountStatus.ACTIVE,
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

      const coordLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: coordinator.email, password: validPassword });
      coordinatorToken = coordLogin.body.data.sessionToken;

      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: admin.email, password: validPassword });
      adminToken = adminLogin.body.data.sessionToken;
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
      expect(res.body.error.message).toContain('Access denied');
    });

    it('should allow REFERRAL_PARTNER access to partner-only endpoint', async () => {
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
