import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no maximo 100 caracteres'),
  email: z.email('Email invalido'),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(100, 'Senha deve ter no maximo 100 caracteres'),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}

export type RegisterInput = z.infer<typeof RegisterSchema>;
