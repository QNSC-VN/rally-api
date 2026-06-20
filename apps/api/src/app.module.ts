import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { PlatformModule } from '@platform';
import { IdentityModule } from '@modules/identity';
import { TenancyModule } from '@modules/tenancy';
import { AccessModule } from '@modules/access';
import { ProjectsModule } from '@modules/projects';
import { WorkItemsModule } from '@modules/work-items';
import { WorkflowModule } from '@modules/workflow';
import { CollaborationModule } from '@modules/collaboration';
import { NotificationsModule } from '@modules/notifications';
import { AuditModule } from '@modules/audit';
import { ReportingModule } from '@modules/reporting';
import { GlobalExceptionFilter } from '@platform/http/global-exception.filter';
import { ZodValidationPipe } from 'nestjs-zod';
import { AsyncLocalStorageMiddleware } from '@platform/context/als.middleware';

@Module({
  imports: [
    // Pino structured logging — request log on every route
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL'] ?? 'info',
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        customProps: () => ({ service: 'rally-api' }),
        serializers: {
          req(req) {
            return {
              method: req.method,
              url: req.url,
              correlationId: req.headers['x-correlation-id'],
            };
          },
        },
      },
    }),

    // Platform (config, db, auth, cache, outbox, observability)
    PlatformModule,

    // Bounded contexts
    IdentityModule,
    TenancyModule,
    AccessModule,
    ProjectsModule,
    WorkItemsModule,
    WorkflowModule,
    CollaborationModule,
    NotificationsModule,
    AuditModule,
    ReportingModule,
  ],
  providers: [
    // Global exception filter → stable RFC-9457-style error envelope
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },

    // Global validation pipe (Zod)
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // AsyncLocalStorage middleware — sets correlationId + tenant/user stubs for every request
    consumer.apply(AsyncLocalStorageMiddleware).forRoutes('*');
  }
}
