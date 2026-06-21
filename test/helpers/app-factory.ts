/**
 * E2E App Factory — creates a real NestJS + Fastify application for E2E tests.
 * Uses the real AppModule wired to the containers started by e2e-global-setup.ts.
 * Email is mocked so no SES calls go out during tests.
 */
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import { AppModule } from '../../apps/api/src/app.module';
import { EmailService } from '@platform';

/** Creates and fully initialises the NestJS app. Call `app.close()` in afterAll. */
export async function createTestApp(): Promise<NestFastifyApplication> {
  // Override DATABASE_URL and REDIS_URL with the container URLs set in globalSetup
  process.env['DATABASE_URL'] = process.env['E2E_DATABASE_URL'] ?? process.env['DATABASE_URL'];
  process.env['REDIS_URL'] = process.env['E2E_REDIS_URL'] ?? process.env['REDIS_URL'];
  process.env['NODE_ENV'] = 'test';
  process.env['CORS_ORIGINS'] = 'http://localhost:5173';

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

  return app;
}
