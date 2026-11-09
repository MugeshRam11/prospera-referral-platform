import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/prisma';
import argon2 from 'argon2';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  Role,
  AccountStatus,
  AgentType,
  AgencyRole,
  AgencyStatus,
  KycDocumentType,
  KycStatus,
  LeadStatus,
  CommissionEntryType,
  CommissionStatus,
  Prisma,
} from '@prisma/client';
import { encryptSensitive, extractIbanLast4 } from '../src/lib/encryption';

/**
 * Seed script for Multi-Role Synthetic Demo Personas.
 * Uses the @demo.prospera.test email namespace.
 * Refuses execution in production.
 */
async function seedDemoUsers() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    console.error('[FATAL] Demo seed script cannot run in production.');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.warn('[NOTICE] DATABASE_URL is not configured in the current environment.');
    console.warn('[NOTICE] To seed on the Hostinger VPS, execute:');
    console.warn('         bash scripts/vps-backend.sh dev seed:demo');
    console.warn('[NOTICE] Or supply DATABASE_URL="postgresql://..." in your local .env file.');
    return;
  }

  console.log('[SEED] Starting synthetic multi-role demo seeding...');

  // 1. Seed Service Categories & Services
  console.log('[SEED] Setting up service catalog...');
  const catRealEstate = await prisma.serviceCategory.upsert({
    where: { slug: 'real-estate' },
    update: {},
    create: {
      slug: 'real-estate',
      name: 'Real Estate & Properties',
      description: 'Prime and off-plan UAE residential and commercial investments.',
      isActive: true,
    },
  });

  const catFinancial = await prisma.serviceCategory.upsert({
    where: { slug: 'financial-advisory' },
    update: {},
    create: {
      slug: 'financial-advisory',
      name: 'Financial & Corporate Advisory',
      description: 'Corporate structuring, DIFC holding foundations, and financing.',
      isActive: true,
    },
  });

  const srvLuxuryRE = await prisma.service.upsert({
    where: { slug: 'uae-luxury-real-estate' },
    update: {},
    create: {
      slug: 'uae-luxury-real-estate',
      name: 'UAE Luxury Real Estate',
      description: 'Waterfront villas, penthouses, and prime branded residences across Dubai & Abu Dhabi.',
      categoryId: catRealEstate.id,
      defaultPartnerCommissionBps: 200,
      defaultAgentCommissionBps: 150,
      isActive: true,
    },
  });

  const srvMortgage = await prisma.service.upsert({
    where: { slug: 'mortgage-advisory' },
    update: {},
    create: {
      slug: 'mortgage-advisory',
      name: 'UAE Mortgage Financing',
      description: 'Competitive resident and non-resident mortgage underwriting with UAE top-tier banks.',
      categoryId: catFinancial.id,
      defaultPartnerCommissionBps: 75,
      defaultAgentCommissionBps: 50,
      isActive: true,
    },
  });

  const srvGoldenVisa = await prisma.service.upsert({
    where: { slug: 'uae-golden-visa' },
    update: {},
    create: {
      slug: 'uae-golden-visa',
      name: 'UAE Golden Visa Program',
      description: '10-Year UAE residency processing for property investors, entrepreneurs and senior executives.',
      categoryId: catFinancial.id,
      defaultPartnerCommissionBps: 300,
      defaultAgentCommissionBps: 200,
      isActive: true,
    },
  });

  // Persona definitions
  const personas = [
    {
      key: 'admin',
      email: 'admin@demo.prospera.test',
      fullName: 'Sultan Al Qasimi (Platform Admin)',
      role: Role.ADMIN,
      agentType: AgentType.INDEPENDENT,
      companyName: 'Prospera Governance',
      phone: '+971500000001',
      description: 'Executive compliance officer with full access to User Management, KYC review, banking verification, and audit logs.',
    },
    {
      key: 'independent_agent',
      email: 'agent.independent@demo.prospera.test',
      fullName: 'Tariq Mansour (Independent Agent)',
      role: Role.AGENT,
      agentType: AgentType.INDEPENDENT,
      companyName: 'Mansour Elite Properties',
      brn: 'BRN-55443',
      phone: '+971500000002',
      description: 'Independent licensed UAE real estate broker submitting referrals, tracking earnings, and managing personal KYC.',
    },
    {
      key: 'agency_owner',
      email: 'agency.owner@demo.prospera.test',
      fullName: 'Layla Al Nuaimi (Agency Owner)',
      role: Role.AGENT,
      agentType: AgentType.AGENCY_MEMBER,
      companyName: 'Apex Prime Realty Advisory LLC',
      brn: 'BRN-11223',
      phone: '+971500000003',
      description: 'Agency principal with authority to invite brokers, view team referrals, manage agency settings, and track organization performance.',
    },
    {
      key: 'agency_admin',
      email: 'agency.admin@demo.prospera.test',
      fullName: 'Farhan Zaidi (Agency Admin)',
      role: Role.AGENT,
      agentType: AgentType.AGENCY_MEMBER,
      companyName: 'Apex Prime Realty Advisory LLC',
      phone: '+971500000004',
      description: 'Agency administrator managing member onboarding and viewing consolidated agency pipeline.',
    },
    {
      key: 'agency_member',
      email: 'agency.member@demo.prospera.test',
      fullName: 'Elena Rostova (Agency Member)',
      role: Role.AGENT,
      agentType: AgentType.AGENCY_MEMBER,
      companyName: 'Apex Prime Realty Advisory LLC',
      phone: '+971500000005',
      description: 'Agency agent broker who sees personal referrals and personal commissions without access to owner settings.',
    },
    {
      key: 'coordinator',
      email: 'coordinator@demo.prospera.test',
      fullName: 'Rashed Al Maktoum (Lead Coordinator)',
      role: Role.COORDINATOR,
      agentType: AgentType.INDEPENDENT,
      companyName: 'Prospera Operations Desk',
      phone: '+971500000006',
      description: 'Prospera platform transaction coordinator managing assigned lead queues, agent allocations, and status progression.',
    },
    {
      key: 'referral_partner',
      email: 'partner.corporate@demo.prospera.test',
      fullName: 'Marcus Vance (Corporate Referral Partner)',
      role: Role.REFERRAL_PARTNER,
      agentType: AgentType.INDEPENDENT,
      companyName: 'Gulf Institutional Capital Partners Ltd',
      phone: '+971500000007',
      description: 'Corporate institutional partner submitting high-net-worth client leads and tracking institutional commission accruals.',
    },
  ];

  const personaCredentials: Record<string, string> = {};
  const createdUsers: Record<string, any> = {};

  for (const p of personas) {
    // Generate unique cryptographically strong password for each persona
    const randomEntropy = crypto.randomBytes(16).toString('base64url');
    const uniquePersonaPassword = `Pr0sp!${randomEntropy}#${p.key}`;
    const personaPasswordHash = await argon2.hash(uniquePersonaPassword);
    personaCredentials[p.key] = uniquePersonaPassword;

    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {
        fullName: p.fullName,
        role: p.role,
        agentType: p.agentType,
        companyName: p.companyName,
        phone: p.phone,
        brn: p.brn ?? null,
        passwordHash: personaPasswordHash,
        accountStatus: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        approvedAt: new Date(),
      },
      create: {
        email: p.email,
        fullName: p.fullName,
        passwordHash: personaPasswordHash,
        role: p.role,
        agentType: p.agentType,
        companyName: p.companyName,
        phone: p.phone,
        brn: p.brn ?? null,
        accountStatus: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        approvedAt: new Date(),
      },
    });

    createdUsers[p.key] = user;
    console.log(`[SEED] Persona seeded: ${p.fullName} <${p.email}>`);
  }

  // 2. Setup Agency & Memberships
  console.log('[SEED] Setting up demo agency organization...');
  const agency = await prisma.agency.upsert({
    where: { tradeLicenseNo: 'CN-9876543-DEMO' },
    update: {
      status: AgencyStatus.VERIFIED,
    },
    create: {
      name: 'Apex Prime Realty Advisory LLC',
      legalName: 'Apex Prime Realty Advisory LLC (Dubai Branch)',
      tradeLicenseNo: 'CN-9876543-DEMO',
      orn: 'ORN-19882',
      email: 'contact@apexrealty.demo.test',
      phone: '+97143999999',
      address: 'Level 24, Al Saada Tower, DIFC, Dubai, UAE',
      status: AgencyStatus.VERIFIED,
      createdById: createdUsers.agency_owner.id,
      verifiedById: createdUsers.admin.id,
      verifiedAt: new Date(),
    },
  });

  // Link Agency Members
  const agencyLinks = [
    { user: createdUsers.agency_owner, role: AgencyRole.AGENCY_OWNER },
    { user: createdUsers.agency_admin, role: AgencyRole.AGENCY_ADMIN },
    { user: createdUsers.agency_member, role: AgencyRole.AGENT },
  ];

  for (const link of agencyLinks) {
    await prisma.agencyMember.upsert({
      where: {
        agencyId_userId: {
          agencyId: agency.id,
          userId: link.user.id,
        },
      },
      update: {
        role: link.role,
        status: 'ACTIVE',
      },
      create: {
        agencyId: agency.id,
        userId: link.user.id,
        role: link.role,
        status: 'ACTIVE',
      },
    });
  }

  // Link coordinator to agents and partner
  await prisma.user.update({
    where: { id: createdUsers.independent_agent.id },
    data: { coordinatorId: createdUsers.coordinator.id },
  });
  await prisma.user.update({
    where: { id: createdUsers.referral_partner.id },
    data: { coordinatorId: createdUsers.coordinator.id },
  });

  // 3. Seed Synthetic KYC Documents
  console.log('[SEED] Seeding synthetic KYC documents...');
  const kycDocs = [
    {
      userId: createdUsers.independent_agent.id,
      docType: KycDocumentType.EMIRATES_ID_FRONT,
      fileKey: 'kyc/demo-emirates-id-front.pdf',
      filename: 'emirates_id_front_sample.pdf',
      status: KycStatus.VERIFIED,
    },
    {
      userId: createdUsers.independent_agent.id,
      docType: KycDocumentType.BROKER_CARD_BRN,
      fileKey: 'kyc/demo-broker-card.pdf',
      filename: 'rera_broker_card_verified.pdf',
      status: KycStatus.VERIFIED,
    },
    {
      userId: createdUsers.agency_owner.id,
      agencyId: agency.id,
      docType: KycDocumentType.TRADE_LICENSE,
      fileKey: 'kyc/demo-trade-license.pdf',
      filename: 'trade_license_dubai_ded.pdf',
      status: KycStatus.VERIFIED,
    },
    {
      userId: createdUsers.agency_member.id,
      docType: KycDocumentType.PASSPORT,
      fileKey: 'kyc/demo-passport.pdf',
      filename: 'passport_scan_pending.pdf',
      status: KycStatus.PENDING_REVIEW,
    },
    {
      userId: createdUsers.referral_partner.id,
      docType: KycDocumentType.TRADE_LICENSE,
      fileKey: 'kyc/demo-partner-license.pdf',
      filename: 'corporate_registry_difc.pdf',
      status: KycStatus.VERIFIED,
    },
  ];

  for (const doc of kycDocs) {
    const existing = await prisma.kycDocument.findFirst({
      where: {
        userId: doc.userId,
        documentType: doc.docType,
      },
    });

    if (!existing) {
      await prisma.kycDocument.create({
        data: {
          userId: doc.userId,
          agencyId: doc.agencyId ?? null,
          documentType: doc.docType,
          fileKey: doc.fileKey,
          originalFilename: doc.filename,
          fileSizeBytes: 245100,
          mimeType: 'application/pdf',
          sha256Checksum: crypto.randomBytes(32).toString('hex'),
          status: doc.status,
          reviewedById: doc.status === KycStatus.VERIFIED ? createdUsers.admin.id : null,
          reviewedAt: doc.status === KycStatus.VERIFIED ? new Date() : null,
        },
      });
    }
  }

  // 4. Seed Synthetic Bank Accounts
  console.log('[SEED] Seeding synthetic bank accounts...');
  const bankAccounts = [
    {
      userId: createdUsers.independent_agent.id,
      bankName: 'Emirates NBD',
      holder: 'Tariq Mansour Personal Brokerage',
      iban: 'AE290330000012345678901',
      isVerified: true,
    },
    {
      userId: createdUsers.agency_owner.id,
      agencyId: agency.id,
      bankName: 'First Abu Dhabi Bank (FAB)',
      holder: 'Apex Prime Realty Advisory Corporate',
      iban: 'AE440030000098765432109',
      isVerified: true,
    },
    {
      userId: createdUsers.referral_partner.id,
      bankName: 'Abu Dhabi Commercial Bank (ADCB)',
      holder: 'Gulf Institutional Capital Partners',
      iban: 'AE880520000055443322110',
      isVerified: true,
    },
  ];

  for (const b of bankAccounts) {
    const existing = await prisma.bankAccount.findFirst({
      where: { userId: b.userId },
    });

    if (!existing) {
      await prisma.bankAccount.create({
        data: {
          userId: b.userId,
          agencyId: b.agencyId ?? null,
          bankName: b.bankName,
          accountHolderName: b.holder,
          ibanLast4: extractIbanLast4(b.iban),
          encryptedIban: encryptSensitive(b.iban),
          currency: 'AED',
          isPrimary: true,
          isVerified: b.isVerified,
          verifiedById: b.isVerified ? createdUsers.admin.id : null,
          verifiedAt: b.isVerified ? new Date() : null,
        },
      });
    }
  }

  // 5. Seed Synthetic Referrals across pipeline statuses
  console.log('[SEED] Seeding synthetic referrals and leads...');
  const leads = [
    {
      referenceNo: 'REF-2026-000101',
      partnerId: createdUsers.referral_partner.id,
      coordinatorId: createdUsers.coordinator.id,
      agentId: createdUsers.independent_agent.id,
      serviceId: srvLuxuryRE.id,
      clientName: 'Lord Alistair Sterling',
      clientEmail: 'alistair.sterling@example.test',
      clientPhone: '+971551000101',
      expectedDealValue: new Prisma.Decimal(18500000),
      actualDealValue: new Prisma.Decimal(18500000),
      status: LeadStatus.WON,
    },
    {
      referenceNo: 'REF-2026-000102',
      partnerId: createdUsers.referral_partner.id,
      coordinatorId: createdUsers.coordinator.id,
      agentId: createdUsers.agency_member.id,
      serviceId: srvMortgage.id,
      clientName: 'Dr. Fatima Al Nuaimi',
      clientEmail: 'dr.fatima@example.test',
      clientPhone: '+971551000102',
      expectedDealValue: new Prisma.Decimal(6200000),
      status: LeadStatus.QUALIFIED,
    },
    {
      referenceNo: 'REF-2026-000103',
      partnerId: createdUsers.referral_partner.id,
      coordinatorId: createdUsers.coordinator.id,
      agentId: null,
      serviceId: srvGoldenVisa.id,
      clientName: 'Carlos Mendonca',
      clientEmail: 'carlos.m@example.test',
      clientPhone: '+971551000103',
      expectedDealValue: new Prisma.Decimal(2000000),
      status: LeadStatus.SUBMITTED,
    },
    {
      referenceNo: 'REF-2026-000104',
      partnerId: createdUsers.agency_owner.id,
      coordinatorId: createdUsers.coordinator.id,
      agentId: createdUsers.agency_member.id,
      serviceId: srvLuxuryRE.id,
      clientName: 'Dmitri Volkov',
      clientEmail: 'd.volkov@example.test',
      clientPhone: '+971551000104',
      expectedDealValue: new Prisma.Decimal(12000000),
      status: LeadStatus.NEGOTIATION,
    },
  ];

  for (const l of leads) {
    const existing = await prisma.lead.findUnique({
      where: { referenceNo: l.referenceNo },
    });

    if (!existing) {
      const createdLead = await prisma.lead.create({
        data: {
          referenceNo: l.referenceNo,
          partnerId: l.partnerId,
          coordinatorId: l.coordinatorId,
          agentId: l.agentId,
          serviceId: l.serviceId,
          clientName: l.clientName,
          clientEmail: l.clientEmail,
          clientPhone: l.clientPhone,
          expectedDealValue: l.expectedDealValue,
          actualDealValue: l.actualDealValue ?? null,
          status: l.status,
          currency: 'AED',
          wonAt: l.status === LeadStatus.WON ? new Date() : null,
        },
      });

      // Status history entry
      await prisma.leadStatusHistory.create({
        data: {
          leadId: createdLead.id,
          changedById: createdUsers.coordinator.id,
          previousStatus: 'SUBMITTED',
          newStatus: l.status,
          transitionNote: 'Seeded synthetic pipeline demonstration',
        },
      });

      // Seed commission ledger entry if WON
      if (l.status === LeadStatus.WON && l.actualDealValue) {
        const partnerCommission = Number(l.actualDealValue) * 0.02; // 200 bps
        await prisma.commissionLedgerEntry.upsert({
          where: { idempotencyKey: `COMM-${l.referenceNo}-PARTNER` },
          update: {},
          create: {
            idempotencyKey: `COMM-${l.referenceNo}-PARTNER`,
            leadId: createdLead.id,
            recipientUserId: l.partnerId,
            recipientRole: Role.REFERRAL_PARTNER,
            entryType: CommissionEntryType.ACCRUAL,
            status: CommissionStatus.AVAILABLE,
            dealValue: l.actualDealValue,
            commissionBps: 200,
            amount: new Prisma.Decimal(partnerCommission),
            currency: 'AED',
            description: `Commission accrued for won referral ${l.referenceNo} - ${l.clientName}`,
            createdById: createdUsers.admin.id,
          },
        });
      }
    }
  }

  // 6. Save persona catalog for local development reference
  const catalogPath = path.resolve(process.cwd(), '.dev-demo-personas.json');
  const catalogData = {
    generatedAt: new Date().toISOString(),
    notice: 'SYNTHETIC DEMO PERSONAS FOR ISOLATED DEVELOPMENT TESTING. NEVER COMMIT CREDENTIALS TO GIT.',
    personas: personas.map((p) => ({
      key: p.key,
      role: p.role,
      agentType: p.agentType,
      email: p.email,
      fullName: p.fullName,
      phone: p.phone,
      company: p.companyName,
      description: p.description,
      secureGeneratedPassword: personaCredentials[p.key],
    })),
  };

  fs.writeFileSync(catalogPath, JSON.stringify(catalogData, null, 2), { mode: 0o600 });

  console.log('[SEED] SUCCESS: Synthetic demo personas and pipeline seeded successfully.');
  console.log(`[SEED] Personas summary saved to: .dev-demo-personas.json`);
}

seedDemoUsers()
  .catch((err) => {
    console.error('[SEED ERROR]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

