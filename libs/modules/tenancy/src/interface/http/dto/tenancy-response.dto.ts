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
  createdAt: string;
}
