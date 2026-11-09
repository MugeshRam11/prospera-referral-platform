import argon2 from 'argon2';
import crypto from 'crypto';
import path from 'path';

export const DEMO_PERSONAS = [
  {
    key: 'admin',
    email: 'admin@demo.prospera.test',
    fullName: 'Sultan Al Qasimi (Platform Admin)',
  },
  {
    key: 'independent_agent',
    email: 'agent.independent@demo.prospera.test',
    fullName: 'Tariq Mansour (Independent Agent)',
  },
  {
    key: 'agency_owner',
    email: 'agency.owner@demo.prospera.test',
    fullName: 'Layla Al Nuaimi (Agency Owner)',
  },
  {
    key: 'agency_admin',
    email: 'agency.admin@demo.prospera.test',
    fullName: 'Farhan Zaidi (Agency Admin)',
  },
  {
    key: 'agency_member',
    email: 'agency.member@demo.prospera.test',
    fullName: 'Elena Rostova (Agency Member)',
  },
  {
    key: 'coordinator',
    email: 'coordinator@demo.prospera.test',
    fullName: 'Rashed Al Maktoum (Lead Coordinator)',
  },
  {
    key: 'referral_partner',
    email: 'partner.corporate@demo.prospera.test',
    fullName: 'Marcus Vance (Corporate Referral Partner)',
  },
] as const;

export const DEMO_EMAILS = DEMO_PERSONAS.map((p) => p.email);

export const BACKUP_FILE_PATH = path.resolve(process.cwd(), '.dev-demo-password-backup.json');
export const PERSONAS_CATALOG_PATH = path.resolve(process.cwd(), '.dev-demo-personas.json');

/**
 * Validates that DATABASE_URL strictly points to prospera_dev on localhost
 * and that execution is prohibited in production.
 */
export function validateDatabaseUrl(
  rawUrl?: string,
  nodeEnv: string = process.env.NODE_ENV || 'development'
): { valid: boolean; reason?: string } {
  if (nodeEnv.toLowerCase() === 'production') {
    return {
      valid: false,
      reason: 'Refusing execution: Temporary demo password update cannot run when NODE_ENV is "production".',
    };
  }

  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return {
      valid: false,
      reason: 'DATABASE_URL environment variable is missing or empty.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return {
      valid: false,
      reason: 'DATABASE_URL is not a valid URL format.',
    };
  }

  const rawHost = parsed.hostname.toLowerCase();
  // Strip IPv6 enclosing brackets if present
  const hostname = rawHost.replace(/^\[|\]$/g, '');
  const allowedHosts = ['localhost', '127.0.0.1', '::1'];

  if (!allowedHosts.includes(hostname)) {
    return {
      valid: false,
      reason: `Refusing execution: DATABASE_URL host must be localhost or 127.0.0.1 (found: "${parsed.hostname}"). Operations are strictly prohibited on remote or non-local hosts.`,
    };
  }

  // Extract database name from pathname, ignoring query string
  const pathname = parsed.pathname.replace(/^\/+/, '');
  const dbName = pathname.split('/')[0]?.split('?')[0];

  if (dbName !== 'prospera_dev') {
    return {
      valid: false,
      reason: `Refusing execution: DATABASE_URL target database must strictly be "prospera_dev" (found: "${dbName}"). Operations are prohibited on any other database.`,
    };
  }

  return { valid: true };
}

/**
 * Hashes password using the platform's standard Argon2id configuration.
 */
export async function hashArgon2Password(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verifies password against hash using Argon2.
 */
export async function verifyArgon2Password(hash: string, plainPassword: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainPassword);
  } catch {
    return false;
  }
}

/**
 * Generates a high-entropy 24-character random password for individual restoration.
 */
export function generateSecurePersonaPassword(key: string): string {
  const entropy = crypto.randomBytes(16).toString('base64url');
  return `Pr0sp!${entropy}#${key}`;
}

