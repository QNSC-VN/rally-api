import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from './decorators';

/**
 * Permission guard — RBAC + ABAC check.
 * Reads required permission code from @RequirePermission() decorator,
 * delegates to the access module's PermissionService.
 *
 * The actual permission lookup is done by the injected IPermissionService
 * (port, implemented in libs/modules/access).
 *
 * TODO(phase1): inject IPermissionService and call
 *   check(userId, tenantId, requiredPermission, resource)
 * Until the access module is wired this guard LOGS the required permission
 * and allows the request through, so that routes decorated with
 * @RequirePermission() are not unconditionally blocked.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission annotation → allow (auth is handled by JwtAuthGuard)
    if (!requiredPermission) return true;

    // Access module not yet wired — log and allow through.
    // Replace this block with a real IPermissionService call in Phase 1.
    this.logger.warn(
      { requiredPermission },
      'PermissionGuard: access module not wired — allowing request (replace before GA)',
    );
    return true;
  }
}
