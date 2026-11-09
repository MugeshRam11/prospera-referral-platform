import { z } from 'zod';
import { AccountStatus, AgencyStatus, KycStatus, Role } from '../../types';

export const agentQuerySchema = z.object({
  search: z.string().optional(),
  agentType: z.enum(['INDEPENDENT', 'AGENCY_MEMBER']).optional(),
  status: z.nativeEnum(AccountStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const agencyQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(AgencyStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateAgentStatusSchema = z.object({
  status: z.nativeEnum(AccountStatus),
  reason: z.string().max(500).optional(),
});

export const updateAgencyStatusSchema = z.object({
  status: z.nativeEnum(AgencyStatus),
  rejectionReason: z.string().max(500).optional(),
});

export const reviewKycDocumentSchema = z.object({
  status: z.enum([KycStatus.VERIFIED, KycStatus.REJECTED, KycStatus.CHANGES_REQUESTED]),
  rejectionReason: z.string().max(1000).optional(),
}).refine(
  (data) => {
    if ((data.status === KycStatus.REJECTED || data.status === KycStatus.CHANGES_REQUESTED) && (!data.rejectionReason || data.rejectionReason.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'Rejection or correction reason is required when not approving',
    path: ['rejectionReason'],
  }
);

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const verifyBankSchema = z.object({
  isVerified: z.boolean(),
  rejectionReason: z.string().max(500).optional(),
});

export const userQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'COORDINATOR', 'REFERRAL_PARTNER', 'AGENT', 'ALL']).optional(),
  accountStatus: z.enum(['PENDING_VERIFICATION', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'ALL']).optional(),
  agentType: z.enum(['INDEPENDENT', 'AGENCY_MEMBER', 'ALL']).optional(),
  kycStatus: z.enum(['VERIFIED', 'PENDING_REVIEW', 'REJECTED', 'CHANGES_REQUESTED', 'INCOMPLETE', 'ALL']).optional(),
  agencyId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createUserSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(255),
  email: z.string().trim().toLowerCase().email('Invalid email address').max(255),
  phone: z.string().trim().max(50).optional(),
  whatsapp: z.string().trim().max(50).optional(),
  role: z.nativeEnum(Role),
  agentType: z.enum(['INDEPENDENT', 'AGENCY_MEMBER']).default('INDEPENDENT'),
  companyName: z.string().trim().max(255).optional(),
  agencyId: z.string().uuid().optional(),
  agencyRole: z.enum(['AGENCY_OWNER', 'AGENCY_ADMIN', 'AGENT']).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100).optional(),
  accountStatus: z.nativeEnum(AccountStatus).default(AccountStatus.ACTIVE),
});

export const inviteUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address').max(255),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(255),
  role: z.nativeEnum(Role),
  agentType: z.enum(['INDEPENDENT', 'AGENCY_MEMBER']).default('INDEPENDENT'),
  companyName: z.string().trim().max(255).optional(),
  agencyId: z.string().uuid().optional(),
  agencyRole: z.enum(['AGENCY_OWNER', 'AGENCY_ADMIN', 'AGENT']).optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(255).optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  whatsapp: z.string().trim().max(50).nullable().optional(),
  brn: z.string().trim().max(50).nullable().optional(),
  nationality: z.string().trim().max(100).nullable().optional(),
  companyName: z.string().trim().max(255).nullable().optional(),
  role: z.nativeEnum(Role).optional(),
  agentType: z.enum(['INDEPENDENT', 'AGENCY_MEMBER']).optional(),
  coordinatorId: z.string().uuid().nullable().optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.nativeEnum(AccountStatus),
  reason: z.string().max(500).optional(),
});

export const adminReferralQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  serviceId: z.string().optional(),
  partnerId: z.string().optional(),
  agentId: z.string().optional(),
  coordinatorId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminServiceSchema = z.object({
  name: z.string().trim().min(2).max(255),
  slug: z.string().trim().min(2).max(100),
  description: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  defaultPartnerCommissionBps: z.coerce.number().int().min(0).max(10000).default(0),
  defaultAgentCommissionBps: z.coerce.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true),
});

export type AgentQueryInput = z.infer<typeof agentQuerySchema>;
export type AgencyQueryInput = z.infer<typeof agencyQuerySchema>;
export type UpdateAgentStatusInput = z.infer<typeof updateAgentStatusSchema>;
export type UpdateAgencyStatusInput = z.infer<typeof updateAgencyStatusSchema>;
export type ReviewKycDocumentInput = z.infer<typeof reviewKycDocumentSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type VerifyBankInput = z.infer<typeof verifyBankSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type AdminReferralQueryInput = z.infer<typeof adminReferralQuerySchema>;
export type AdminServiceInput = z.infer<typeof adminServiceSchema>;
