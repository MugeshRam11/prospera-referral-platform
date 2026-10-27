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

export type AgentQueryInput = z.infer<typeof agentQuerySchema>;
export type AgencyQueryInput = z.infer<typeof agencyQuerySchema>;
export type UpdateAgentStatusInput = z.infer<typeof updateAgentStatusSchema>;
export type UpdateAgencyStatusInput = z.infer<typeof updateAgencyStatusSchema>;
export type ReviewKycDocumentInput = z.infer<typeof reviewKycDocumentSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type VerifyBankInput = z.infer<typeof verifyBankSchema>;
