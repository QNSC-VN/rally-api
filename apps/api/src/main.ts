// OTel must be bootstrapped BEFORE any other imports so auto-instrumentation patches modules
import './otel';

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { bootstrapApp } from './bootstrap/app.bootstrap';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      // Disable Fastify's built-in logger — pino handles all logging
      logger: false,
      // Trust X-Forwarded-For from ALB
      trustProxy: true,
    }),
    { bufferLogs: true },
  );

  await bootstrapApp(app);

  const port = parseInt(process.env['PORT'] ?? '3000', 10);
  const host = process.env['HOST'] ?? '0.0.0.0';

  await app.listen(port, host);

  const logger = app.get(Logger);
  logger.log(`🚀 API listening on ${host}:${port} [${process.env['NODE_ENV']}]`, 'Bootstrap');
}

void bootstrap();
