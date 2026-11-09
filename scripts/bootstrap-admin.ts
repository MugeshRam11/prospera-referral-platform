import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/prisma';
import argon2 from 'argon2';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Role, AccountStatus, AgentType } from '@prisma/client';

/**
 * Platform Admin Bootstrap Script for Development Environment.
 * 
 * Safety invariants:
 * - Refuses execution if NODE_ENV is 'production'
 * - Idempotent
 * - Generates cryptographically strong random password
 * - Hashes password using argon2 (matching auth system)
 * - Sets ACTIVE account status and verified email
 * - Saves credentials locally to protected .dev-admin-credentials.json (git-ignored)
 * - Never prints credentials to stdout or application logs
 */
async function bootstrapAdmin() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    console.error('[FATAL] Bootstrap script cannot be executed against production environment.');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.warn('[NOTICE] DATABASE_URL is not configured in the current environment.');
    console.warn('[NOTICE] To seed on the Hostinger VPS, execute:');
    console.warn('         bash scripts/vps-backend.sh dev seed:admin');
    console.warn('[NOTICE] Or supply DATABASE_URL="postgresql://..." in your local .env file.');
    return;
  }

  const adminEmail = process.env.DEV_ADMIN_EMAIL || 'admin@demo.prospera.test';
  const adminFullName = 'Prospera Platform Administrator';

  console.log(`[BOOTSTRAP] Initializing platform administrator for development...`);
  console.log(`[BOOTSTRAP] Target email: ${adminEmail}`);

  // Generate high-entropy 24-character random password
  const randomChars = crypto.randomBytes(18).toString('base64url');
  const generatedPassword = `Pr0sp!${randomChars}#Admin`;
  const passwordHash = await argon2.hash(generatedPassword);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  let adminUser;
  if (existingAdmin) {
    adminUser = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        fullName: adminFullName,
        passwordHash,
        role: Role.ADMIN,
        agentType: AgentType.INDEPENDENT,
        accountStatus: AccountStatus.ACTIVE,
        emailVerifiedAt: existingAdmin.emailVerifiedAt ?? new Date(),
        approvedAt: existingAdmin.approvedAt ?? new Date(),
      },
    });
    console.log(`[BOOTSTRAP] Existing admin account (${adminUser.id}) updated with fresh credentials.`);
  } else {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        fullName: adminFullName,
        passwordHash,
        role: Role.ADMIN,
        agentType: AgentType.INDEPENDENT,
        accountStatus: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        approvedAt: new Date(),
      },
    });
    console.log(`[BOOTSTRAP] New platform admin user created (${adminUser.id}).`);
  }

  // Persist generated credentials to local protected file
  const credentialsFilePath = path.resolve(process.cwd(), '.dev-admin-credentials.json');
  const credentialsPayload = {
    email: adminEmail,
    password: generatedPassword,
    role: 'ADMIN',
    accountStatus: 'ACTIVE',
    userId: adminUser.id,
    generatedAt: new Date().toISOString(),
    notice: 'PROTECTED DEVELOPMENT CREDENTIALS. NEVER COMMIT TO GIT OR REVEAL PUBLICLY.',
  };

  fs.writeFileSync(credentialsFilePath, JSON.stringify(credentialsPayload, null, 2), {
    mode: 0o600,
  });

  console.log(`[BOOTSTRAP] SUCCESS: Administrative account provisioned successfully.`);
  console.log(`[BOOTSTRAP] Protected credentials stored in local file: .dev-admin-credentials.json`);
}

bootstrapAdmin()
  .catch((err) => {
    console.error('[BOOTSTRAP ERROR]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

