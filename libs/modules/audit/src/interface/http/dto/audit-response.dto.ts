export interface AuditLogResponseDto {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  projectId: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
}
