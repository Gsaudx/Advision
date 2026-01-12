import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const LoginSchema = z.object({
  email: z.email('Email invalido'),
  password: z.string().min(1, 'Senha e obrigatoria'),
});

export class LoginDto extends createZodDto(LoginSchema) {}

export type LoginInput = z.infer<typeof LoginSchema>;
