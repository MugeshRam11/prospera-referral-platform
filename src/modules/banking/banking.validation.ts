import { z } from 'zod';

export const createBankAccountSchema = z.object({
  bankName: z.string().min(2, 'Bank name is required').max(255),
  accountHolderName: z.string().min(2, 'Account holder name is required').max(255),
  iban: z
    .string()
    .min(15, 'IBAN must be at least 15 characters')
    .max(34, 'IBAN cannot exceed 34 characters')
    .regex(/^[A-Z]{2}[0-9A-Z]{13,32}$/i, 'Invalid IBAN format. Example: AE070330000000001234567'),
  swift: z
    .string()
    .regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/i, 'Invalid SWIFT/BIC code format')
    .optional()
    .nullable()
    .or(z.literal('')),
  currency: z.string().length(3).default('AED'),
  isPrimary: z.boolean().default(true).optional(),
  agencyId: z.string().uuid().optional(),
});

export const verifyBankAccountSchema = z.object({
  isVerified: z.boolean(),
  rejectionReason: z.string().max(500).optional(),
});

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type VerifyBankAccountInput = z.infer<typeof verifyBankAccountSchema>;
