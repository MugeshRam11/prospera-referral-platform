import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env if present
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),
  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgres@localhost:5432/prospera_referral_db?schema=public'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
};

export const config = parseEnv();
export type Config = z.infer<typeof envSchema>;
