import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SprintResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  goal: z.string().nullable(),
  status: z.enum(['planned', 'active', 'completed']),
  startDate: z.string().nullable().describe('YYYY-MM-DD'),
  endDate: z.string().nullable().describe('YYYY-MM-DD'),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export class SprintResponseDto extends createZodDto(SprintResponseSchema) {}
