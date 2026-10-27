import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes recommended for GCM

/**
 * Returns a 32-byte Buffer derived from config.ENCRYPTION_KEY or a secure fallback.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || config.OTP_SECRET || 'prospera-secure-default-encryption-key-32b!';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts sensitive text using AES-256-GCM.
 * Output format: <ivHex>:<tagHex>:<ciphertextHex>
 */
export function encryptSensitive(text: string): string {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM encrypted text.
 */
export function decryptSensitive(encryptedPayload: string): string {
  if (!encryptedPayload || !encryptedPayload.includes(':')) {
    return encryptedPayload;
  }

  const [ivHex, tagHex, ciphertextHex] = encryptedPayload.split(':');
  if (!ivHex || !tagHex || !ciphertextHex) {
    throw new Error('Invalid encrypted payload format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Masks an IBAN for display, preserving country code and last 4 characters.
 * E.g., 'AE120330000012345678901' -> 'AE*****************8901'
 */
export function maskIban(iban: string): string {
  if (!iban) return '';
  const cleaned = iban.replace(/\s+/g, '').toUpperCase();
  if (cleaned.length <= 6) return cleaned;
  
  const prefix = cleaned.substring(0, 2);
  const suffix = cleaned.substring(cleaned.length - 4);
  const maskedLength = cleaned.length - 6;
  return `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
}

/**
 * Extracts last 4 alphanumeric characters from IBAN.
 */
export function extractIbanLast4(iban: string): string {
  const cleaned = iban.replace(/\s+/g, '');
  return cleaned.slice(-4);
}
