import { z } from 'zod';
import { AgencyRole } from '../../types';

export const registerAgencySchema = z.object({
  name: z.string().min(2, 'Agency brand name is required').max(255),
  legalName: z.string().min(2, 'Legal entity name is required').max(255),
  tradeLicenseNo: z.string().min(2, 'Trade license number is required').max(100),
  orn: z.string().max(50).optional().nullable(),
  dedLicenseNo: z.string().max(50).optional().nullable(),
  email: z.string().email('Valid agency email required'),
  phone: z.string().min(5, 'Valid agency phone number required').max(50),
  address: z.string().max(1000).optional().nullable(),
  poBox: z.string().max(50).optional().nullable(),
});

export const updateAgencySchema = registerAgencySchema.partial();

export const inviteAgentSchema = z.object({
  email: z.string().email('Valid agent email address required'),
  role: z.enum([AgencyRole.AGENCY_ADMIN, AgencyRole.AGENT]).default(AgencyRole.AGENT),
});

export const joinAgencySchema = z.object({
  inviteToken: z.string().min(6, 'Invite token must be at least 6 characters'),
});

export type RegisterAgencyInput = z.infer<typeof registerAgencySchema>;
export type UpdateAgencyInput = z.infer<typeof updateAgencySchema>;
export type InviteAgentInput = z.infer<typeof inviteAgentSchema>;
export type JoinAgencyInput = z.infer<typeof joinAgencySchema>;
