import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Base schema for successful API responses.
 * Use createApiResponseSchema(dataSchema) for typed responses.
 */
export const ApiResponseSchema = z.object({
  success: z.boolean().describe('Indica se a requisicao foi bem-sucedida'),
  data: z.unknown().optional().describe('Dados retornados pela requisicao'),
  message: z.string().optional().describe('Mensagem descritiva (opcional)'),
});

/**
 * Factory function to create typed API response schemas
 */
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema.optional(),
    message: z.string().optional(),
  });
}

/**
 * DTO class for Swagger documentation
 */
export class ApiResponseDto extends createZodDto(ApiResponseSchema) {
  /**
   * Factory method for success responses
   */
  static success<T>(
    data: T,
    message?: string,
  ): { success: true; data: T; message?: string } {
    return { success: true, data, message };
  }
}

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};
