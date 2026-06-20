import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt.guard';
import { PermissionGuard } from './permission.guard';

export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSION_KEY = 'requiredPermission';

/** Mark a route as unauthenticated (skip JwtAuthGuard). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Require a specific permission code (RBAC check via PermissionGuard). */
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);

/** Apply JWT auth + permission guard + Swagger bearer annotation in one decorator. */
export const Auth = (permission?: string) =>
  applyDecorators(
    ...[
      UseGuards(JwtAuthGuard, PermissionGuard),
      ApiBearerAuth('access-token'),
      ...(permission ? [RequirePermission(permission)] : []),
    ],
  );
