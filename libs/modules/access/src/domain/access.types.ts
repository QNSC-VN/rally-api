export type ScopeType = 'global' | 'workspace' | 'project';

export interface SystemRole {
  id: string;
  tenantId: string | null; // null = global system role
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  createdAt: Date;
}

export interface UserRoleAssignment {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeId: string | null;
  grantedBy: string | null;
  createdAt: Date;
}

export interface AssignRoleInput {
  id: string;
  tenantId: string;
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeId?: string;
  grantedBy: string;
}
