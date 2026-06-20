export type WorkItemType = 'initiative' | 'feature' | 'story' | 'task' | 'defect';
export type WorkItemPriority = 'critical' | 'high' | 'medium' | 'low';

export interface WorkItem {
  id: string;
  tenantId: string;
  projectId: string;
  itemKey: string;
  type: WorkItemType;
  title: string;
  description: string | null;
  statusId: string;
  priority: WorkItemPriority;
  assigneeId: string | null;
  reporterId: string | null;
  parentId: string | null;
  iterationId: string | null;
  releaseId: string | null;
  storyPoints: number | null;
  acceptanceCriteria: string | null;
  isBlocked: boolean;
  blockedReason: string | null;
  rank: string;
  customFields: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface WorkItemFilters {
  type?: WorkItemType;
  statusId?: string;
  assigneeId?: string;
  iterationId?: string;
  releaseId?: string;
}

export interface CreateWorkItemInput {
  id: string;
  tenantId: string;
  projectId: string;
  itemKey: string;
  type: WorkItemType;
  title: string;
  description?: string;
  statusId: string;
  priority: WorkItemPriority;
  assigneeId?: string;
  reporterId?: string;
  parentId?: string;
  storyPoints?: number;
  acceptanceCriteria?: string;
  rank: string;
  createdBy: string;
}

export interface UpdateWorkItemInput {
  title?: string;
  description?: string | null;
  statusId?: string;
  priority?: WorkItemPriority;
  assigneeId?: string | null;
  reporterId?: string | null;
  parentId?: string | null;
  iterationId?: string | null;
  releaseId?: string | null;
  storyPoints?: number | null;
  acceptanceCriteria?: string | null;
  isBlocked?: boolean;
  blockedReason?: string | null;
  rank?: string;
  customFields?: Record<string, unknown>;
}
