// Worker process: SQS consumers, outbox relay, cron scheduler
// Shares all domain libs — no HTTP surface

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(WorkerModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.flushLogs();

  // Worker has no HTTP listener — it consumes queues and runs cron
  await app.init();

  const logger = app.get(Logger);
  logger.log('Worker process started', 'Bootstrap');
}

void bootstrap();
