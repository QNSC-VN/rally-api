import { Module } from '@nestjs/common';
import { IdentityController } from './interface/http/identity.controller';
import { AuthController } from './interface/http/auth.controller';
import { IdentityService } from './application/identity.service';
import { AuthService } from './application/auth.service';
import { UserDrizzleRepository } from './infrastructure/persistence/user.drizzle-repository';
import { AuthSessionDrizzleRepository } from './infrastructure/persistence/auth-session.drizzle-repository';
import { USER_REPOSITORY } from './domain/ports/user.repository';
import { AUTH_SESSION_REPOSITORY } from './domain/ports/auth-session.repository';

@Module({
  controllers: [IdentityController, AuthController],
  providers: [
    IdentityService,
    AuthService,
    { provide: USER_REPOSITORY, useClass: UserDrizzleRepository },
    { provide: AUTH_SESSION_REPOSITORY, useClass: AuthSessionDrizzleRepository },
  ],
  exports: [IdentityService, AuthService],
})
export class IdentityModule {}
