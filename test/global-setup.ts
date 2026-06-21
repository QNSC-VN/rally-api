/**
 * Vitest global setup — runs in the main Node.js process before any workers.
 * Sets the minimal env vars required by AppConfigModule's Zod validation so
 * the NestJS module tree can be evaluated during test file imports.
 */
export function setup() {
  const TEST_PRIVATE_KEY =
    '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VdBCIEIBSJkYHQlqDKH4oPkMNdTQUbxv3J3Y5uO6qCc2N+TLOM\n-----END PRIVATE KEY-----';
  const TEST_PUBLIC_KEY =
    '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VdAyEAMNRQ3BqfMpDXBqPEkIjPv2FW9r5R9c3N5t6lFHfr3ZA=\n-----END PUBLIC KEY-----';

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
    CSRF_SECRET: 'test-csrf-secret-at-least-32-chars!!',
    PASSWORD_RESET_TOKEN_TTL_HOURS: '2',
    INVITATION_TTL_DAYS: '7',
    LOG_LEVEL: 'silent',
    OTEL_ENABLED: 'false',
    OTEL_SERVICE_NAME: 'rally-api-test',
    OTEL_WORKER_SERVICE_NAME: 'rally-worker-test',
    APP_BASE_URL: 'http://localhost:5173',
  });
}
