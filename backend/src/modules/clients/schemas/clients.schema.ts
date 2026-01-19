import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createApiResponseSchema } from '@/common/schemas';
import { InviteStatus } from '../enums';

/**
 * Schema for creating a new client.
 * The advisorId is extracted from the JWT token, not from the request body.
 */
export const CreateClientInputSchema = z.object({
  name: z
    .string()
    .min(2, 'Apelido deve ter pelo menos 2 caracteres')
    .max(100, 'Apelido deve ter no maximo 100 caracteres'),
  clientCode: z
    .string()
    .regex(/^\d+$/, 'Codigo do cliente deve conter apenas numeros'),
});
export class CreateClientInputDto extends createZodDto(
  CreateClientInputSchema,
) {}

/**
 * Schema for updating a client.
 * All fields are optional.
 */
export const UpdateClientInputSchema = z.object({
  name: z
    .string()
    .min(2, 'Apelido deve ter pelo menos 2 caracteres')
    .max(100, 'Apelido deve ter no maximo 100 caracteres')
    .optional(),
  clientCode: z
    .string()
    .regex(/^\d+$/, 'Codigo do cliente deve conter apenas numeros'),
});
export class UpdateClientInputDto extends createZodDto(
  UpdateClientInputSchema,
) {}

/**
 * Client response schema - what we return from API
 */
export const ClientResponseSchema = z.object({
  id: z.string().uuid(),
  advisorId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  name: z.string(),
  clientCode: z.string(),
  inviteStatus: z.nativeEnum(InviteStatus),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ClientResponse = z.infer<typeof ClientResponseSchema>;

/**
 * Client list response schema
 */
export const ClientListResponseSchema = z.array(ClientResponseSchema);
export type ClientListResponse = z.infer<typeof ClientListResponseSchema>;

/**
 * API response DTOs for Swagger documentation
 */
export class ClientApiResponseDto extends createZodDto(
  createApiResponseSchema(ClientResponseSchema),
) {}

export class ClientListApiResponseDto extends createZodDto(
  createApiResponseSchema(ClientListResponseSchema),
) {}
