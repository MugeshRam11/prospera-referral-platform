// Run once as the beta operator, with stdout free of credentials.
const { PrismaClient } = require('@prisma/client');
const { randomBytes } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const argon2 = require('argon2');
const { getServiceMetadataDefaults } = require('../dist/modules/referrals/service-catalog.config');
const db = new PrismaClient();

async function provision() {
  const [target] = await db.$queryRaw`SELECT current_database() AS name, current_user AS owner`;
  if (target.name !== 'prospera_beta_20261128' || target.owner !== 'prospera_beta28') {
    throw new Error('Expected the dedicated client beta database and provisioning role.');
  }
  const roles = [
    ['admin', 'Platform Admin', 'ADMIN'],
    ['coordinator', 'Coordinator', 'COORDINATOR'],
    ['owner', 'Agency Owner', 'AGENT', 'AGENCY_OWNER'],
    ['agency-admin', 'Agency Admin', 'AGENT', 'AGENCY_ADMIN'],
    ['member', 'Agency Member', 'AGENT', 'AGENT'],
    ['agent', 'Independent Agent', 'AGENT'],
    ['partner', 'Corporate Referral Partner', 'REFERRAL_PARTNER'],
  ];
  const credentials = roles.map(([key]) => ({
    email: key + '@review.prospera.invalid', password: randomBytes(24).toString('base64url'),
  }));
  const hashes = await Promise.all(credentials.map(({ password }) => argon2.hash(password)));
  await db.$transaction(async tx => {
    const users = {};
    for (const [i, [key, fullName, role, agencyRole]] of roles.entries()) {
      users[key] = await tx.user.create({ data: {
        email: credentials[i].email, passwordHash: hashes[i], fullName, role,
        agentType: agencyRole ? 'AGENCY_MEMBER' : 'INDEPENDENT',
        coordinatorId: ['agent', 'partner'].includes(key) ? users.coordinator.id : null,
        accountStatus: 'ACTIVE', approvedAt: new Date(), emailVerifiedAt: new Date(),
      } });
    }
    await tx.agency.create({ data: {
      name: 'Prospera Review Agency', legalName: 'Prospera Review Agency', status: 'VERIFIED',
      tradeLicenseNo: 'BETA-REVIEW', email: 'agency@review.prospera.invalid', phone: '0000000000',
      createdById: users.owner.id, verifiedById: users.admin.id, verifiedAt: new Date(),
      members: { create: roles.filter(role => role[3]).map(([key,,,role]) => ({
        userId: users[key].id, role, status: 'ACTIVE',
      })) },
    } });
    const category = await tx.serviceCategory.create({ data: { slug: 'review-services', name: 'Review services' } });
    for (const [slug, name] of [
      ['free-zone', 'Free Zone Company Formation'], ['real-estate', 'Real Estate'],
      ['mortgage', 'Mortgage'], ['golden-visa', 'Golden Visa'], ['corporate-advisory', 'Corporate Advisory'],
    ]) {
      const meta = getServiceMetadataDefaults(slug);
      await tx.service.create({ data: {
        slug, name, categoryId: category.id, formType: meta.formType, eligibilityInfo: meta.eligibilityInfo,
        requiredDocs: meta.requiredDocs, expectedWorkflow: meta.expectedWorkflow,
        packages: { create: (meta.defaultPackages || []).map((p, displayOrder) => ({ ...p, displayOrder })) },
      } });
    }
    writeFileSync('../review-credentials.json', JSON.stringify(credentials), { flag: 'wx', mode: 0o600 });
  });
}

provision().catch(() => { console.error('Beta provisioning failed. Check the target and existing records.'); process.exitCode = 1; })
  .finally(() => db.$disconnect());
