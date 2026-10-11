export type Role = 'REFERRAL_PARTNER' | 'AGENT' | 'COORDINATOR' | 'ADMIN';

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

export type KycStatus = 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export type KycDocumentType =
  | 'EMIRATES_ID_FRONT'
  | 'EMIRATES_ID_BACK'
  | 'PASSPORT'
  | 'TRADE_LICENSE'
  | 'VAT_CERTIFICATE'
  | 'BANK_STATEMENT';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: Role;
  accountStatus: AccountStatus;
  companyName?: string | null;
  referralCode?: string | null;
  emailVerifiedAt?: string | null;
  kycVerifiedAt?: string | null;
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
  userId: string;
  bankName: string;
  accountHolderName: string;
  ibanLast4: string;
  currency: string;
  isPrimary: boolean;
  isVerified: boolean;
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
  userId: string;
  documentType: KycDocumentType;
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
  status: KycStatus;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  expiryDate?: string | null;
  createdAt: string;
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
