import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { trace, isSpanContextValid } from '@opentelemetry/api';
import { requestContextStorage } from '@platform/context/request-context';
import { PlatformModule } from '@platform';
import { AuditModule } from '@modules/audit';
import { NotificationsModule } from '@modules/notifications';
import { ReportingModule } from '@modules/reporting';
import { OutboxRelayService } from './outbox/outbox-relay.service';
import { AuditConsumer } from './consumers/audit.consumer';
import { NotificationsConsumer } from './consumers/notifications.consumer';
import { SnapshotCronService } from './cron/snapshot.cron';
import { CleanupCronService } from './cron/cleanup.cron';

/**
 * Worker process module.
 * Imports only the bounded contexts that have queue consumers or cron jobs.
 * Shares all platform infrastructure (DB, cache, outbox relay) with the API process.
 */
@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL'] ?? 'info',
        customProps: () => ({ service: 'rally-worker' }),
        mixin: () => {
          const result: Record<string, unknown> = {};
          const span = trace.getActiveSpan();
          if (span) {
            const ctx = span.spanContext();
            if (isSpanContextValid(ctx)) {
              result['trace.id'] = ctx.traceId;
              result['span.id'] = ctx.spanId;
            }
          }
          const reqCtx = requestContextStorage.getStore();
          if (reqCtx) {
            if (reqCtx.tenantId) result['tenantId'] = reqCtx.tenantId;
            if (reqCtx.userId) result['userId'] = reqCtx.userId;
            if (reqCtx.correlationId) result['correlationId'] = reqCtx.correlationId;
          }
          return result;
        },
      },
    }),
    ScheduleModule.forRoot(),
    PlatformModule,

    // Contexts with SQS consumers / cron jobs
    AuditModule,
    NotificationsModule,
    ReportingModule,
  ],
  providers: [
    // Transactional outbox → SNS relay
    OutboxRelayService,
    // SQS long-poll consumers
    AuditConsumer,
    NotificationsConsumer,
    // Scheduled cron jobs
    SnapshotCronService,
    CleanupCronService,
  ],
})
export class WorkerModule {}
