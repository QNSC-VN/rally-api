export interface Project {
  id: string;
  tenantId: string;
  workspaceId: string;
  key: string;
  name: string;
  description: string | null;
  leadId: string | null;
  status: string;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface WorkflowStatus {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  category: 'to_do' | 'in_progress' | 'done';
  color: string | null;
  position: number;
  isDefault: boolean;
  createdAt: Date;
}

export interface WorkflowTransition {
  id: string;
  tenantId: string;
  projectId: string;
  fromStatusId: string | null;
  toStatusId: string;
  name: string | null;
  requiredRole: string | null;
  createdAt: Date;
}

export interface CreateProjectInput {
  id: string;
  tenantId: string;
  workspaceId: string;
  key: string;
  name: string;
  description?: string;
  leadId?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  leadId?: string | null;
  status?: string;
  settings?: Record<string, unknown>;
}

export interface CreateWorkflowStatusInput {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  category: 'to_do' | 'in_progress' | 'done';
  color?: string;
  position: number;
  isDefault?: boolean;
}

export interface CreateWorkflowTransitionInput {
  id: string;
  tenantId: string;
  projectId: string;
  fromStatusId?: string | null;
  toStatusId: string;
  name?: string;
}
