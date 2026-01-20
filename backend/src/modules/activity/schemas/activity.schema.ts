import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createApiResponseSchema } from '@/common/schemas';

/**
 * Activity item schema
 */
export const activityItemSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  description: z.string(),
  clientName: z.string().nullable(),
  walletName: z.string().nullable(),
  occurredAt: z.string().datetime(),
  aggregateType: z.string(),
  eventType: z.string(),
});

export type ActivityItem = z.infer<typeof activityItemSchema>;

/**
 * Activity list schema
 */
export const activityListSchema = z.array(activityItemSchema);

export type ActivityList = z.infer<typeof activityListSchema>;

/**
 * Activity response DTO for Swagger documentation
 */
export class ActivityListApiResponseDto extends createZodDto(
  createApiResponseSchema(activityListSchema),
) {}
