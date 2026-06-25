/**
 * E2E App Factory — creates a real NestJS + Fastify application for E2E tests.
 * Uses the real AppModule wired to the containers started by e2e-global-setup.ts.
 * Email is mocked so no SES calls go out during tests.
 */
import 'reflect-metadata';
import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import { AppModule } from '../../apps/api/src/app.module';
import { EmailService, ValkeyService } from '@platform';

/** Creates and fully initialises the NestJS app. Call `app.close()` in afterAll. */
export async function createTestApp(): Promise<NestFastifyApplication> {
  // DATABASE_URL and REDIS_URL are set correctly by test/setup.ts which reads
  // from the temp file written by e2e-global-setup.ts (runs before any imports).
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailService)
    .useValue({
      sendPasswordReset: vi.fn().mockResolvedValue(undefined),
      sendWorkspaceInvitation: vi.fn().mockResolvedValue(undefined),
    })
    .compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ logger: false }),
  );

  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyCompress);
  await app.register(fastifyCookie, { secret: process.env['CSRF_SECRET'] });

  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  // Bypass rate limiting for all E2E tests by mocking consumeRateLimit on the
  // real ValkeyService instance (after app init so the guard holds a ref to it).
  // isTokenDenied remains real so logout/token-revocation tests still work.
  const valkey = app.get(ValkeyService);
  vi.spyOn(valkey, 'consumeRateLimit').mockResolvedValue({
    allowed: true,
    remaining: 9999,
    resetAt: Date.now() + 3_600_000,
  });

  return app;
}
