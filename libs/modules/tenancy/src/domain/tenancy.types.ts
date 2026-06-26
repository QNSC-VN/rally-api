import type {
  TenantStatus,
  SubscriptionPlan,
  WorkspaceMemberStatus,
  InvitationStatus,
  TeamStatus,
  TeamMemberStatus,
} from '../../../../../db/schema/enums';
export type {
  TenantStatus,
  SubscriptionPlan,
  WorkspaceMemberStatus,
  InvitationStatus,
  TeamStatus,
  TeamMemberStatus,
};

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  plan: SubscriptionPlan;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Workspace {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface WorkspaceMember {
  id: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  roleId: string | null;
  status: WorkspaceMemberStatus;
  joinedAt: Date;
  updatedAt: Date;
  createdAt: Date;
}

/** Enriched member — includes user profile and current role for the User Management UI. */
export interface WorkspaceMemberWithProfile {
  id: string;
  workspaceId: string;
  userId: string;
  status: string;
  joinedAt: Date;
  createdAt: Date;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  roleAssignmentId: string | null;
  roleId: string | null;
  roleSlug: string | null;
  roleName: string | null;
}

export interface WorkspaceInvitation {
  id: string;
  tenantId: string;
  workspaceId: string;
  email: string;
  roleId: string | null;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: Date;
  acceptedBy: string | null;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceSettings {
  id: string;
  workspaceId: string;
  tenantId: string;
  timezone: string | null;
  defaultLocale: string | null;
  dateFormat: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkspaceInput {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description?: string;
  avatarUrl?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  avatarUrl?: string | null;
  settings?: Record<string, unknown>;
}

export interface AddMemberInput {
  id: string;
  tenantId: string;
  workspaceId: string;
  userId: string;
  roleId?: string;
}

export interface UpdateMemberInput {
  roleId?: string;
  status?: WorkspaceMemberStatus;
}

export interface CreateInvitationInput {
  id: string;
  tenantId: string;
  workspaceId: string;
  email: string;
  roleId?: string;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
}

export interface UpdateWorkspaceSettingsInput {
  timezone?: string;
  defaultLocale?: string;
  dateFormat?: string;
}
