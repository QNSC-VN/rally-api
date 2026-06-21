import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PageQuerySchema } from '@platform';

const WORK_ITEM_TYPES = ['initiative', 'feature', 'story', 'task', 'defect'] as const;
const WORK_ITEM_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

// ── List query ────────────────────────────────────────────────────────────────

export const WorkItemQuerySchema = PageQuerySchema.extend({
  projectId: z.string().uuid(),
  type: z.enum(WORK_ITEM_TYPES).optional(),
  statusId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  iterationId: z.string().uuid().optional(),
  releaseId: z.string().uuid().optional(),
});

export class WorkItemQueryDto extends createZodDto(WorkItemQuerySchema) {}

// ── Create ────────────────────────────────────────────────────────────────────

export const CreateWorkItemSchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(WORK_ITEM_TYPES),
  title: z.string().min(1).max(500).trim(),
  description: z.string().max(10000).optional(),
  statusId: z.string().uuid().optional(),
  priority: z.enum(WORK_ITEM_PRIORITIES).default('medium'),
  assigneeId: z.string().uuid().optional(),
  reporterId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  storyPoints: z.coerce.number().int().min(0).max(999).optional(),
  acceptanceCriteria: z.string().max(10000).optional(),
});

export class CreateWorkItemDto extends createZodDto(CreateWorkItemSchema) {}

// ── Update ────────────────────────────────────────────────────────────────────

export const UpdateWorkItemSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  description: z.string().max(10000).nullable().optional(),
  statusId: z.string().uuid().optional(),
  priority: z.enum(WORK_ITEM_PRIORITIES).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  reporterId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  iterationId: z.string().uuid().nullable().optional(),
  releaseId: z.string().uuid().nullable().optional(),
  storyPoints: z.coerce.number().int().min(0).max(999).nullable().optional(),
  acceptanceCriteria: z.string().max(10000).nullable().optional(),
  isBlocked: z.boolean().optional(),
  blockedReason: z.string().max(1000).nullable().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export class UpdateWorkItemDto extends createZodDto(UpdateWorkItemSchema) {}

// ── Move (status transition) ──────────────────────────────────────────────────

export const MoveWorkItemSchema = z.object({
  toStatusId: z.string().uuid(),
});

export class MoveWorkItemDto extends createZodDto(MoveWorkItemSchema) {}

// ── Reorder (backlog rank) ────────────────────────────────────────────────────

export const ReorderWorkItemsSchema = z.object({
  items: z
    .array(z.object({ id: z.string().uuid(), rank: z.string().min(1).max(255) }))
    .min(1)
    .max(500),
});

export class ReorderWorkItemsDto extends createZodDto(ReorderWorkItemsSchema) {}

// ── Add label ─────────────────────────────────────────────────────────────────

export const AddLabelSchema = z.object({
  labelId: z.string().uuid(),
});

export class AddLabelDto extends createZodDto(AddLabelSchema) {}
