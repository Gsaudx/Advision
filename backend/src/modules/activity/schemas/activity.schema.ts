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

/**
 * Advisor metrics schema
 */
export const advisorMetricsSchema = z.object({
  clientCount: z.number(),
  totalWalletValue: z.number(),
  pendingOperationsCount: z.number(),
  expiringOptionsCount: z.number(),
});

export type AdvisorMetrics = z.infer<typeof advisorMetricsSchema>;

/**
 * Advisor metrics response DTO for Swagger documentation
 */
export class AdvisorMetricsApiResponseDto extends createZodDto(
  createApiResponseSchema(advisorMetricsSchema),
) {}

/**
 * Client profile schema
 */
export const clientProfileSchema = z.object({
  clientId: z.string().uuid(),
  clientName: z.string(),
  advisorId: z.string().uuid(),
  advisorName: z.string(),
});

export type ClientProfile = z.infer<typeof clientProfileSchema>;

/**
 * Client profile response DTO for Swagger documentation
 */
export class ClientProfileApiResponseDto extends createZodDto(
  createApiResponseSchema(clientProfileSchema),
) {}

/**
 * Paginated activity response schema
 */
export const paginatedActivitySchema = z.object({
  items: z.array(activityItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export type PaginatedActivity = z.infer<typeof paginatedActivitySchema>;

/**
 * Paginated activity response DTO for Swagger documentation
 */
export class PaginatedActivityApiResponseDto extends createZodDto(
  createApiResponseSchema(paginatedActivitySchema),
) {}

/**
 * Advisor expiration item schema
 */
export const advisorExpirationSchema = z.object({
  positionId: z.string().uuid(),
  ticker: z.string(),
  optionType: z.enum(['CALL', 'PUT']),
  strikePrice: z.number(),
  expirationDate: z.string(),
  daysUntilExpiry: z.number(),
  quantity: z.number(),
  isShort: z.boolean(),
  walletName: z.string(),
  clientName: z.string(),
  moneyness: z.enum(['ITM', 'ATM', 'OTM']).optional(),
  status: z.enum(['Proximo', 'Em dia', 'Vencido']),
});

export type AdvisorExpiration = z.infer<typeof advisorExpirationSchema>;

/**
 * Advisor expirations list schema
 */
export const advisorExpirationsListSchema = z.object({
  expirations: z.array(advisorExpirationSchema),
  total: z.number(),
});

export type AdvisorExpirationsList = z.infer<
  typeof advisorExpirationsListSchema
>;

/**
 * Advisor expirations response DTO for Swagger documentation
 */
export class AdvisorExpirationsApiResponseDto extends createZodDto(
  createApiResponseSchema(advisorExpirationsListSchema),
) {}
