import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TerminusModule } from '@nestjs/terminus';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/app-config.service';
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './cache/valkey.module';
import { RequestContextService } from './context/request-context';
import { JwtStrategy } from './auth/jwt.strategy';
import { JwtAuthGuard } from './auth/jwt.guard';
import { PermissionGuard } from './auth/permission.guard';
import { OutboxService } from './outbox/outbox.service';
import { HealthController } from './observability/health.controller';

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
          algorithm: 'EdDSA',
          expiresIn: config.get('JWT_ACCESS_EXPIRY'),
          issuer: config.get('JWT_ISSUER'),
          audience: config.get('JWT_AUDIENCE'),
        },
        verifyOptions: {
          algorithms: ['EdDSA', 'RS256'],
          issuer: config.get('JWT_ISSUER'),
          audience: config.get('JWT_AUDIENCE'),
        },
      }),
    }),

    TerminusModule,
  ],
  controllers: [HealthController],
  providers: [
    RequestContextService,
    JwtStrategy,
    JwtAuthGuard,
    PermissionGuard,
    OutboxService,
  ],
  exports: [
    AppConfigModule,
    AppConfigService,
    DatabaseModule,
    CacheModule,
    JwtModule,
    RequestContextService,
    JwtAuthGuard,
    PermissionGuard,
    OutboxService,
  ],
})
export class PlatformModule {}
