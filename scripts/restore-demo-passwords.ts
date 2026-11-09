import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import { prisma } from '../src/lib/prisma';
import {
  DEMO_EMAILS,
  DEMO_PERSONAS,
  BACKUP_FILE_PATH,
  PERSONAS_CATALOG_PATH,
  validateDatabaseUrl,
  hashArgon2Password,
  generateSecurePersonaPassword,
} from './demo-password-utils';

/**
 * Restore script for synthetic demo personas in `prospera_dev`.
 * Restores individually generated, secure cryptographic passwords.
 *
 * Workflow:
 * 1. Verifies database is strictly `prospera_dev` on localhost and not production.
 * 2. Checks that all 7 demo accounts exist in the database.
 * 3. If `.dev-demo-password-backup.json` exists, restores original hashes from backup.
 *    Otherwise, generates fresh high-entropy random passwords and updates `.dev-demo-personas.json`.
 * 4. Never logs passwords or password hashes.
 */
async function restoreDemoPasswords() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const dbUrl = process.env.DATABASE_URL;

  // 1. Invariant: Validate target environment and database URL
  const validation = validateDatabaseUrl(dbUrl, nodeEnv);
  if (!validation.valid) {
    console.error(`[FATAL] ${validation.reason}`);
    console.error('[FATAL] This script is restricted to local development on database "prospera_dev".');
    console.error('[NOTICE] On the Hostinger VPS (/opt/prospera/work/kyc-demo), execute via wrapper:');
    console.error('         bash scripts/vps-backend.sh dev demo:restore-passwords');
    process.exit(1);
  }

  console.log('[DEMO RESTORE] Initializing restoration of secure demo credentials...');
  console.log('[DEMO RESTORE] Verified environment: database "prospera_dev" on localhost.');

  // 2. Fetch existing demo users
  const existingUsers = await prisma.user.findMany({
    where: {
      email: { in: [...DEMO_EMAILS] },
    },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
    },
  });

  // 3. Invariant: Refuse execution if any expected demo account is missing
  const foundEmailSet = new Set(existingUsers.map((u) => u.email));
  const missingEmails = DEMO_EMAILS.filter((email) => !foundEmailSet.has(email));

  if (missingEmails.length > 0) {
    console.error('[FATAL] One or more expected demo accounts are missing in prospera_dev:');
    for (const email of missingEmails) {
      console.error(`  - Missing: ${email}`);
    }
    console.error('[FATAL] Refusing execution. Please run the full demo seed script first:');
    console.error('         npm run seed:demo');
    process.exit(1);
  }

  console.log(`[DEMO RESTORE] Confirmed all ${existingUsers.length} synthetic demo accounts are present.`);

  // 4. Check for existing backup
  let restoredFromBackup = false;
  if (fs.existsSync(BACKUP_FILE_PATH)) {
    try {
      const backupRaw = fs.readFileSync(BACKUP_FILE_PATH, 'utf-8');
      const backupData = JSON.parse(backupRaw);

      if (Array.isArray(backupData.accounts) && backupData.accounts.length === DEMO_EMAILS.length) {
        console.log('[DEMO RESTORE] Found valid password hash backup file (.dev-demo-password-backup.json).');
        for (const backedUp of backupData.accounts) {
          await prisma.user.update({
            where: { email: backedUp.email },
            data: {
              passwordHash: backedUp.passwordHash,
            },
          });
          console.log(`[DEMO RESTORE] Restored backed-up hash for: ${backedUp.email}`);
        }
        restoredFromBackup = true;

        // Clean up backup file
        try {
          fs.unlinkSync(BACKUP_FILE_PATH);
          console.log('[DEMO RESTORE] Removed temporary backup file.');
        } catch {
          // Non-critical
        }
      }
    } catch (err) {
      console.warn('[DEMO RESTORE] Could not parse backup file; falling back to fresh high-entropy generation.');
    }
  }

  // 5. If no backup or backup failed, generate fresh high-entropy passwords
  if (!restoredFromBackup) {
    console.log('[DEMO RESTORE] Generating fresh high-entropy passwords for all 7 demo personas...');
    const personaCredentials: Record<string, string> = {};

    for (const persona of DEMO_PERSONAS) {
      const freshPassword = generateSecurePersonaPassword(persona.key);
      const freshHash = await hashArgon2Password(freshPassword);
      personaCredentials[persona.key] = freshPassword;

      await prisma.user.update({
        where: { email: persona.email },
        data: {
          passwordHash: freshHash,
        },
      });
      console.log(`[DEMO RESTORE] Generated and updated secure credentials for: ${persona.email}`);
    }

    // Save updated credentials to protected local persona catalog
    const catalogData = {
      generatedAt: new Date().toISOString(),
      notice: 'SYNTHETIC DEMO PERSONAS FOR ISOLATED DEVELOPMENT TESTING. NEVER COMMIT TO GIT.',
      personas: DEMO_PERSONAS.map((p) => ({
        key: p.key,
        email: p.email,
        fullName: p.fullName,
        secureGeneratedPassword: personaCredentials[p.key],
      })),
    };

    fs.writeFileSync(PERSONAS_CATALOG_PATH, JSON.stringify(catalogData, null, 2), {
      mode: 0o600,
    });
    console.log(`[DEMO RESTORE] Saved fresh credentials catalog to: ${PERSONAS_CATALOG_PATH}`);
  }

  console.log('[DEMO RESTORE] SUCCESS: Secure individual passwords restored for all 7 demo accounts.');
  console.log('[DEMO RESTORE] All account roles, KYC, banking, and agency data remained untouched.');
}

restoreDemoPasswords()
  .catch((err) => {
    console.error('[DEMO RESTORE ERROR]', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

