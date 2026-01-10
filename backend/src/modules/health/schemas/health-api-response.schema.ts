import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { HealthResponseSchema } from './health-response.schema';

export const HealthApiResponseSchema = z.object({
  success: z.literal(true).describe('Indica se a requisicao foi bem-sucedida'),
  data: HealthResponseSchema.describe('Dados de saude da aplicacao'),
  message: z.string().optional().describe('Mensagem descritiva (opcional)'),
});

export class HealthApiResponseDto extends createZodDto(
  HealthApiResponseSchema,
) {}

export type HealthApiResponse = z.infer<typeof HealthApiResponseSchema>;
