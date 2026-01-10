import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false).describe('Indica que houve erro'),
  statusCode: z.number().int().describe('Codigo HTTP do erro'),
  message: z.string().describe('Mensagem de erro'),
  errors: z
    .array(z.string())
    .optional()
    .describe('Detalhes do erro (validacao, etc.)'),
  timestamp: z.string().describe('Timestamp do erro'),
  path: z.string().optional().describe('Caminho da requisicao'),
});

export class ApiErrorResponseDto extends createZodDto(ApiErrorResponseSchema) {}

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
