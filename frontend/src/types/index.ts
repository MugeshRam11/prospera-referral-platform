export type Role = 'REFERRAL_PARTNER' | 'AGENT' | 'COORDINATOR' | 'ADMIN';

export type AgentType = 'INDEPENDENT' | 'AGENCY_MEMBER';

export type AgencyRole = 'AGENCY_OWNER' | 'AGENCY_ADMIN' | 'AGENT';

export type AgencyStatus =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export type AccountStatus =
  | 'PENDING_VERIFICATION'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DEACTIVATED';

export type LeadStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'CANCELLED';

export type CommissionEntryType = 'ACCRUAL' | 'ADJUSTMENT' | 'REVERSAL' | 'CANCELLATION';

export type CommissionStatus =
  | 'PENDING_CLEARANCE'
  | 'AVAILABLE'
  | 'LOCKED_DISPUTE'
  | 'CANCELLED';

export type WithdrawalStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PROCESSING'
  | 'PAID'
  | 'REJECTED'
  | 'CANCELLED';

export type KycStatus =
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CHANGES_REQUESTED';

export type KycDocumentType =
  | 'EMIRATES_ID_FRONT'
  | 'EMIRATES_ID_BACK'
  | 'PASSPORT'
  | 'TRADE_LICENSE'
  | 'VAT_CERTIFICATE'
  | 'BANK_STATEMENT'
  | 'BANK_CONFIRMATION_LETTER'
  | 'BROKER_CARD_BRN'
  | 'ESTABLISHMENT_CARD'
  | 'POWER_OF_ATTORNEY'
  | 'OTHER';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  whatsapp?: string | null;
  avatarUrl?: string | null;
  brn?: string | null;
  nationality?: string | null;
  role: Role;
  agentType?: AgentType;
  accountStatus: AccountStatus;
  companyName?: string | null;
  referralCode?: string | null;
  emailVerifiedAt?: string | null;
  kycVerifiedAt?: string | null;
}

export interface ProfileCompletionItem {
  field: string;
  completed: boolean;
  weight: number;
}

export interface ProfileCompletionDetails {
  percentage: number;
  isComplete: boolean;
  checklist: ProfileCompletionItem[];
}

export interface FullProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  whatsapp?: string | null;
  avatarUrl?: string | null;
  brn?: string | null;
  nationality?: string | null;
  role: Role;
  agentType?: AgentType;
  accountStatus: AccountStatus;
  companyName?: string | null;
  referralCode?: string | null;
  emailVerifiedAt?: string | null;
  kycVerifiedAt?: string | null;
  deletionRequestedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  completion: ProfileCompletionDetails;
  agency?: {
    membershipId: string;
    role: AgencyRole;
    joinedAt: string;
    agencyId: string;
    agencyName: string;
    legalName: string;
    tradeLicenseNo: string;
    status: AgencyStatus;
  } | null;
  kycDocuments: KycDocumentItem[];
  bankAccounts: BankAccountItem[];
}

export interface AgencyMemberInfo {
  id: string;
  userId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  avatarUrl?: string | null;
  role: AgencyRole;
  joinedAt?: string;
}

export interface AgencyInvitationInfo {
  id: string;
  email: string;
  role: AgencyRole;
  inviteToken: string;
  expiresAt: string;
  createdAt: string;
}

export interface AgencyDetails {
  id: string;
  name: string;
  legalName: string;
  tradeLicenseNo: string;
  orn?: string | null;
  dedLicenseNo?: string | null;
  email: string;
  phone: string;
  address?: string | null;
  poBox?: string | null;
  status: AgencyStatus;
  rejectionReason?: string | null;
  membersCount: number;
  members: AgencyMemberInfo[];
  pendingInvitations: AgencyInvitationInfo[];
  documents: {
    id: string;
    documentType: KycDocumentType;
    originalFilename: string;
    status: KycStatus;
    createdAt: string;
  }[];
}

export interface MyAgencyResponse {
  isAgencyMember: boolean;
  membership: {
    id: string;
    role: AgencyRole;
    joinedAt: string;
    isPrivileged: boolean;
  } | null;
  agency: AgencyDetails | null;
}

export interface ServiceItem {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  defaultPartnerCommissionBps: number;
  defaultAgentCommissionBps: number;
  isActive: boolean;
}

export interface LeadStatusHistoryItem {
  id: string;
  leadId: string;
  changedById: string;
  previousStatus?: string | null;
  newStatus: string;
  transitionNote?: string | null;
  createdAt: string;
  changedBy?: {
    id: string;
    fullName: string;
    role: Role;
  };
}

export interface LeadItem {
  id: string;
  referenceNo: string;
  partnerId: string;
  coordinatorId?: string | null;
  agentId?: string | null;
  serviceId: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone: string;
  expectedDealValue: number | string;
  actualDealValue?: number | string | null;
  currency: string;
  customPartnerCommissionBps?: number | null;
  customAgentCommissionBps?: number | null;
  status: LeadStatus;
  wonAt?: string | null;
  lostReasonId?: string | null;
  lostDetails?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  partner?: UserSummary;
  coordinator?: UserSummary | null;
  agent?: UserSummary | null;
  service?: ServiceItem;
  statusHistory?: LeadStatusHistoryItem[];
}

export interface CommissionEntry {
  id: string;
  leadId: string;
  recipientUserId: string;
  recipientRole: Role;
  entryType: CommissionEntryType;
  status: CommissionStatus;
  dealValue: number | string;
  commissionBps: number;
  amount: number | string;
  currency: string;
  description: string;
  availableAt: string;
  createdAt: string;
  lead?: {
    referenceNo: string;
    clientName: string;
    service?: {
      name: string;
    };
  };
}

export interface BankAccountItem {
  id: string;
  userId?: string;
  agencyId?: string | null;
  bankName: string;
  accountHolderName: string;
  ibanLast4: string;
  maskedIban?: string;
  currency: string;
  hasConfirmationDoc?: boolean;
  bankConfirmationDocKey?: string | null;
  isPrimary: boolean;
  isVerified: boolean;
  rejectionReason?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface WithdrawalItem {
  id: string;
  referenceNo: string;
  userId: string;
  bankAccountId: string;
  amount: number | string;
  currency: string;
  status: WithdrawalStatus;
  userNotes?: string | null;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  bankAccount?: BankAccountItem;
}

export interface KycDocumentItem {
  id: string;
  userId?: string;
  agencyId?: string | null;
  documentType: KycDocumentType;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  status: KycStatus;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  expiryDate?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface DashboardMetrics {
  totalReferrals: number;
  activePipelineValue: number;
  wonReferralsCount: number;
  wonReferralsValue: number;
  totalEarnedCommission: number;
  withdrawableBalance: number;
  pendingClearanceCommission: number;
  payoutsProcessed: number;
}

export interface AdminOverviewMetrics {
  totalIndependentAgents: number;
  totalAgencies: number;
  totalAgencyMembers: number;
  pendingAgentApprovals: number;
  pendingAgencyApprovals: number;
  pendingKycReviews: number;
  verifiedAccounts: number;
  suspendedAccounts: number;
}

export interface AdminRecentApplication {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: Role;
  agentType?: AgentType;
  accountStatus: AccountStatus;
  companyName?: string | null;
  createdAt: string;
  kycStatusSummary: 'PENDING_REVIEW' | 'VERIFIED' | 'INCOMPLETE';
}

export interface AdminAgentItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  whatsapp?: string | null;
  avatarUrl?: string | null;
  brn?: string | null;
  role: Role;
  agentType?: AgentType;
  accountStatus: AccountStatus;
  companyName?: string | null;
  createdAt: string;
  approvedAt?: string | null;
  agencyMemberships?: {
    agency: {
      id: string;
      name: string;
      tradeLicenseNo: string;
    };
  }[];
  kycDocuments?: {
    id: string;
    documentType: KycDocumentType;
    status: KycStatus;
  }[];
}

export interface AdminAgencyItem {
  id: string;
  name: string;
  legalName: string;
  tradeLicenseNo: string;
  orn?: string | null;
  dedLicenseNo?: string | null;
  email: string;
  phone: string;
  status: AgencyStatus;
  rejectionReason?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
  creator?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  };
  totalMembers: number;
  members: {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    role: AgencyRole;
  }[];
  documentsCount: number;
}

export interface AdminPendingKycItem {
  id: string;
  documentType: KycDocumentType;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Checksum?: string;
  status: KycStatus;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    role: Role;
    agentType?: AgentType;
  };
  agency?: {
    id: string;
    name: string;
    tradeLicenseNo: string;
  } | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
