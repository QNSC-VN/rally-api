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
  priority: z.string(),
  assigneeId: z.string().uuid().nullable(),
  reporterId: z.string().uuid().nullable(),
  parentId: z.string().uuid().nullable(),
  iterationId: z.string().uuid().nullable(),
  releaseId: z.string().uuid().nullable(),
  storyPoints: z.number().int().nullable(),
  acceptanceCriteria: z.string().nullable(),
  isBlocked: z.boolean(),
  blockedReason: z.string().nullable(),
  rank: z.string(),
  customFields: z.record(z.string(), z.unknown()),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export class WorkItemResponseDto extends createZodDto(WorkItemResponseSchema) {}

export type WorkItemResponseDtoShape = z.infer<typeof WorkItemResponseSchema>;
