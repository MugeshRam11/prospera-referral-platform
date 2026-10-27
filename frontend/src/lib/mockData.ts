import {
  UserSummary,
  ServiceItem,
  LeadItem,
  CommissionEntry,
  WithdrawalItem,
  BankAccountItem,
  KycDocumentItem,
  DashboardMetrics,
} from '../types';

export const mockUser: UserSummary = {
  id: '7b54a8e2-8924-42f2-9c98-1e432cbb1001',
  email: 'ahmed.mansoori@apexadvisory.ae',
  fullName: 'Ahmed Al Mansoori',
  phone: '+971 50 892 4110',
  role: 'REFERRAL_PARTNER',
  accountStatus: 'ACTIVE',
  companyName: 'Apex Advisory & Capital LLC',
  referralCode: 'APEX-2026',
  emailVerifiedAt: '2026-01-15T08:00:00Z',
  kycVerifiedAt: '2026-01-16T11:30:00Z',
};

export const mockServices: ServiceItem[] = [
  {
    id: '11111111-2222-3333-4444-555555555551',
    slug: 'corporate-bank-account',
    name: 'Corporate Bank Account Opening (UAE)',
    description: 'Fast-track corporate banking facilitation with Emirates NBD, Mashreq, FAB, and Wio Bank.',
    defaultPartnerCommissionBps: 250, // 2.5%
    defaultAgentCommissionBps: 150,
    isActive: true,
  },
  {
    id: '11111111-2222-3333-4444-555555555552',
    slug: 'mainland-llc-formation',
    name: 'Dubai Mainland LLC Formation',
    description: '100% foreign ownership corporate formation with full Department of Economy & Tourism licensing.',
    defaultPartnerCommissionBps: 300, // 3.0%
    defaultAgentCommissionBps: 200,
    isActive: true,
  },
  {
    id: '11111111-2222-3333-4444-555555555553',
    slug: 'golden-visa-investor',
    name: 'UAE 10-Year Investor Golden Visa',
    description: 'Complete end-to-end processing for property investors, high net-worth individuals, and entrepreneurs.',
    defaultPartnerCommissionBps: 200, // 2.0%
    defaultAgentCommissionBps: 100,
    isActive: true,
  },
  {
    id: '11111111-2222-3333-4444-555555555554',
    slug: 'difc-adgm-structuring',
    name: 'DIFC & ADGM SPV Structuring',
    description: 'Common law holding companies, foundation setups, and cross-border asset protection vehicles.',
    defaultPartnerCommissionBps: 350, // 3.5%
    defaultAgentCommissionBps: 250,
    isActive: true,
  },
  {
    id: '11111111-2222-3333-4444-555555555555',
    slug: 'luxury-real-estate-advisory',
    name: 'Prime Dubai Real Estate Acquisition',
    description: 'High-yield commercial and ultra-luxury residential asset acquisition for international funds.',
    defaultPartnerCommissionBps: 150, // 1.5%
    defaultAgentCommissionBps: 100,
    isActive: true,
  },
];

export const mockBankAccounts: BankAccountItem[] = [
  {
    id: 'ba-001',
    userId: mockUser.id,
    bankName: 'Emirates NBD PJSC',
    accountHolderName: 'Apex Advisory & Capital LLC',
    ibanLast4: '8821',
    currency: 'AED',
    isPrimary: true,
    isVerified: true,
    createdAt: '2026-01-16T12:00:00Z',
  },
  {
    id: 'ba-002',
    userId: mockUser.id,
    bankName: 'First Abu Dhabi Bank (FAB)',
    accountHolderName: 'Apex Advisory & Capital LLC',
    ibanLast4: '3049',
    currency: 'AED',
    isPrimary: false,
    isVerified: true,
    createdAt: '2026-02-10T14:30:00Z',
  },
];

export const mockLeads: LeadItem[] = [
  {
    id: 'lead-001',
    referenceNo: 'REF-2026-892401',
    partnerId: mockUser.id,
    coordinatorId: 'coord-01',
    agentId: 'agent-01',
    serviceId: mockServices[0].id,
    clientName: 'Al Hamra Maritime Logistics FZCO',
    clientEmail: 'tariq.rashid@alhamramaritime.com',
    clientPhone: '+971 4 398 2210',
    expectedDealValue: 185000,
    actualDealValue: 185000,
    currency: 'AED',
    customPartnerCommissionBps: 250,
    status: 'WON',
    wonAt: '2026-10-02T14:20:00Z',
    notes: 'Client completed corporate onboarding with Emirates NBD Commercial Banking.',
    createdAt: '2026-09-15T09:15:00Z',
    updatedAt: '2026-10-02T14:20:00Z',
    partner: mockUser,
    service: mockServices[0],
    agent: {
      id: 'agent-01',
      fullName: 'Sarah Jenkins',
      email: 's.jenkins@prospera.ae',
      role: 'AGENT',
      accountStatus: 'ACTIVE',
    },
    coordinator: {
      id: 'coord-01',
      fullName: 'Rashid Al Nuaimi',
      email: 'r.nuaimi@prospera.ae',
      role: 'COORDINATOR',
      accountStatus: 'ACTIVE',
    },
    statusHistory: [
      {
        id: 'hist-001-1',
        leadId: 'lead-001',
        changedById: mockUser.id,
        newStatus: 'SUBMITTED',
        transitionNote: 'Direct portal submission by Apex Advisory',
        createdAt: '2026-09-15T09:15:00Z',
      },
      {
        id: 'hist-001-2',
        leadId: 'lead-001',
        changedById: 'coord-01',
        previousStatus: 'SUBMITTED',
        newStatus: 'ASSIGNED',
        transitionNote: 'Assigned to Senior Banking Specialist Sarah Jenkins',
        createdAt: '2026-09-16T10:00:00Z',
      },
      {
        id: 'hist-001-3',
        leadId: 'lead-001',
        changedById: 'agent-01',
        previousStatus: 'ASSIGNED',
        newStatus: 'CONTACTED',
        transitionNote: 'Introductory discovery call completed with CEO Tariq Rashid',
        createdAt: '2026-09-17T11:45:00Z',
      },
      {
        id: 'hist-001-4',
        leadId: 'lead-001',
        changedById: 'agent-01',
        previousStatus: 'CONTACTED',
        newStatus: 'QUALIFIED',
        transitionNote: 'Company KYC dossiers and source of funds verified',
        createdAt: '2026-09-20T16:00:00Z',
      },
      {
        id: 'hist-001-5',
        leadId: 'lead-001',
        changedById: 'agent-01',
        previousStatus: 'QUALIFIED',
        newStatus: 'WON',
        transitionNote: 'Accounts successfully activated and funds cleared',
        createdAt: '2026-10-02T14:20:00Z',
      },
    ],
  },
  {
    id: 'lead-002',
    referenceNo: 'REF-2026-892402',
    partnerId: mockUser.id,
    coordinatorId: 'coord-01',
    agentId: 'agent-02',
    serviceId: mockServices[3].id,
    clientName: 'Horizon Fintech Holdings Ltd',
    clientEmail: 'contact@horizonfintech.ch',
    clientPhone: '+41 22 819 9000',
    expectedDealValue: 420000,
    currency: 'AED',
    customPartnerCommissionBps: 350,
    status: 'NEGOTIATION',
    notes: 'Drafting DIFC Category 4 license SPV constitution and regulatory filings.',
    createdAt: '2026-09-28T11:30:00Z',
    updatedAt: '2026-10-09T16:45:00Z',
    partner: mockUser,
    service: mockServices[3],
    agent: {
      id: 'agent-02',
      fullName: 'Marcus Vance',
      email: 'm.vance@prospera.ae',
      role: 'AGENT',
      accountStatus: 'ACTIVE',
    },
    coordinator: {
      id: 'coord-01',
      fullName: 'Rashid Al Nuaimi',
      email: 'r.nuaimi@prospera.ae',
      role: 'COORDINATOR',
      accountStatus: 'ACTIVE',
    },
    statusHistory: [
      {
        id: 'hist-002-1',
        leadId: 'lead-002',
        changedById: mockUser.id,
        newStatus: 'SUBMITTED',
        transitionNote: 'Cross-border Swiss fund referral',
        createdAt: '2026-09-28T11:30:00Z',
      },
      {
        id: 'hist-002-2',
        leadId: 'lead-002',
        changedById: 'agent-02',
        previousStatus: 'PROPOSAL_SENT',
        newStatus: 'NEGOTIATION',
        transitionNote: 'Commercial terms reviewed by general counsel',
        createdAt: '2026-10-09T16:45:00Z',
      },
    ],
  },
  {
    id: 'lead-003',
    referenceNo: 'REF-2026-892403',
    partnerId: mockUser.id,
    coordinatorId: 'coord-01',
    agentId: 'agent-01',
    serviceId: mockServices[2].id,
    clientName: 'Dr. Evelyn Sterling & Family',
    clientEmail: 'evelyn.sterling@harvardmed.org',
    clientPhone: '+1 617 555 0192',
    expectedDealValue: 95000,
    currency: 'AED',
    customPartnerCommissionBps: 200,
    status: 'PROPOSAL_SENT',
    notes: 'Medical researcher 10-year Golden Visa application under specialized talent category.',
    createdAt: '2026-10-04T08:10:00Z',
    updatedAt: '2026-10-08T13:20:00Z',
    partner: mockUser,
    service: mockServices[2],
    agent: {
      id: 'agent-01',
      fullName: 'Sarah Jenkins',
      email: 's.jenkins@prospera.ae',
      role: 'AGENT',
      accountStatus: 'ACTIVE',
    },
    coordinator: {
      id: 'coord-01',
      fullName: 'Rashid Al Nuaimi',
      email: 'r.nuaimi@prospera.ae',
      role: 'COORDINATOR',
      accountStatus: 'ACTIVE',
    },
  },
  {
    id: 'lead-004',
    referenceNo: 'REF-2026-892404',
    partnerId: mockUser.id,
    coordinatorId: 'coord-01',
    agentId: 'agent-03',
    serviceId: mockServices[1].id,
    clientName: 'Nordic CleanTech Solutions DMCC',
    clientEmail: 'lars.johansson@nordiccleantech.se',
    clientPhone: '+46 8 123 4567',
    expectedDealValue: 145000,
    actualDealValue: 145000,
    currency: 'AED',
    customPartnerCommissionBps: 300,
    status: 'WON',
    wonAt: '2026-09-22T17:00:00Z',
    notes: 'Incorporation completed, Trade License issued by DET Dubai.',
    createdAt: '2026-08-30T10:00:00Z',
    updatedAt: '2026-09-22T17:00:00Z',
    partner: mockUser,
    service: mockServices[1],
    agent: {
      id: 'agent-03',
      fullName: 'Fatima Al Qasimi',
      email: 'f.alqasimi@prospera.ae',
      role: 'AGENT',
      accountStatus: 'ACTIVE',
    },
  },
  {
    id: 'lead-005',
    referenceNo: 'REF-2026-892405',
    partnerId: mockUser.id,
    coordinatorId: 'coord-01',
    agentId: 'agent-02',
    serviceId: mockServices[4].id,
    clientName: 'Valiant Property Ventures Ltd',
    clientEmail: 'acquisitions@valiantprop.co.uk',
    clientPhone: '+44 20 7946 0912',
    expectedDealValue: 1250000,
    currency: 'AED',
    customPartnerCommissionBps: 150,
    status: 'QUALIFIED',
    notes: 'Targeting commercial freehold units in Downtown Dubai and Dubai Hills Estate.',
    createdAt: '2026-10-07T14:15:00Z',
    updatedAt: '2026-10-10T09:30:00Z',
    partner: mockUser,
    service: mockServices[4],
    agent: {
      id: 'agent-02',
      fullName: 'Marcus Vance',
      email: 'm.vance@prospera.ae',
      role: 'AGENT',
      accountStatus: 'ACTIVE',
    },
  },
  {
    id: 'lead-006',
    referenceNo: 'REF-2026-892406',
    partnerId: mockUser.id,
    coordinatorId: 'coord-01',
    agentId: null,
    serviceId: mockServices[0].id,
    clientName: 'Oasis Biotech Labs LLC',
    clientEmail: 'info@oasisbiotech.ae',
    clientPhone: '+971 52 443 8901',
    expectedDealValue: 110000,
    currency: 'AED',
    customPartnerCommissionBps: 250,
    status: 'SUBMITTED',
    notes: 'Recently formed healthcare lab looking for commercial multi-currency account.',
    createdAt: '2026-10-11T12:05:00Z',
    updatedAt: '2026-10-11T12:05:00Z',
    partner: mockUser,
    service: mockServices[0],
  },
];

export const mockCommissions: CommissionEntry[] = [
  {
    id: 'comm-001',
    leadId: 'lead-001',
    recipientUserId: mockUser.id,
    recipientRole: 'REFERRAL_PARTNER',
    entryType: 'ACCRUAL',
    status: 'AVAILABLE',
    dealValue: 185000,
    commissionBps: 250,
    amount: 4625.0, // 185000 * 2.5%
    currency: 'AED',
    description: 'Lead WON Accrual: Al Hamra Maritime Logistics FZCO (2.5%)',
    availableAt: '2026-10-02T14:20:00Z',
    createdAt: '2026-10-02T14:20:00Z',
    lead: {
      referenceNo: 'REF-2026-892401',
      clientName: 'Al Hamra Maritime Logistics FZCO',
      service: {
        name: 'Corporate Bank Account Opening (UAE)',
      },
    },
  },
  {
    id: 'comm-002',
    leadId: 'lead-004',
    recipientUserId: mockUser.id,
    recipientRole: 'REFERRAL_PARTNER',
    entryType: 'ACCRUAL',
    status: 'AVAILABLE',
    dealValue: 145000,
    commissionBps: 300,
    amount: 4350.0, // 145000 * 3.0%
    currency: 'AED',
    description: 'Lead WON Accrual: Nordic CleanTech Solutions DMCC (3.0%)',
    availableAt: '2026-09-22T17:00:00Z',
    createdAt: '2026-09-22T17:00:00Z',
    lead: {
      referenceNo: 'REF-2026-892404',
      clientName: 'Nordic CleanTech Solutions DMCC',
      service: {
        name: 'Dubai Mainland LLC Formation',
      },
    },
  },
  {
    id: 'comm-003',
    leadId: 'lead-000-prev',
    recipientUserId: mockUser.id,
    recipientRole: 'REFERRAL_PARTNER',
    entryType: 'ACCRUAL',
    status: 'AVAILABLE',
    dealValue: 260000,
    commissionBps: 350,
    amount: 9100.0,
    currency: 'AED',
    description: 'Lead WON Accrual: Crescent Global Asset Management (3.5%)',
    availableAt: '2026-08-14T10:00:00Z',
    createdAt: '2026-08-14T10:00:00Z',
    lead: {
      referenceNo: 'REF-2026-771920',
      clientName: 'Crescent Global Asset Management',
      service: {
        name: 'DIFC & ADGM SPV Structuring',
      },
    },
  },
];

export const mockWithdrawals: WithdrawalItem[] = [
  {
    id: 'w-001',
    referenceNo: 'WTH-2026-0891',
    userId: mockUser.id,
    bankAccountId: 'ba-001',
    amount: 9100.0,
    currency: 'AED',
    status: 'PAID',
    userNotes: 'Payout request for August closed transactions',
    adminNotes: 'Processed via Emirates NBD Business Online Transfer',
    approvedAt: '2026-08-18T10:00:00Z',
    paidAt: '2026-08-19T14:15:00Z',
    createdAt: '2026-08-16T09:30:00Z',
    updatedAt: '2026-08-19T14:15:00Z',
    bankAccount: mockBankAccounts[0],
  },
  {
    id: 'w-002',
    referenceNo: 'WTH-2026-0945',
    userId: mockUser.id,
    bankAccountId: 'ba-001',
    amount: 4000.0,
    currency: 'AED',
    status: 'PROCESSING',
    userNotes: 'Quarterly commission withdrawal',
    approvedAt: '2026-10-08T11:00:00Z',
    createdAt: '2026-10-06T15:20:00Z',
    updatedAt: '2026-10-08T11:00:00Z',
    bankAccount: mockBankAccounts[0],
  },
];

export const mockKycDocuments: KycDocumentItem[] = [
  {
    id: 'kyc-doc-1',
    userId: mockUser.id,
    documentType: 'TRADE_LICENSE',
    originalFilename: 'Apex_Advisory_Commercial_License_2026.pdf',
    fileSizeBytes: 2450890,
    mimeType: 'application/pdf',
    status: 'VERIFIED',
    reviewedAt: '2026-01-16T10:15:00Z',
    expiryDate: '2027-01-14',
    createdAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'kyc-doc-2',
    userId: mockUser.id,
    documentType: 'EMIRATES_ID_FRONT',
    originalFilename: 'Ahmed_Al_Mansoori_EID_Front.jpg',
    fileSizeBytes: 1840220,
    mimeType: 'image/jpeg',
    status: 'VERIFIED',
    reviewedAt: '2026-01-16T11:30:00Z',
    expiryDate: '2028-09-30',
    createdAt: '2026-01-15T09:05:00Z',
  },
  {
    id: 'kyc-doc-3',
    userId: mockUser.id,
    documentType: 'VAT_CERTIFICATE',
    originalFilename: 'Apex_FTA_Tax_Registration_TRN.pdf',
    fileSizeBytes: 980440,
    mimeType: 'application/pdf',
    status: 'VERIFIED',
    reviewedAt: '2026-01-16T11:45:00Z',
    createdAt: '2026-01-15T09:10:00Z',
  },
];

export const computeDashboardMetrics = (
  leads: LeadItem[] = mockLeads,
  commissions: CommissionEntry[] = mockCommissions,
  withdrawals: WithdrawalItem[] = mockWithdrawals
): DashboardMetrics => {
  const wonLeads = leads.filter((l) => l.status === 'WON');
  const activePipelineLeads = leads.filter(
    (l) => l.status !== 'WON' && l.status !== 'LOST' && l.status !== 'CANCELLED'
  );

  const activePipelineValue = activePipelineLeads.reduce(
    (acc, curr) => acc + Number(curr.expectedDealValue || 0),
    0
  );

  const wonReferralsValue = wonLeads.reduce(
    (acc, curr) => acc + Number(curr.actualDealValue || curr.expectedDealValue || 0),
    0
  );

  const totalEarnedCommission = commissions
    .filter((c) => c.entryType === 'ACCRUAL')
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const completedPayouts = withdrawals
    .filter((w) => w.status === 'PAID')
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const reservedPayouts = withdrawals
    .filter((w) => ['REQUESTED', 'APPROVED', 'PROCESSING', 'UNDER_REVIEW'].includes(w.status))
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const withdrawableBalance = Math.max(
    0,
    totalEarnedCommission - (completedPayouts + reservedPayouts)
  );

  return {
    totalReferrals: leads.length,
    activePipelineValue,
    wonReferralsCount: wonLeads.length,
    wonReferralsValue,
    totalEarnedCommission,
    withdrawableBalance,
    pendingClearanceCommission: reservedPayouts,
    payoutsProcessed: completedPayouts,
  };
};
