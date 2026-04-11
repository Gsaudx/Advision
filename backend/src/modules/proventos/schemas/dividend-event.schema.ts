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

// ============================================================================
// WALLET PROVENTOS RESPONSE SCHEMAS
// ============================================================================

export const DividendEventResultSchema = z.object({
  ticker: z.string(),
  dividendType: z.string().nullable(),
  exDividendDate: z.string(),
  paymentDate: z.string().nullable(),
  valuePerShare: z.number(),
  quantityAtDate: z.number(),
  totalReceived: z.number(),
});

export const WalletProventosResponseSchema = z.object({
  walletId: z.string().uuid(),
  items: z.array(DividendEventResultSchema),
  totalReceived: z.number(),
});

export type WalletProventosResponse = z.infer<typeof WalletProventosResponseSchema>;

export class WalletProventosApiResponseDto extends createZodDto(
  createApiResponseSchema(WalletProventosResponseSchema),
) {}

export const ProventosSummaryItemSchema = z.object({
  ticker: z.string(),
  totalReceived: z.number(),
  eventsCount: z.number(),
  lastDividendDate: z.string().nullable(),
});

export const ProventosSummaryResponseSchema = z.array(ProventosSummaryItemSchema);

export type ProventosSummaryResponse = z.infer<typeof ProventosSummaryResponseSchema>;

export class ProventosSummaryApiResponseDto extends createZodDto(
  createApiResponseSchema(ProventosSummaryResponseSchema),
) {}
