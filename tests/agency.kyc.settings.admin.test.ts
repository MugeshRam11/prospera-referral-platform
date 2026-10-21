import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { ProfileService } from '../src/modules/profile/profile.service';
import {
  encryptSensitive,
  decryptSensitive,
  maskIban,
  extractIbanLast4,
} from '../src/lib/encryption';
import {
  verifyMagicBytes,
  storePrivateDocument,
  MAX_FILE_SIZE_BYTES,
} from '../src/lib/documentStorage';

describe('Agent KYC, Settings, Banking & Admin Test Suite', () => {
  describe('1. Profile Completion Calculation', () => {
    const profileService = new ProfileService();

    it('should calculate 0% completion for empty profile', () => {
      const result = profileService.calculateCompletion({});
      expect(result.percentage).toBe(0);
      expect(result.isComplete).toBe(false);
      expect(result.checklist.every((c) => !c.completed)).toBe(true);
    });

    it('should calculate accurate percentage for partial profile', () => {
      const result = profileService.calculateCompletion({
        fullName: 'Mugesh Ram',
        phone: '+971501234567',
        whatsapp: '+971501234567',
      });
      // Name (15) + Phone (15) + WhatsApp (10) = 40%
      expect(result.percentage).toBe(40);
      expect(result.isComplete).toBe(false);
    });

    it('should mark profile complete (>=85%) when all required fields and KYC/bank are supplied', () => {
      const result = profileService.calculateCompletion({
        fullName: 'Mugesh Ram',
        phone: '+971501234567',
        whatsapp: '+971501234567',
        avatarUrl: 'https://cdn.example.com/avatar.jpg',
        brn: 'BRN-123456',
        kycDocuments: [{ status: 'VERIFIED' }],
        bankAccounts: [{ isVerified: true }],
      });
      // 15 + 15 + 10 + 10 + 15 + 20 + 15 = 100%
      expect(result.percentage).toBe(100);
      expect(result.isComplete).toBe(true);
      expect(result.checklist.every((c) => c.completed)).toBe(true);
    });
  });

  describe('2. Banking AES-256-GCM Encryption and Masking', () => {
    it('should encrypt and successfully decrypt sensitive IBAN', () => {
      const originalIban = 'AE120330000012345678901';
      const encrypted = encryptSensitive(originalIban);

      expect(encrypted).not.toBe(originalIban);
      expect(encrypted.split(':').length).toBe(3); // iv:tag:ciphertext

      const decrypted = decryptSensitive(encrypted);
      expect(decrypted).toBe(originalIban);
    });

    it('should mask IBAN preserving country code and last 4 characters', () => {
      const iban = 'AE120330000012345678901';
      const masked = maskIban(iban);

      expect(masked.startsWith('AE')).toBe(true);
      expect(masked.endsWith('8901')).toBe(true);
      expect(masked).toBe('AE*****************8901');
    });

    it('should extract last 4 characters correctly', () => {
      expect(extractIbanLast4('AE120330000012345678901')).toBe('8901');
      expect(extractIbanLast4('GB29NWBK60161331926819')).toBe('6819');
    });
  });

  describe('3. Secure Document Validation & Magic Bytes', () => {
    it('should verify genuine PDF file header (%PDF)', () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\n%...\n', 'utf8');
      expect(verifyMagicBytes(validPdfBuffer, 'application/pdf')).toBe(true);
    });

    it('should verify genuine JPEG file header', () => {
      const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(verifyMagicBytes(validJpegBuffer, 'image/jpeg')).toBe(true);
    });

    it('should verify genuine PNG file header', () => {
      const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(verifyMagicBytes(validPngBuffer, 'image/png')).toBe(true);
    });

    it('should reject spoofed file (e.g. PHP script disguised as PDF)', () => {
      const maliciousBuffer = Buffer.from('<?php echo "evil"; ?>', 'utf8');
      expect(verifyMagicBytes(maliciousBuffer, 'application/pdf')).toBe(false);
    });

    it('should reject file exceeding MAX_FILE_SIZE_BYTES limit', async () => {
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
      await expect(
        storePrivateDocument(oversizedBuffer, 'huge.pdf', 'application/pdf')
      ).rejects.toThrow(/exceeds maximum allowed limit/i);
    });
  });

  describe('4. Centralized Access Control & Role Protection', () => {
    const app = createApp();

    it('should deny unauthenticated requests to /api/v1/admin/overview with 401', async () => {
      const response = await request(app).get('/api/v1/admin/overview');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toMatch(/Authentication required/i);
    });

    it('should deny unauthenticated requests to /api/v1/profile with 401', async () => {
      const response = await request(app).get('/api/v1/profile');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should deny unauthenticated requests to /api/v1/agency/my-agency with 401', async () => {
      const response = await request(app).get('/api/v1/agency/my-agency');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should deny unauthenticated requests to /api/v1/kyc/documents with 401', async () => {
      const response = await request(app).get('/api/v1/kyc/documents');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should deny unauthenticated requests to /api/v1/banking/accounts with 401', async () => {
      const response = await request(app).get('/api/v1/banking/accounts');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
