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

  // JWT — keys must be valid PEM blocks
  JWT_PRIVATE_KEY: z
    .string()
    .min(1)
    .refine((v) => v.includes('-----BEGIN'), 'JWT_PRIVATE_KEY must be a PEM-encoded private key'),
  JWT_PUBLIC_KEY: z
    .string()
    .min(1)
    .refine((v) => v.includes('-----BEGIN'), 'JWT_PUBLIC_KEY must be a PEM-encoded public key'),
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

  // Email (AWS SES)
  /** Verified sender address. When not set, EmailService logs instead of sending. */
  SES_FROM_EMAIL: z.string().email().optional(),
  /** Public base URL used to build password-reset and invitation links (e.g. https://app.rally.io). */
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),

  // Observability
  OTEL_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  OTEL_SERVICE_NAME: z.string().default('rally-api'),
  OTEL_WORKER_SERVICE_NAME: z.string().default('rally-worker'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318'),
  /** 0.0–1.0 fraction of root spans to sample. Defaults: 1.0 dev, 0.1 prod. */
  OTEL_SAMPLING_PROBABILITY: z.coerce.number().min(0).max(1).optional(),
  /** Semver string injected into OTEL resource and Pino logs. */
  SERVICE_VERSION: z.string().default('dev'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Resilience
  RESILIENCE_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  // Rate limiting (per-user sliding window)
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),

  // TTL knobs — defaults match SRS but allow ops to tune without code change
  PASSWORD_RESET_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(1),
  INVITATION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  SESSION_CLEANUP_OLDER_THAN_DAYS: z.coerce.number().int().positive().default(7),
});

export type Env = z.infer<typeof EnvSchema>;
