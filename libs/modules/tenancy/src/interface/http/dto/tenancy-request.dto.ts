import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ── Create Workspace ─────────────────────────────────────────────────────────

export const CreateWorkspaceSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1).max(255).trim(),
  description: z.string().max(1000).trim().optional(),
  avatarUrl: z.url().optional(),
});

export class CreateWorkspaceDto extends createZodDto(CreateWorkspaceSchema) {}

// ── Update Workspace ─────────────────────────────────────────────────────────

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(1000).trim().optional(),
  avatarUrl: z.url().optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export class UpdateWorkspaceDto extends createZodDto(UpdateWorkspaceSchema) {}

// ── Add Member ───────────────────────────────────────────────────────────────

export const AddMemberSchema = z.object({
  userId: z.string().uuid(),
});

export class AddMemberDto extends createZodDto(AddMemberSchema) {}
