import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { AUTH_CONSTANTS } from '@/config/constants';

const cpfCnpjSchema = z
  .string()
  .optional()
  .refine(
    (value) => {
      if (!value) return true;
      const digits = value.replace(/\D/g, '');
      return digits.length === 11 || digits.length === 14;
    },
    { message: 'CPF deve ter 11 digitos ou CNPJ deve ter 14 digitos' },
  )
  .transform((value) => (value ? value.replace(/\D/g, '') : undefined));

const phoneSchema = z
  .string()
  .optional()
  .refine(
    (value) => {
      if (!value) return true;
      return /^\+\d{10,15}$/.test(value);
    },
    { message: 'Telefone deve estar no formato internacional (+DDI + numero)' },
  );

export const RegisterSchema = z.object({
  name: z
    .string()
    .min(
      AUTH_CONSTANTS.NAME_MIN_LENGTH,
      `Nome deve ter pelo menos ${AUTH_CONSTANTS.NAME_MIN_LENGTH} caracteres`,
    )
    .max(
      AUTH_CONSTANTS.NAME_MAX_LENGTH,
      `Nome deve ter no maximo ${AUTH_CONSTANTS.NAME_MAX_LENGTH} caracteres`,
    ),
  email: z.email('Email invalido'),
  password: z
    .string()
    .min(
      AUTH_CONSTANTS.PASSWORD_MIN_LENGTH,
      `Senha deve ter pelo menos ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} caracteres`,
    )
    .max(
      AUTH_CONSTANTS.PASSWORD_MAX_LENGTH,
      `Senha deve ter no maximo ${AUTH_CONSTANTS.PASSWORD_MAX_LENGTH} caracteres`,
    ),
  role: z.enum(['ADVISOR', 'CLIENT']).default('ADVISOR'),
  cpfCnpj: cpfCnpjSchema,
  phone: phoneSchema,
});

export class RegisterDto extends createZodDto(RegisterSchema) {}

export type RegisterInput = z.infer<typeof RegisterSchema>;
