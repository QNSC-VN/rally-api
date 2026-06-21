// ── Tenant response ──────────────────────────────────────────────────────────

export interface TenantResponseDto {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Workspace response ───────────────────────────────────────────────────────

export interface WorkspaceResponseDto {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Member response ──────────────────────────────────────────────────────────

export interface MemberResponseDto {
  id: string;
  workspaceId: string;
  userId: string;
  roleId: string | null;
  status: string;
  joinedAt: string;
  createdAt: string;
}

// ── Invitation response ───────────────────────────────────────────────────────

export interface InvitationResponseDto {
  id: string;
  workspaceId: string;
  email: string;
  roleId: string | null;
  status: string;
  invitedBy: string;
  expiresAt: string;
  acceptedBy: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

// ── Workspace settings response ───────────────────────────────────────────────

export interface WorkspaceSettingsResponseDto {
  workspaceId: string;
  timezone: string | null;
  defaultLocale: string | null;
  dateFormat: string | null;
  updatedAt: string;
}
