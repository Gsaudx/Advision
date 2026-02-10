import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createApiResponseSchema } from '@/common/schemas';
import {
  StrategyType,
  OperationStatus,
  OperationLegType,
} from '@/generated/prisma/enums';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

/**
 * Schema for a single operation leg input
 */
export const OperationLegInputSchema = z.object({
  legType: z.nativeEnum(OperationLegType),
  ticker: z
    .string()
    .min(1, 'Ticker obrigatorio')
    .max(20, 'Ticker deve ter no maximo 20 caracteres')
    .toUpperCase(),
  quantity: z
    .number()
    .positive('Quantidade deve ser positiva')
    .int('Quantidade deve ser um numero inteiro'),
  price: z.number().positive('Preco/premio deve ser positivo'),
});
export type OperationLegInput = z.infer<typeof OperationLegInputSchema>;

/**
 * Schema for executing a structured strategy
 */
export const ExecuteStrategyInputSchema = z.object({
  strategyType: z.nativeEnum(StrategyType),
  underlyingTicker: z.string().optional(),
  legs: z
    .array(OperationLegInputSchema)
    .min(1, 'Pelo menos uma perna obrigatoria')
    .max(4, 'Maximo de 4 pernas permitido'),
  executedAt: z
    .string()
    .datetime({ message: 'Data invalida (formato ISO esperado)' }),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().min(1, 'Chave de idempotencia obrigatoria'),
});
export class ExecuteStrategyInputDto extends createZodDto(
  ExecuteStrategyInputSchema,
) {}
export type ExecuteStrategyInput = z.infer<typeof ExecuteStrategyInputSchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Operation leg response schema
 */
export const OperationLegResponseSchema = z.object({
  id: z.string().uuid(),
  legOrder: z.number(),
  legType: z.nativeEnum(OperationLegType),
  ticker: z.string(),
  assetId: z.string().uuid(),
  quantity: z.number(),
  price: z.number(),
  totalValue: z.number(),
  status: z.nativeEnum(OperationStatus),
  transactionId: z.string().uuid().nullable(),
  executedAt: z.string().nullable(),
});
export type OperationLegResponse = z.infer<typeof OperationLegResponseSchema>;

/**
 * Structured operation response schema
 */
export const StructuredOperationResponseSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  strategyType: z.nativeEnum(StrategyType),
  status: z.nativeEnum(OperationStatus),
  totalPremium: z.number(),
  netDebitCredit: z.number(),
  executedAt: z.string().nullable(),
  expirationDate: z.string().nullable(),
  notes: z.string().nullable(),
  legs: z.array(OperationLegResponseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StructuredOperationResponse = z.infer<
  typeof StructuredOperationResponseSchema
>;

/**
 * Structured operation list response schema
 */
export const StructuredOperationListResponseSchema = z.object({
  items: z.array(StructuredOperationResponseSchema),
  nextCursor: z.string().uuid().nullable(),
});
export type StructuredOperationListResponse = z.infer<
  typeof StructuredOperationListResponseSchema
>;

/**
 * Strategy risk profile schema
 */
export const StrategyRiskProfileSchema = z.object({
  maxLoss: z.number().nullable(),
  maxGain: z.number().nullable(),
  breakEvenPoints: z.array(z.number()),
  netPremium: z.number(),
  marginRequired: z.number(),
  isDebitStrategy: z.boolean(),
});
export type StrategyRiskProfile = z.infer<typeof StrategyRiskProfileSchema>;

/**
 * Strategy preview response schema
 */
export const StrategyPreviewResponseSchema = z.object({
  strategyType: z.nativeEnum(StrategyType),
  legs: z.array(OperationLegInputSchema),
  riskProfile: StrategyRiskProfileSchema,
  totalCost: z.number(),
  isValid: z.boolean(),
  validationErrors: z.array(z.string()),
});
export type StrategyPreviewResponse = z.infer<
  typeof StrategyPreviewResponseSchema
>;

// ============================================================================
// API RESPONSE DTOs
// ============================================================================

export class StructuredOperationApiResponseDto extends createZodDto(
  createApiResponseSchema(StructuredOperationResponseSchema),
) {}

export class StructuredOperationListApiResponseDto extends createZodDto(
  createApiResponseSchema(StructuredOperationListResponseSchema),
) {}

export class StrategyPreviewApiResponseDto extends createZodDto(
  createApiResponseSchema(StrategyPreviewResponseSchema),
) {}
