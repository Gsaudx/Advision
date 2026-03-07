import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const LoginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export class LoginDto extends createZodDto(LoginSchema) {}

export type LoginInput = z.infer<typeof LoginSchema>;
