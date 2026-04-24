import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createApiResponseSchema } from '@/common/schemas';

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const StrikeAdjustmentResponseSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  positionId: z.string().uuid(),
  ticker: z.string(),
  previousStrike: z.number(),
  newStrike: z.number(),
  adjustment: z.number(),
  detectedAt: z.string(),
  seenByAdvisor: z.boolean(),
});
export type StrikeAdjustmentResponse = z.infer<
  typeof StrikeAdjustmentResponseSchema
>;

export const StrikeAdjustmentListResponseSchema = z.array(
  StrikeAdjustmentResponseSchema,
);
export type StrikeAdjustmentListResponse = z.infer<
  typeof StrikeAdjustmentListResponseSchema
>;

// ============================================================================
// API RESPONSE DTOs
// ============================================================================

export class StrikeAdjustmentListApiResponseDto extends createZodDto(
  createApiResponseSchema(StrikeAdjustmentListResponseSchema),
) {}
