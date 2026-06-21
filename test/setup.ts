/**
 * Global test setup — runs before every test file.
 * Provides the minimum environment variables to satisfy AppConfigModule's
 * Zod validation so the NestJS module tree can be loaded without a real .env.
 */

// Ed25519 key pair (test-only — never used for production signing)
const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VdBCIEIBSJkYHQlqDKH4oPkMNdTQUbxv3J3Y5uO6qCc2N+TLOM
-----END PRIVATE KEY-----`;

const TEST_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VdAyEAMNRQ3BqfMpDXBqPEkIjPv2FW9r5R9c3N5t6lFHfr3ZA=
-----END PUBLIC KEY-----`;

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_URL: 'redis://localhost:6379',
  REDIS_KEY_PREFIX: 'test:',
  JWT_PRIVATE_KEY: TEST_PRIVATE_KEY,
  JWT_PUBLIC_KEY: TEST_PUBLIC_KEY,
  JWT_ACCESS_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY: '30d',
  JWT_ISSUER: 'rally-test',
  JWT_AUDIENCE: 'rally-test-app',
  JWT_REFRESH_TOKEN_MAX_FAMILY_SIZE: '10',
  CSRF_SECRET: 'test-csrf-secret-32-chars-minimum!!',
  PASSWORD_RESET_TOKEN_TTL_HOURS: '2',
  INVITATION_TTL_DAYS: '7',
  LOG_LEVEL: 'silent',
  OTEL_ENABLED: 'false',
  OTEL_SERVICE_NAME: 'rally-api-test',
  OTEL_WORKER_SERVICE_NAME: 'rally-worker-test',
  APP_BASE_URL: 'http://localhost:5173',
});

/**
 * Suppress the unhandled rejection that ConfigModule.forRoot emits when
 * it tries to validate process.env inside a NestJS async factory. In unit
 * tests we never bootstrap a full NestJS app — the factory runs in a
 * microtask, finds no real DB_URL etc., and rejects. Intercepting it here
 * keeps test output clean; the config service itself is always mocked in
 * unit-test modules.
 */
process.on('unhandledRejection', (reason) => {
  const msg = String(reason);
  if (msg.includes('Invalid environment configuration')) {
    // Expected in unit tests — config module is fully mocked.
    return;
  }
  // Re-throw any unexpected rejections so they surface normally.
  throw reason;
});
