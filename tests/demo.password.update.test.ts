
import { describe, it, expect } from 'vitest';
import {
  DEMO_EMAILS,
  DEMO_PERSONAS,
  validateDatabaseUrl,
  hashArgon2Password,
  verifyArgon2Password,
  generateSecurePersonaPassword,
} from '../scripts/demo-password-utils';

describe('Demo Password Update & Restoration Utility Test Suite', () => {
  describe('1. Target Database & Environment Safety Guards', () => {
    it('should refuse execution when NODE_ENV is production', () => {
      const result = validateDatabaseUrl(
        'postgresql://prospera_dev:secret@localhost:5432/prospera_dev',
        'production'
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('production');
    });

    it('should refuse execution when DATABASE_URL is missing or empty', () => {
      expect(validateDatabaseUrl('', 'development').valid).toBe(false);
      expect(validateDatabaseUrl(undefined, 'development').valid).toBe(false);
      expect(validateDatabaseUrl('   ', 'development').valid).toBe(false);
    });

    it('should refuse malformed DATABASE_URL formats', () => {
      const result = validateDatabaseUrl('not-a-valid-url', 'development');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not a valid URL format');
    });

    it('should refuse execution against remote or non-localhost hosts', () => {
      const remoteUrls = [
        'postgresql://user:pass@88.222.245.75:5432/prospera_dev',
        'postgresql://user:pass@remote.db.server.com:5432/prospera_dev',
        'postgresql://user:pass@192.168.1.100:5432/prospera_dev',
        'postgresql://user:pass@rds.amazonaws.com:5432/prospera_dev',
      ];

      for (const url of remoteUrls) {
        const result = validateDatabaseUrl(url, 'development');
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('must be localhost or 127.0.0.1');
      }
    });

    it('should refuse execution against non-prospera_dev databases', () => {
      const forbiddenDbs = [
        'postgresql://user:pass@localhost:5432/prospera_prod',
        'postgresql://user:pass@localhost:5432/prospera_test',
        'postgresql://user:pass@127.0.0.1:5432/postgres',
        'postgresql://user:pass@localhost:5432/defaultdb',
      ];

      for (const url of forbiddenDbs) {
        const result = validateDatabaseUrl(url, 'development');
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('strictly be "prospera_dev"');
      }
    });

    it('should successfully validate valid local prospera_dev targets', () => {
      const validUrls = [
        'postgresql://prospera_dev_user:secret@localhost:5432/prospera_dev',
        'postgresql://prospera_dev_user:secret@127.0.0.1:5432/prospera_dev',
        'postgresql://prospera_dev_user:secret@[::1]:5432/prospera_dev',
        'postgresql://prospera_dev_user:secret@localhost:5432/prospera_dev?schema=public&sslmode=disable',
      ];

      for (const url of validUrls) {
        const result = validateDatabaseUrl(url, 'development');
        expect(result.valid).toBe(true);
        expect(result.reason).toBeUndefined();
      }
    });
  });

  describe('2. Argon2 Hashing & Verification Implementation', () => {
    it('should hash temporary password "0000" using Argon2id configuration', async () => {
      const hash = await hashArgon2Password('0000');
      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');

      // Verify correct password succeeds
      const isValid = await verifyArgon2Password(hash, '0000');
      expect(isValid).toBe(true);

      // Verify incorrect password fails
      const isInvalid = await verifyArgon2Password(hash, 'wrong_pass');
      expect(isInvalid).toBe(false);
    });

    it('should safely reject invalid hash inputs during verification', async () => {
      const isValid = await verifyArgon2Password('corrupted_hash', '0000');
      expect(isValid).toBe(false);
    });
  });

  describe('3. Synthetic Demo Personas Invariants', () => {
    it('should define exactly 7 specific synthetic demo personas', () => {
      expect(DEMO_PERSONAS).toHaveLength(7);
      expect(DEMO_EMAILS).toHaveLength(7);

      const expectedEmails = [
        'admin@demo.prospera.test',
        'agent.independent@demo.prospera.test',
        'agency.owner@demo.prospera.test',
        'agency.admin@demo.prospera.test',
        'agency.member@demo.prospera.test',
        'coordinator@demo.prospera.test',
        'partner.corporate@demo.prospera.test',
      ];

      for (const email of expectedEmails) {
        expect(DEMO_EMAILS).toContain(email);
      }
    });

    it('should generate high-entropy unique random passwords for restoration', () => {
      const pwd1 = generateSecurePersonaPassword('admin');
      const pwd2 = generateSecurePersonaPassword('admin');

      expect(pwd1).not.toBe(pwd2);
      expect(pwd1.startsWith('Pr0sp!')).toBe(true);
      expect(pwd1.endsWith('#admin')).toBe(true);
      expect(pwd1.length).toBeGreaterThanOrEqual(24);
    });
  });
});

