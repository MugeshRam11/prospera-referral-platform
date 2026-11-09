import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import {
  createUserSchema,
  inviteUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userQuerySchema,
} from '../src/modules/admin/admin.validation';
import { Role, AccountStatus } from '../src/types';

describe('Admin User Management & Platform Roles Test Suite', () => {
  const app = createApp();

  describe('1. Endpoint Authentication & Authorization Protection', () => {
    it('should deny unauthenticated requests to /api/v1/admin/users with 401', async () => {
      const res = await request(app).get('/api/v1/admin/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toMatch(/Authentication required/i);
    });

    it('should deny unauthenticated POST to /api/v1/admin/users with 401', async () => {
      const res = await request(app).post('/api/v1/admin/users').send({
        fullName: 'Test User',
        email: 'test@example.com',
        role: Role.AGENT,
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should deny unauthenticated POST to /api/v1/admin/users/invite with 401', async () => {
      const res = await request(app).post('/api/v1/admin/users/invite').send({
        fullName: 'Test User',
        email: 'test@example.com',
        role: Role.COORDINATOR,
      });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should deny unauthenticated requests to /api/v1/admin/coordinators with 401', async () => {
      const res = await request(app).get('/api/v1/admin/coordinators');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should deny unauthenticated requests to /api/v1/admin/partners with 401', async () => {
      const res = await request(app).get('/api/v1/admin/partners');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should deny unauthenticated requests to /api/v1/admin/referrals with 401', async () => {
      const res = await request(app).get('/api/v1/admin/referrals');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should deny unauthenticated requests to /api/v1/admin/banking with 401', async () => {
      const res = await request(app).get('/api/v1/admin/banking');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should deny unauthenticated requests to /api/v1/admin/commissions with 401', async () => {
      const res = await request(app).get('/api/v1/admin/commissions');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should deny unauthenticated requests to /api/v1/admin/reports with 401', async () => {
      const res = await request(app).get('/api/v1/admin/reports');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. User Validation Schemas & Role Assignment', () => {
    it('should validate valid user creation input', () => {
      const input = {
        fullName: 'Ahmed Al Mansoori',
        email: 'ahmed.mansoori@demo.prospera.test',
        phone: '+971501234567',
        role: Role.AGENT,
        agentType: 'INDEPENDENT',
        accountStatus: AccountStatus.ACTIVE,
      };
      const result = createUserSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('ahmed.mansoori@demo.prospera.test');
        expect(result.data.role).toBe(Role.AGENT);
      }
    });

    it('should reject invalid email during user creation', () => {
      const input = {
        fullName: 'Invalid User',
        email: 'not-an-email',
        role: Role.AGENT,
      };
      const result = createUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate valid user invite input', () => {
      const input = {
        fullName: 'Sarah Coordinator',
        email: 'sarah.coord@demo.prospera.test',
        role: Role.COORDINATOR,
      };
      const result = inviteUserSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate permitted profile update input', () => {
      const input = {
        fullName: 'Updated Name',
        phone: '+971509998877',
        whatsapp: '+971509998877',
        brn: 'BRN-998877',
        nationality: 'United Arab Emirates',
        companyName: 'Apex Capital Realty',
      };
      const result = updateUserSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate user status transition input', () => {
      const input = {
        status: AccountStatus.SUSPENDED,
        reason: 'Compliance review pending required AML documents',
      };
      const result = updateUserStatusSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate query filters with default pagination', () => {
      const query = {
        role: 'AGENT',
        accountStatus: 'ACTIVE',
        kycStatus: 'VERIFIED',
      };
      const result = userQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.role).toBe('AGENT');
      }
    });
  });
});

