import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env if present
dotenv.config();

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),
  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/prospera_referral_db?schema=public'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Authentication & Security Settings
  OTP_SECRET: z
    .string()
    .min(16)
    .default('dev-only-otp-hmac-secret-min-32-chars-long-prospera'),
  SESSION_EXPIRY_DAYS: z.coerce.number().default(7),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().default(120), // 2 hours idle timeout (SEC-06)
  SESSION_TOUCH_INTERVAL_MINUTES: z.coerce.number().default(5), // Throttle lastActiveAt DB writes to 5 mins (SEC-08)
  OTP_EXPIRY_MINUTES: z.coerce.number().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  OTP_COOLDOWN_SECONDS: z.coerce.number().default(60),

  // Login Throttling Limits (SEC-02)
  LOGIN_ACCOUNT_MAX_FAILED_ATTEMPTS: z.coerce.number().default(5),
  LOGIN_ACCOUNT_LOCKOUT_MINUTES: z.coerce.number().default(15),
  LOGIN_IP_MAX_FAILED_ATTEMPTS: z.coerce.number().default(20),
  LOGIN_IP_LOCKOUT_MINUTES: z.coerce.number().default(15),
  REQUIRE_SHARED_THROTTLER: z.coerce.boolean().default(false), // SEC-02: Fail safely if cluster requires shared store
});

// Enforce production security rules (SEC-01 & SEC-02)
export const envSchema = baseEnvSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    const knownInsecureSecrets = [
      'dev-only-otp-hmac-secret-min-32-chars-long-prospera',
      'replace-with-cryptographically-secure-random-secret-min-32-chars',
      'insecure-secret',
    ];

    if (
      !data.OTP_SECRET ||
      knownInsecureSecrets.includes(data.OTP_SECRET) ||
      data.OTP_SECRET.length < 32
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OTP_SECRET'],
        message:
          'In production, OTP_SECRET must be an explicitly configured, high-entropy secret of at least 32 characters and cannot match development defaults.',
      });
    }
  }

  // Fail safely if deployment configuration requires multi-instance shared throttling
  if (data.REQUIRE_SHARED_THROTTLER) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['REQUIRE_SHARED_THROTTLER'],
      message:
        'REQUIRE_SHARED_THROTTLER is enabled, but shared rate limiter infrastructure (Redis/Valkey) is not configured in this phase. Failing safely at startup to prevent uncoordinated multi-instance rate limit bypass.',
    });
  }
});

export const parseEnv = (envObj: NodeJS.ProcessEnv = process.env) => {
  const result = envSchema.safeParse(envObj);

  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
};

export const config = parseEnv();
export type Config = z.infer<typeof envSchema>;
