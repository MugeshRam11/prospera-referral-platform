import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must have at least 2 characters').max(255).optional(),
  phone: z.string().max(50).optional().nullable(),
  whatsapp: z.string().max(50).optional().nullable(),
  brn: z.string().max(50).optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  companyName: z.string().max(255).optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
