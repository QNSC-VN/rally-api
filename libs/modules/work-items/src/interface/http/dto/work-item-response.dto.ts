export interface WorkItemResponseDto {
  id: string;
  tenantId: string;
  projectId: string;
  itemKey: string;
  type: string;
  title: string;
  description: string | null;
  statusId: string;
  priority: string;
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
  createdAt: string;
  updatedAt: string;
}
