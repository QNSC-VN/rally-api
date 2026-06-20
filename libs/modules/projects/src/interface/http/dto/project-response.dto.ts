// ── Project response ──────────────────────────────────────────────────────────

export interface ProjectResponseDto {
  id: string;
  tenantId: string;
  workspaceId: string;
  key: string;
  name: string;
  description: string | null;
  leadId: string | null;
  status: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Workflow status response ──────────────────────────────────────────────────

export interface WorkflowStatusResponseDto {
  id: string;
  projectId: string;
  name: string;
  category: string;
  color: string | null;
  position: number;
  isDefault: boolean;
}

// ── Workflow transition response ──────────────────────────────────────────────

export interface WorkflowTransitionResponseDto {
  id: string;
  projectId: string;
  fromStatusId: string | null;
  toStatusId: string;
  name: string | null;
  requiredRole: string | null;
}
