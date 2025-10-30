/**
 * Environment configuration
 */

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('8080'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  S3_ENDPOINT: z.string(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_FORCE_PATH_STYLE: z.string().transform(val => val === 'true').default('false'),
  CORS_ORIGINS: z.string().transform(str => str.split(',')),
});

export const env = envSchema.parse(process.env);
