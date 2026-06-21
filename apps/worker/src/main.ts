// OTel must be bootstrapped BEFORE any other imports so auto-instrumentation patches modules
import { shutdownOtel } from './otel';

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

  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`Received ${signal} — shutting down worker…`, 'Bootstrap');
    try {
      await shutdownOtel();
      await app.close();
      logger.log('Worker shutdown complete', 'Bootstrap');
    } catch (err) {
      logger.error({ msg: 'Error during worker shutdown', err }, 'Bootstrap');
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({ msg: 'Unhandled promise rejection', reason }, 'Bootstrap');
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error({ msg: 'Uncaught exception', error }, 'Bootstrap');
    process.exit(1);
  });
}

void bootstrap();
