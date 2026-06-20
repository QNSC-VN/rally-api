import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestContextService } from '../context/request-context';

/**
 * JWT auth guard.
 * Verifies the Bearer access token, then populates request context with
 * tenantId / userId / sessionId so UoW + RLS work correctly downstream.
 *
 * Pair with @Public() decorator to opt-out individual routes.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly ctx: RequestContextService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser extends { sub: string; tenantId: string; sessionId: string }>(
    err: Error | null,
    user: TUser | false,
  ): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid or expired access token');
    }

    // Populate AsyncLocalStorage context after successful token verification
    this.ctx.setAuthContext(user.tenantId, user.sub, user.sessionId);

    return user;
  }
}
