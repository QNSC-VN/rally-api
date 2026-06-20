import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { PlatformModule } from '@platform';
import { AuditModule } from '@modules/audit';
import { NotificationsModule } from '@modules/notifications';
import { ReportingModule } from '@modules/reporting';

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

    // Contexts with SQS consumers
    AuditModule,
    NotificationsModule,
    ReportingModule,
  ],
})
export class WorkerModule {}
