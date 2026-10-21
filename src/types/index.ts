import {
  Role,
  AccountStatus,
  OtpPurpose,
  LeadStatus,
  AgentType,
  AgencyRole,
  AgencyStatus,
  InvitationStatus,
  KycDocumentType,
  KycStatus,
} from '@prisma/client';

export {
  Role,
  AccountStatus,
  OtpPurpose,
  LeadStatus,
  AgentType,
  AgencyRole,
  AgencyStatus,
  InvitationStatus,
  KycDocumentType,
  KycStatus,
};

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: unknown;
    stack?: string;
  };
  timestamp: string;
}

export interface HealthCheckData {
  status: string;
  uptime: number;
  environment: string;
  timestamp: string;
  version: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  whatsapp?: string | null;
  avatarUrl?: string | null;
  brn?: string | null;
  role: Role;
  agentType?: AgentType;
  accountStatus: AccountStatus;
  companyName: string | null;
  referralCode: string | null;
  emailVerifiedAt: Date | null;
}

export interface AuthenticatedSession {
  id: string;
  userId: string;
  expiresAt: Date;
  lastActiveAt: Date;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      session?: AuthenticatedSession;
    }
  }
}
