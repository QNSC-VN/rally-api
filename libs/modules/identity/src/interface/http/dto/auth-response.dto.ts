import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  locale: z.string(),
  timezone: z.string(),
});

export const AuthTokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().describe('Seconds until access token expires'),
  user: UserProfileSchema,
});

export class AuthTokenResponseDto extends createZodDto(AuthTokenResponseSchema) {}

export const UserProfileResponseSchema = UserProfileSchema.extend({
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export class UserProfileResponseDto extends createZodDto(UserProfileResponseSchema) {}
