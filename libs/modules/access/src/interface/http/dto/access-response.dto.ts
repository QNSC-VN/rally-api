export interface RoleResponseDto {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
}

export interface RoleAssignmentResponseDto {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  scopeType: string;
  scopeId: string | null;
  grantedBy: string | null;
  createdAt: string;
}
