import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@platform';

/**
 * Extract the authenticated user's JWT payload from the request.
 * Only use on routes protected by @Auth() or JwtAuthGuard.
 *
 * @example
 * async getMe(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): JwtPayload => {
  const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
  return request.user;
});
