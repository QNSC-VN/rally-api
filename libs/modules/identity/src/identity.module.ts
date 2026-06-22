import { Module } from '@nestjs/common';
import { IdentityController } from './interface/http/identity.controller';
import { AuthController } from './interface/http/auth.controller';
import { AuthService } from './application/auth.service';
import { UserDrizzleRepository } from './infrastructure/persistence/user.drizzle-repository';
import { AuthSessionDrizzleRepository } from './infrastructure/persistence/auth-session.drizzle-repository';
import { USER_REPOSITORY } from './domain/ports/user.repository';
import { AUTH_SESSION_REPOSITORY } from './domain/ports/auth-session.repository';
import { AccessModule } from '@modules/access';

@Module({
  imports: [AccessModule],
  controllers: [IdentityController, AuthController],
  providers: [
    AuthService,
    { provide: USER_REPOSITORY, useClass: UserDrizzleRepository },
    { provide: AUTH_SESSION_REPOSITORY, useClass: AuthSessionDrizzleRepository },
  ],
  exports: [AuthService],
})
export class IdentityModule {}
