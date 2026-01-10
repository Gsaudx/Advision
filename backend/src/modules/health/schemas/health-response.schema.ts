import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { HealthStatus, DatabaseStatus } from '../enums';

export const HealthResponseSchema = z.object({
  status: z.nativeEnum(HealthStatus).describe('Status geral da aplicacao'),
  database: z
    .nativeEnum(DatabaseStatus)
    .describe('Status da conexao com o banco de dados'),
  timestamp: z
    .string()
    .optional()
    .describe('Data/hora da verificacao (ISO 8601)'),
  environment: z.string().optional().describe('Ambiente de execucao'),
  error: z
    .string()
    .optional()
    .describe('Mensagem de erro (apenas quando status = error)'),
});

export class HealthResponseDto extends createZodDto(HealthResponseSchema) {}

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
