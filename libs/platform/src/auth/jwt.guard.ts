import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestContextService } from '../context/request-context';
import { ValkeyService } from '../cache/valkey.service';

/**
 * JWT auth guard.
 * Verifies the Bearer access token, then populates request context with
 * tenantId / userId / sessionId so UoW + RLS work correctly downstream.
 * Also checks the access-token denylist in Valkey (set on logout).
 *
 * Pair with @Public() decorator to opt-out individual routes.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly ctx: RequestContextService,
    private readonly valkey: ValkeyService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = await (super.canActivate(context) as Promise<boolean>);
    if (!result) return false;

    const req = context.switchToHttp().getRequest<{ user: { jti: string } }>();
    if (await this.valkey.isTokenDenied(req.user.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return true;
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
