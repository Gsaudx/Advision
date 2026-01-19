import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createApiResponseSchema } from '@/common/schemas';
import { InviteStatus } from '../enums';

const phoneSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z
    .string()
    .regex(
      /^\+\d{10,15}$/,
      'Telefone deve estar no formato internacional (+DDI + numero)',
    )
    .optional(),
);

const nullablePhoneSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z
    .union([
      z
        .string()
        .regex(
          /^\+\d{10,15}$/,
          'Telefone deve estar no formato internacional (+DDI + numero)',
        ),
      z.null(),
    ])
    .optional(),
);

/**
 * Schema for creating a new client.
 * The advisorId is extracted from the JWT token, not from the request body.
 */
export const CreateClientInputSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no maximo 100 caracteres'),
  email: z.string().email('Email invalido').optional().or(z.literal('')),
  phone: phoneSchema,
  cpf: z
    .string()
    .length(11, 'CPF deve ter 11 digitos')
    .regex(/^\d+$/, 'CPF deve conter apenas numeros'),
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
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no maximo 100 caracteres')
    .optional(),
  email: z.string().email('Email invalido').optional().nullable(),
  phone: nullablePhoneSchema,
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
  email: z.string().nullable(),
  cpf: z.string(),
  phone: z.string().nullable(),
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
