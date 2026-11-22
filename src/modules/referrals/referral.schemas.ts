import { z } from 'zod';
import { LeadStatus } from '@prisma/client';

export const createReferralSchema = z
  .object({
    serviceId: z.string().uuid({ message: 'Invalid service ID format' }),
    clientName: z
      .string()
      .trim()
      .min(2, 'Client name must be at least 2 characters')
      .max(255),
    clientEmail: z
      .string()
      .email('Invalid client email address')
      .trim()
      .toLowerCase()
      .optional()
      .nullable(),
    clientPhone: z
      .string()
      .trim()
      .min(7, 'Client phone must be at least 7 characters')
      .max(50),
    expectedDealValue: z.coerce
      .number()
      .positive('Expected deal value must be greater than zero').max(9999999999.99),
    currency: z.string().min(3).max(3).default('AED'),
    notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional().nullable(),
    partnerId: z.string().uuid({ message: 'Invalid partner ID format' }).optional(),
    requirements: z.string().trim().max(1200).optional(),
    demoPropertyId: z.enum(['creek-court', 'palm-garden', 'marina-terrace']).optional(),
    submissionKey: z.string().uuid().optional(),
    consent: z.boolean().optional(),
    asDraft: z.boolean().optional(),
  })
  .strict();

export type CreateReferralInput = z.infer<typeof createReferralSchema>;

export const updateReferralSchema = z
  .object({
    requirements: z.string().trim().max(1200).optional(),
    clientName: z.string().trim().min(2).max(255).optional(),
    clientEmail: z.string().email('Invalid email address').trim().toLowerCase().optional().nullable(),
    clientPhone: z.string().trim().min(7).max(50).optional(),
    expectedDealValue: z.coerce.number().positive('Expected deal value must be greater than zero').max(9999999999.99).optional(),
    actualDealValue: z.coerce.number().positive('Actual deal value must be greater than zero').optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  );

export type UpdateReferralInput = z.infer<typeof updateReferralSchema>;

export const transitionStatusSchema = z
  .object({
    consent: z.boolean().optional(),
    status: z.nativeEnum(LeadStatus),
    transitionNote: z.string().max(1000).optional().nullable(),
    actualDealValue: z.coerce.number().positive().optional().nullable(),
    lostReasonId: z.string().uuid({ message: 'Invalid lost reason ID' }).optional().nullable(),
    lostDetails: z.string().max(1000).optional().nullable(),
  })
  .strict();

export type TransitionStatusInput = z.infer<typeof transitionStatusSchema>;

export const assignReferralSchema = z
  .object({
    expectedRevision: z.number().int().min(0).optional(),
    coordinatorId: z.string().uuid({ message: 'Invalid coordinator ID' }).optional().nullable(),
    agentId: z.string().uuid({ message: 'Invalid agent ID' }).optional().nullable(),
    assignmentNote: z.string().max(1000).optional().nullable(),
  })
  .strict()
  .refine(
    (data) => data.coordinatorId !== undefined || data.agentId !== undefined,
    { message: 'At least one of coordinatorId or agentId must be provided' }
  );

export type AssignReferralInput = z.infer<typeof assignReferralSchema>;

export const listReferralsQuerySchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  serviceId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'expectedDealValue', 'clientName', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListReferralsQuery = z.infer<typeof listReferralsQuerySchema>;

export const referralIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid referral ID format' }),
});

export const agencyDecisionSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('approve') }).strict(),
  z.object({ decision: z.literal('return'), reason: z.string().trim().min(1).max(1000) }).strict(),
]);
export type AgencyDecision = z.infer<typeof agencyDecisionSchema>;

export const followUpSchema = z.object({
  note: z.string().trim().min(1).max(1000),
  nextAction: z.string().trim().min(1).max(300),
  due: z.iso.date(),
}).strict();
