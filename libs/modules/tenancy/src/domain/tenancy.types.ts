export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
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
  status: string; // active | suspended | removed
  joinedAt: Date;
  updatedAt: Date;
  createdAt: Date;
}

export interface WorkspaceInvitation {
  id: string;
  tenantId: string;
  workspaceId: string;
  email: string;
  roleId: string | null;
  status: string; // pending | accepted | cancelled | expired
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
  status?: string;
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
