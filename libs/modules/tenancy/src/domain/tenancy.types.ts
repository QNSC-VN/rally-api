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
  createdAt: Date;
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
}
