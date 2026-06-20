import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionDeniedException } from '../errors/exceptions';
import { PERMISSION_KEY } from './decorators';

/**
 * Permission guard — RBAC + ABAC check.
 * Reads required permission code from @RequirePermission() decorator,
 * delegates to the access module's PermissionService.
 *
 * The actual permission lookup is done by the injected IPermissionService
 * (port, implemented in libs/modules/access).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission annotation → allow (auth is handled by JwtAuthGuard)
    if (!requiredPermission) return true;

    // TODO: inject IPermissionService and call check(userId, tenantId, requiredPermission, resource)
    // For now, guard is wired but delegates to implementation in access module
    throw new PermissionDeniedException('Permission check not yet implemented');
  }
}
