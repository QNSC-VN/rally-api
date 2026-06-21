import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export class LoginDto extends createZodDto(LoginSchema) {}

// ── Change password ────────────────────────────────────────────────────────────

const PASSWORD_RULES = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: PASSWORD_RULES,
});

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}

// ── Update profile ────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(255).trim().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  locale: z.string().min(2).max(10).optional(),
  timezone: z.string().min(1).max(100).optional(),
});

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {}
