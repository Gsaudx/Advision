import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createApiResponseSchema } from '@/common/schemas';

export interface BrapiDividendDto {
  ticker: string;
  dividendType: string | null;
  approvedDate: string | null;
  paymentDate: string | null;
  exDividendDate: string | null;
  valuePerShare: number | null;
  rawPayload: unknown;
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const DividendEventResponseSchema = z.object({
  id: z.string().uuid(),
  ticker: z.string(),
  dividendType: z.string().nullable(),
  approvedDate: z.string().nullable(),
  paymentDate: z.string().nullable(),
  exDividendDate: z.string().nullable(),
  valuePerShare: z.number().nullable(),
  source: z.string(),
  referenceWeek: z.string(),
  importedAt: z.string(),
});

export type DividendEventResponse = z.infer<typeof DividendEventResponseSchema>;

export const DividendEventListResponseSchema = z.object({
  items: z.array(DividendEventResponseSchema),
  total: z.number(),
  skip: z.number(),
  take: z.number(),
});

export type DividendEventListResponse = z.infer<
  typeof DividendEventListResponseSchema
>;

export class DividendEventListApiResponseDto extends createZodDto(
  createApiResponseSchema(DividendEventListResponseSchema),
) {}
