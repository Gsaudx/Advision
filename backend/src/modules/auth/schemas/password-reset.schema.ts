import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { AUTH_CONSTANTS } from '@/config/constants';

export const ForgotPasswordSchema = z.object({
  email: z.email('Email inválido'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  password: z
    .string()
    .min(
      AUTH_CONSTANTS.PASSWORD_MIN_LENGTH,
      `Senha deve ter pelo menos ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} caracteres`,
    )
    .max(
      AUTH_CONSTANTS.PASSWORD_MAX_LENGTH,
      `Senha deve ter no máximo ${AUTH_CONSTANTS.PASSWORD_MAX_LENGTH} caracteres`,
    ),
});

export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
