import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createApiResponseSchema } from '@/common/schemas';
import { InviteStatus } from '../enums';

export const InviteResponseSchema = z.object({
  clientId: z.string().uuid(),
  clientName: z.string(),
  inviteToken: z.string(),
  inviteStatus: z.nativeEnum(InviteStatus),
  inviteExpiresAt: z.string(),
});

export const AcceptInviteInputSchema = z.object({
  token: z
    .string()
    .min(1, 'Token e obrigatorio')
    .regex(/^INV-[A-Z0-9]{8}$/, 'Formato de token invalido'),
});

export const AcceptInviteResponseSchema = z.object({
  clientId: z.string().uuid(),
  clientName: z.string(),
  advisorName: z.string(),
  message: z.string(),
});

export const InviteApiResponseSchema =
  createApiResponseSchema(InviteResponseSchema);
export const AcceptInviteApiResponseSchema = createApiResponseSchema(
  AcceptInviteResponseSchema,
);

export class AcceptInviteDto extends createZodDto(AcceptInviteInputSchema) {}
export class InviteApiResponseDto extends createZodDto(
  InviteApiResponseSchema,
) {}
export class AcceptInviteApiResponseDto extends createZodDto(
  AcceptInviteApiResponseSchema,
) {}

export type InviteResponse = z.infer<typeof InviteResponseSchema>;
export type AcceptInviteInput = z.infer<typeof AcceptInviteInputSchema>;
export type AcceptInviteResponse = z.infer<typeof AcceptInviteResponseSchema>;
