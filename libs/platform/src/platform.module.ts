import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TerminusModule } from '@nestjs/terminus';
import { APP_GUARD } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/app-config.service';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/valkey.module';
import { RequestContextService } from './context/request-context';
import { JwtStrategy } from './auth/jwt.strategy';
import { JwtAuthGuard } from './auth/jwt.guard';
import { PermissionGuard } from './auth/permission.guard';
import { RateLimitGuard } from './rate-limit/rate-limit.guard';
import { OutboxService } from './outbox/outbox.service';
import { TenantRlsService } from './database/tenant-rls.service';
import { EmailService } from './email/email.service';
import { HealthController } from './observability/health.controller';
import { Algorithm } from 'jsonwebtoken';
import { IdempotencyInterceptor } from './http/idempotency.interceptor';
import { HttpLoggingInterceptor } from './http/http-logging.interceptor';
import { ResilienceModule } from './resilience/resilience.module';

@Global()
@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    CacheModule,

    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        privateKey: config.get('JWT_PRIVATE_KEY'),
        publicKey: config.get('JWT_PUBLIC_KEY'),
        signOptions: {
          algorithm: 'ES256' as Algorithm,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expiresIn: config.get('JWT_ACCESS_EXPIRY') as any,
          issuer: config.get('JWT_ISSUER'),
          audience: config.get('JWT_AUDIENCE'),
        },
        verifyOptions: {
          algorithms: ['ES256'] as Algorithm[],
          issuer: config.get('JWT_ISSUER'),
          audience: config.get('JWT_AUDIENCE'),
        },
      }),
    }),

    TerminusModule,
    ResilienceModule,
  ],
  controllers: [HealthController],
  providers: [
    RequestContextService,
    JwtStrategy,
    JwtAuthGuard,
    PermissionGuard,
    // Global rate-limit guard — applies to every route.
    // Use @RateLimit('TIER') to override, @SkipRateLimit() to opt out.
    { provide: APP_GUARD, useClass: RateLimitGuard },
    OutboxService,
    TenantRlsService,
    EmailService,
    IdempotencyInterceptor,
    HttpLoggingInterceptor,
  ],
  exports: [
    AppConfigModule,
    DatabaseModule,
    CacheModule,
    JwtModule,
    RequestContextService,
    JwtAuthGuard,
    PermissionGuard,
    OutboxService,
    TenantRlsService,
    EmailService,
    IdempotencyInterceptor,
    HttpLoggingInterceptor,
    ResilienceModule,
  ],
})
export class PlatformModule {}
