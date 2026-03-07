import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createApiResponseSchema } from '@/common/schemas';
import { OptionLifecycleEvent, OptionType } from '@/generated/prisma/enums';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

/**
 * Schema for exercising an option
 */
export const ExerciseOptionInputSchema = z.object({
  quantity: z
    .number()
    .positive('Quantidade de contratos deve ser positiva')
    .int('Quantidade deve ser um número inteiro de contratos')
    .optional(),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().min(1, 'Chave de idempotência obrigatória'),
});
export class ExerciseOptionInputDto extends createZodDto(
  ExerciseOptionInputSchema,
) {}
export type ExerciseOptionInput = z.infer<typeof ExerciseOptionInputSchema>;

/**
 * Schema for handling an option assignment
 */
export const AssignmentInputSchema = z.object({
  quantity: z
    .number()
    .positive('Quantidade de contratos deve ser positiva')
    .int('Quantidade deve ser um número inteiro de contratos'),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().min(1, 'Chave de idempotência obrigatória'),
});
export class AssignmentInputDto extends createZodDto(AssignmentInputSchema) {}
export type AssignmentInput = z.infer<typeof AssignmentInputSchema>;

/**
 * Schema for processing option expiration
 */
export const ExpireOptionInputSchema = z.object({
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().min(1, 'Chave de idempotência obrigatória'),
});
export class ExpireOptionInputDto extends createZodDto(
  ExpireOptionInputSchema,
) {}
export type ExpireOptionInput = z.infer<typeof ExpireOptionInputSchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Option lifecycle event response schema
 */
export const OptionLifecycleResponseSchema = z.object({
  id: z.string().uuid(),
  positionId: z.string().uuid(),
  event: z.nativeEnum(OptionLifecycleEvent),
  underlyingQuantity: z.number().nullable(),
  strikePrice: z.number().nullable(),
  settlementAmount: z.number().nullable(),
  resultingTransactionId: z.string().uuid().nullable(),
  occurredAt: z.string(),
  notes: z.string().nullable(),
});
export type OptionLifecycleResponse = z.infer<
  typeof OptionLifecycleResponseSchema
>;

/**
 * Exercise result response schema
 */
export const ExerciseResultResponseSchema = z.object({
  lifecycleId: z.string().uuid(),
  event: z.nativeEnum(OptionLifecycleEvent),
  optionPositionId: z.string().uuid(),
  underlyingPositionId: z.string().uuid().nullable(),
  underlyingTicker: z.string(),
  underlyingQuantity: z.number(),
  strikePrice: z.number(),
  totalCost: z.number(),
  cashBalanceAfter: z.number(),
});
export type ExerciseResultResponse = z.infer<
  typeof ExerciseResultResponseSchema
>;

/**
 * Assignment result response schema
 */
export const AssignmentResultResponseSchema = z.object({
  lifecycleId: z.string().uuid(),
  event: z.nativeEnum(OptionLifecycleEvent),
  optionPositionId: z.string().uuid(),
  underlyingPositionId: z.string().uuid().nullable(),
  underlyingTicker: z.string(),
  underlyingQuantity: z.number(),
  strikePrice: z.number(),
  settlementAmount: z.number(),
  cashBalanceAfter: z.number(),
  collateralReleased: z.number(),
});
export type AssignmentResultResponse = z.infer<
  typeof AssignmentResultResponseSchema
>;

/**
 * Expiration result response schema
 */
export const ExpirationResultResponseSchema = z.object({
  lifecycleId: z.string().uuid(),
  event: z.nativeEnum(OptionLifecycleEvent),
  positionId: z.string().uuid(),
  ticker: z.string(),
  wasInTheMoney: z.boolean(),
  collateralReleased: z.number(),
});
export type ExpirationResultResponse = z.infer<
  typeof ExpirationResultResponseSchema
>;

/**
 * Upcoming expiration item schema
 */
export const UpcomingExpirationSchema = z.object({
  positionId: z.string().uuid(),
  ticker: z.string(),
  optionType: z.nativeEnum(OptionType),
  strikePrice: z.number(),
  expirationDate: z.string(),
  daysUntilExpiry: z.number(),
  quantity: z.number(),
  isShort: z.boolean(),
  underlyingTicker: z.string(),
  currentUnderlyingPrice: z.number().optional(),
  moneyness: z.enum(['ITM', 'ATM', 'OTM']).optional(), // UI-only enum, not in DB
});
export type UpcomingExpiration = z.infer<typeof UpcomingExpirationSchema>;

/**
 * Upcoming expirations list response schema
 */
export const UpcomingExpirationsResponseSchema = z.object({
  expirations: z.array(UpcomingExpirationSchema),
  totalPositionsExpiring: z.number(),
});
export type UpcomingExpirationsResponse = z.infer<
  typeof UpcomingExpirationsResponseSchema
>;

// ============================================================================
// API RESPONSE DTOs
// ============================================================================

export class ExerciseResultApiResponseDto extends createZodDto(
  createApiResponseSchema(ExerciseResultResponseSchema),
) {}

export class AssignmentResultApiResponseDto extends createZodDto(
  createApiResponseSchema(AssignmentResultResponseSchema),
) {}

export class ExpirationResultApiResponseDto extends createZodDto(
  createApiResponseSchema(ExpirationResultResponseSchema),
) {}

export class UpcomingExpirationsApiResponseDto extends createZodDto(
  createApiResponseSchema(UpcomingExpirationsResponseSchema),
) {}
