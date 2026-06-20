import { z } from 'zod';

/**
 * Validated environment schema.
 * Process refuses to start if any required variable is missing or malformed.
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.coerce.number().int().positive().default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),
  DATABASE_MIGRATION_URL: z.string().url().optional(),

  // Redis / Valkey
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_KEY_PREFIX: z.string().default('rally:'),

  // JWT
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),
  JWT_ISSUER: z.string().default('rally-api'),
  JWT_AUDIENCE: z.string().default('rally-web'),

  // CSRF
  CSRF_SECRET: z.string().min(32),

  // AWS
  AWS_REGION: z.string().default('ap-southeast-1'),
  AWS_ACCOUNT_ID: z.string().optional(),
  SNS_TOPIC_ARN: z.string().optional(),
  SQS_NOTIFICATIONS_URL: z.string().optional(),
  SQS_AUDIT_URL: z.string().optional(),
  SQS_REPORTING_URL: z.string().optional(),
  SQS_SEARCH_URL: z.string().optional(),
  S3_ATTACHMENTS_BUCKET: z.string().default('rally-attachments'),

  // Observability
  OTEL_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default(false),
  OTEL_SERVICE_NAME: z.string().default('rally-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Resilience
  RESILIENCE_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default(true),
});

export type Env = z.infer<typeof EnvSchema>;
