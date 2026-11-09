import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import { prisma } from '../src/lib/prisma';
import {
  DEMO_EMAILS,
  DEMO_PERSONAS,
  BACKUP_FILE_PATH,
  validateDatabaseUrl,
  hashArgon2Password,
} from './demo-password-utils';

/**
 * Temporary development password update script.
 * Updates the 7 synthetic demo accounts in `prospera_dev` on localhost to temporary password '0000'.
 *
 * Strict safety rules:
 * - Refuses production
 * - Verifies DATABASE_URL targets 'prospera_dev' on localhost
 * - Refuses if any of the 7 expected demo accounts are missing
 * - Modifies ONLY passwordHash (leaves roles, KYC, banking, agency, referrals intact)
 * - Backs up original hashes to .dev-demo-password-backup.json (mode 0o600)
 * - Never logs passwords or password hashes
 */
async function setDemoTempPassword() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const dbUrl = process.env.DATABASE_URL;

  // 1. Invariant: Validate target environment and database URL
  const validation = validateDatabaseUrl(dbUrl, nodeEnv);
  if (!validation.valid) {
    console.error(`[FATAL] ${validation.reason}`);
    console.error('[FATAL] This script is restricted to local development on database "prospera_dev".');
    console.error('[NOTICE] On the Hostinger VPS (/opt/prospera/work/kyc-demo), execute via wrapper:');
    console.error('         bash scripts/vps-backend.sh dev demo:temp-password');
    process.exit(1);
  }

  console.log('[DEMO PASSWORD] Initializing temporary password update for development demo users...');
  console.log('[DEMO PASSWORD] Verified environment: database "prospera_dev" on localhost.');

  // 2. Fetch existing demo users
  const existingUsers = await prisma.user.findMany({
    where: {
      email: { in: [...DEMO_EMAILS] },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      agentType: true,
      accountStatus: true,
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

  console.log(`[DEMO PASSWORD] Confirmed all ${existingUsers.length} synthetic demo accounts are present.`);

  // 4. Create local backup of existing password hashes for easy restoration
  const backupPayload = {
    backedUpAt: new Date().toISOString(),
    targetDatabase: 'prospera_dev',
    notice: 'PROTECTED LOCAL BACKUP OF PREVIOUS DEMO PASSWORD HASHES. DO NOT COMMIT TO GIT.',
    accounts: existingUsers.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      passwordHash: u.passwordHash,
    })),
  };

  fs.writeFileSync(BACKUP_FILE_PATH, JSON.stringify(backupPayload, null, 2), {
    mode: 0o600,
  });
  console.log(`[DEMO PASSWORD] Backed up current password hashes to: ${BACKUP_FILE_PATH}`);

  // 5. Generate Argon2 hash for the temporary password
  // (Password value is not logged or exposed)
  const tempPassword = '0000';
  const tempHash = await hashArgon2Password(tempPassword);

  // 6. Update ONLY the passwordHash of the 7 demo accounts
  // All other fields (roles, accountStatus, kyc, banking, agency, referrals) are left untouched
  for (const user of existingUsers) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: tempHash,
      },
    });
    console.log(`[DEMO PASSWORD] Updated password hash for: ${user.email} (${user.role})`);
  }

  console.log('[DEMO PASSWORD] SUCCESS: Password hashes updated for all 7 synthetic demo accounts.');
  console.log('[DEMO PASSWORD] All roles, KYC records, banking data, agency memberships, and referrals were preserved.');
  console.log('[DEMO PASSWORD] NOTICE: This temporary configuration is strictly for isolated local UI testing.');
  console.log('[DEMO PASSWORD] To restore secure individually generated credentials at any time, run:');
  console.log('         npm run demo:restore-passwords');
}

setDemoTempPassword()
  .catch((err) => {
    console.error('[DEMO PASSWORD ERROR]', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

