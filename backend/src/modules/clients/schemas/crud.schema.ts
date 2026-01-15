import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Schema for validating input data when creating a new client.
 *
 * Fields:
 * - `name`: Must be a non-empty string. Returns an error message if empty.
 * - `idAdvisor`: Must be a valid UUID string. Returns an error message if invalid.
 * - `email`: Must be a valid email address. Returns an error message if invalid.
 * - `phone`: Must be a string with at least 10 characters. Returns an error message if invalid.
 * - `cpf`: Must be a string with at least 11 characters. Returns an error message if invalid.
 *
 * This schema ensures that all required client information is present and correctly formatted before processing.
 */
export const CreateClientInputSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  idAdvisor: z.string().uuid('ID do assessor invalido'),
  email: z.string().email('Email invalido'),
  phone: z.string().min(10, 'Telefone invalido'),
  cpf: z.string().min(11, 'CPF invalido'),
});
export class CreateClientInputDto extends createZodDto(
  CreateClientInputSchema,
) {}
