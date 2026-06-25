/**
 * Global test setup — runs before every test file.
 * Provides the minimum environment variables to satisfy AppConfigModule's
 * Zod validation so the NestJS module tree can be loaded without a real .env.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Ed25519 key pair (test-only — never used for production signing)
const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgGgNdxreynQibKpNR
ssO/UZdofFbaVXKeY4eCIHCy7TGhRANCAARYH16jRo1eyvlUy8tjTzPMUFzZUvQy
T30XTMmh3R0SmEQflkr8aZ850TuN0oPLMU9oktLlDpZD+Gr7TGvuSc8/
-----END PRIVATE KEY-----`;

const TEST_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEWB9eo0aNXsr5VMvLY08zzFBc2VL0
Mk99F0zJod0dEphEH5ZK/GmfOdE7jdKDyzFPaJLS5Q6WQ/hq+0xr7knPPw==
-----END PUBLIC KEY-----`;

// For E2E tests: read container URLs written by globalSetup.
// Must happen here (before test file imports) so ConfigModule.forRoot()
// sees the correct DATABASE_URL when AppModule is first imported.
const E2E_CONFIG_FILE = join(tmpdir(), 'rally-e2e-config.json');
let e2eDbUrl = 'postgresql://test:test@localhost:5432/test';
let e2eRedisUrl = 'redis://localhost:6379';
if (existsSync(E2E_CONFIG_FILE)) {
  try {
    const cfg = JSON.parse(readFileSync(E2E_CONFIG_FILE, 'utf8')) as {
      dbUrl: string;
      redisUrl: string;
    };
    e2eDbUrl = cfg.dbUrl;
    e2eRedisUrl = cfg.redisUrl;
  } catch {
    // ignore parse errors — fall back to unit-test defaults
  }
}

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: e2eDbUrl,
  REDIS_URL: e2eRedisUrl,
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
  LOG_LEVEL: 'error',
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
