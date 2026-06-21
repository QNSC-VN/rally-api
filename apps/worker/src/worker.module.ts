import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
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
