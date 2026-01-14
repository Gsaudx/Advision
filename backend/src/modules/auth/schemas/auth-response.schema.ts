import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createApiResponseSchema } from '@/common/schemas';

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['ADVISOR', 'CLIENT', 'ADMIN']),
  cpfCnpj: z.string().nullable(),
  phone: z.string().nullable(),
  clientProfileId: z.string().uuid().nullable(),
  createdAt: z.string(),
});

export const AuthTokenSchema = z.object({
  accessToken: z.string(),
  user: UserProfileSchema,
});

export const AuthTokenApiResponseSchema =
  createApiResponseSchema(AuthTokenSchema);

export const UserProfileApiResponseSchema =
  createApiResponseSchema(UserProfileSchema);

export class AuthTokenApiResponseDto extends createZodDto(
  AuthTokenApiResponseSchema,
) {}
export class UserProfileApiResponseDto extends createZodDto(
  UserProfileApiResponseSchema,
) {}

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type AuthToken = z.infer<typeof AuthTokenSchema>;
