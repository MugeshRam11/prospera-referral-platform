import { z } from 'zod';
import { OtpPurpose } from '@prisma/client';

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address format')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters long')
    .trim(),
  phone: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address format')
    .transform((val) => val.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const verifyOtpSchema = z.object({
  email: z
    .string()
    .email('Invalid email address format')
    .transform((val) => val.toLowerCase().trim()),
  code: z
    .string()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
  purpose: z.nativeEnum(OtpPurpose).default(OtpPurpose.SIGNUP_VERIFICATION),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const resendOtpSchema = z.object({
  email: z
    .string()
    .email('Invalid email address format')
    .transform((val) => val.toLowerCase().trim()),
  purpose: z.nativeEnum(OtpPurpose).default(OtpPurpose.SIGNUP_VERIFICATION),
});

export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
