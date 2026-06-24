import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const WorkItemResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  projectId: z.string().uuid(),
  itemKey: z.string().describe('Sequential key e.g. PROJ-42'),
  type: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  statusId: z.string().uuid(),
  scheduleState: z.string(),
  priority: z.string(),
  assigneeId: z.string().uuid().nullable(),
  reporterId: z.string().uuid().nullable(),
  parentId: z.string().uuid().nullable(),
  teamId: z.string().uuid().nullable(),
  iterationId: z.string().uuid().nullable(),
  releaseId: z.string().uuid().nullable(),
  storyPoints: z.number().int().nullable(),
  estimateHours: z.number().nullable(),
  todoHours: z.number().nullable(),
  actualHours: z.number().nullable(),
  acceptanceCriteria: z.string().nullable(),
  notes: z.string().nullable(),
  releaseNotes: z.string().nullable(),
  isBlocked: z.boolean(),
  blockedReason: z.string().nullable(),
  rank: z.string(),
  customFields: z.record(z.string(), z.unknown()),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export class WorkItemResponseDto extends createZodDto(WorkItemResponseSchema) {}

export type WorkItemResponseDtoShape = z.infer<typeof WorkItemResponseSchema>;

// ── Task totals (Tasks-tab totals row) ──────────────────────────────────────

export const TaskTotalsResponseSchema = z.object({
  taskCount: z.number().int(),
  estimateHours: z.number(),
  todoHours: z.number(),
  actualHours: z.number(),
});

export class TaskTotalsResponseDto extends createZodDto(TaskTotalsResponseSchema) {}

// ── Activity (Revision History) ─────────────────────────────────────────────

export const ActivityResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  actorId: z.string().uuid().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  changes: z.object({ field: z.string(), old: z.unknown(), new: z.unknown() }).nullable(),
  metadata: z.record(z.string(), z.unknown()),
});

export class ActivityResponseDto extends createZodDto(ActivityResponseSchema) {}

export type ActivityResponseDtoShape = z.infer<typeof ActivityResponseSchema>;
