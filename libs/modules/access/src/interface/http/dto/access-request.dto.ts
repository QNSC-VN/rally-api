import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AssignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  scopeType: z.enum(['global', 'workspace', 'project']),
  scopeId: z.string().uuid().optional(),
});
export class AssignRoleDto extends createZodDto(AssignRoleSchema) {}
