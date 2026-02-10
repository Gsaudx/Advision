import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createApiResponseSchema } from '@/common/schemas';
import {
  OperationStatus,
  OptionType,
  ExerciseType,
} from '@/generated/prisma/enums';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

/**
 * Schema for buying an option (CALL or PUT)
 */
export const BuyOptionInputSchema = z.object({
  ticker: z
    .string()
    .min(1, 'Ticker obrigatorio')
    .max(20, 'Ticker deve ter no maximo 20 caracteres')
    .toUpperCase(),
  quantity: z
    .number()
    .positive('Quantidade de contratos deve ser positiva')
    .int('Quantidade deve ser um numero inteiro de contratos'),
  premium: z.number().positive('Premio deve ser positivo'),
  date: z
    .string()
    .datetime({ message: 'Data invalida (formato ISO esperado)' }),
  idempotencyKey: z.string().min(1, 'Chave de idempotencia obrigatoria'),
});
export class BuyOptionInputDto extends createZodDto(BuyOptionInputSchema) {}
export type BuyOptionInput = z.infer<typeof BuyOptionInputSchema>;

/**
 * Schema for selling/writing an option (CALL or PUT)
 */
export const SellOptionInputSchema = z.object({
  ticker: z
    .string()
    .min(1, 'Ticker obrigatorio')
    .max(20, 'Ticker deve ter no maximo 20 caracteres')
    .toUpperCase(),
  quantity: z
    .number()
    .positive('Quantidade de contratos deve ser positiva')
    .int('Quantidade deve ser um numero inteiro de contratos'),
  premium: z.number().positive('Premio deve ser positivo'),
  date: z
    .string()
    .datetime({ message: 'Data invalida (formato ISO esperado)' }),
  covered: z.boolean().default(false),
  idempotencyKey: z.string().min(1, 'Chave de idempotencia obrigatoria'),
});
export class SellOptionInputDto extends createZodDto(SellOptionInputSchema) {}
export type SellOptionInput = z.infer<typeof SellOptionInputSchema>;

/**
 * Schema for closing an option position
 */
export const CloseOptionInputSchema = z.object({
  quantity: z
    .number()
    .positive('Quantidade de contratos deve ser positiva')
    .int('Quantidade deve ser um numero inteiro de contratos')
    .optional(),
  premium: z.number().positive('Premio deve ser positivo'),
  date: z
    .string()
    .datetime({ message: 'Data invalida (formato ISO esperado)' }),
  idempotencyKey: z.string().min(1, 'Chave de idempotencia obrigatoria'),
});
export class CloseOptionInputDto extends createZodDto(CloseOptionInputSchema) {}
export type CloseOptionInput = z.infer<typeof CloseOptionInputSchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Option detail response schema
 */
export const OptionDetailResponseSchema = z.object({
  optionType: z.nativeEnum(OptionType),
  exerciseType: z.nativeEnum(ExerciseType),
  strikePrice: z.number(),
  expirationDate: z.string(),
  underlyingTicker: z.string(),
});
export type OptionDetailResponse = z.infer<typeof OptionDetailResponseSchema>;

/**
 * Option position response schema
 */
export const OptionPositionResponseSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  assetId: z.string().uuid(),
  ticker: z.string(),
  name: z.string(),
  quantity: z.number(),
  averagePrice: z.number(),
  totalCost: z.number(),
  currentPrice: z.number().optional(),
  currentValue: z.number().optional(),
  profitLoss: z.number().optional(),
  profitLossPercent: z.number().optional(),
  isShort: z.boolean(),
  collateralBlocked: z.number().optional(),
  optionDetail: OptionDetailResponseSchema,
});
export type OptionPositionResponse = z.infer<
  typeof OptionPositionResponseSchema
>;

/**
 * Option positions list response schema
 */
export const OptionPositionListResponseSchema = z.object({
  positions: z.array(OptionPositionResponseSchema),
  totalPremiumPaid: z.number(),
  totalPremiumReceived: z.number(),
  netPremium: z.number(),
});
export type OptionPositionListResponse = z.infer<
  typeof OptionPositionListResponseSchema
>;

/**
 * Option trade result response schema
 */
export const OptionTradeResultResponseSchema = z.object({
  positionId: z.string().uuid(),
  transactionId: z.string().uuid(),
  ticker: z.string(),
  quantity: z.number(),
  premium: z.number(),
  totalValue: z.number(),
  status: z.nativeEnum(OperationStatus),
});
export type OptionTradeResultResponse = z.infer<
  typeof OptionTradeResultResponseSchema
>;

// ============================================================================
// API RESPONSE DTOs
// ============================================================================

export class OptionPositionListApiResponseDto extends createZodDto(
  createApiResponseSchema(OptionPositionListResponseSchema),
) {}

export class OptionTradeResultApiResponseDto extends createZodDto(
  createApiResponseSchema(OptionTradeResultResponseSchema),
) {}
