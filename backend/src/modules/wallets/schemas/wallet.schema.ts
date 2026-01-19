import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createApiResponseSchema } from '@/common/schemas';

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

/**
 * Schema for creating a new wallet
 */
export const CreateWalletInputSchema = z.object({
  clientId: z.string().uuid('ID do cliente invalido'),
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no maximo 100 caracteres'),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).optional().default('BRL'),
  initialCashBalance: z
    .number()
    .nonnegative('Saldo inicial deve ser positivo ou zero')
    .optional(),
});
export class CreateWalletInputDto extends createZodDto(
  CreateWalletInputSchema,
) {}
export type CreateWalletInput = z.infer<typeof CreateWalletInputSchema>;

/**
 * Cash operation types
 */
export const CashOperationType = z.enum(['DEPOSIT', 'WITHDRAWAL']);
export type CashOperationType = z.infer<typeof CashOperationType>;

/**
 * Schema for cash operations (deposit/withdrawal)
 */
export const CashOperationInputSchema = z.object({
  type: CashOperationType,
  amount: z.number().positive('Valor deve ser positivo'),
  date: z
    .string()
    .datetime({ message: 'Data invalida (formato ISO esperado)' }),
  idempotencyKey: z.string().min(1, 'Chave de idempotencia obrigatoria'),
});
export class CashOperationInputDto extends createZodDto(
  CashOperationInputSchema,
) {}
export type CashOperationInput = z.infer<typeof CashOperationInputSchema>;

/**
 * Schema for trade operations (buy/sell)
 */
export const TradeInputSchema = z.object({
  ticker: z
    .string()
    .min(1, 'Ticker obrigatorio')
    .max(20, 'Ticker deve ter no maximo 20 caracteres')
    .toUpperCase(),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  price: z.number().positive('Preco deve ser positivo'),
  date: z
    .string()
    .datetime({ message: 'Data invalida (formato ISO esperado)' }),
  idempotencyKey: z.string().min(1, 'Chave de idempotencia obrigatoria'),
});
export class TradeInputDto extends createZodDto(TradeInputSchema) {}
export type TradeInput = z.infer<typeof TradeInputSchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Transaction response schema
 */
export const TransactionResponseSchema = z.object({
  id: z.string().uuid(),
  walletId: z.string().uuid(),
  assetId: z.string().uuid().nullable(),
  type: z.enum([
    'BUY',
    'SELL',
    'DIVIDEND',
    'SPLIT',
    'SUBSCRIPTION',
    'DEPOSIT',
    'WITHDRAWAL',
  ]),
  quantity: z.number().nullable(),
  price: z.number().nullable(),
  totalValue: z.number(),
  executedAt: z.string(),
  ticker: z.string().nullable(),
  createdAt: z.string(),
});
export type TransactionResponse = z.infer<typeof TransactionResponseSchema>;

/**
 * Position response schema with calculated fields
 */
export const PositionResponseSchema = z.object({
  id: z.string().uuid(),
  assetId: z.string().uuid(),
  ticker: z.string(),
  name: z.string(),
  type: z.enum(['STOCK', 'OPTION']),
  quantity: z.number(),
  averagePrice: z.number(),
  currentPrice: z.number().optional(),
  totalCost: z.number(),
  currentValue: z.number().optional(),
  profitLoss: z.number().optional(),
  profitLossPercent: z.number().optional(),
});
export type PositionResponse = z.infer<typeof PositionResponseSchema>;

/**
 * Wallet summary response schema
 */
export const WalletSummaryResponseSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  currency: z.string(),
  cashBalance: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WalletSummaryResponse = z.infer<typeof WalletSummaryResponseSchema>;

/**
 * Full wallet response with positions and calculated values
 */
export const WalletResponseSchema = WalletSummaryResponseSchema.extend({
  positions: z.array(PositionResponseSchema),
  totalPositionsValue: z.number(),
  totalValue: z.number(),
});
export type WalletResponse = z.infer<typeof WalletResponseSchema>;

/**
 * Wallet list response schema
 */
export const WalletListResponseSchema = z.array(WalletSummaryResponseSchema);
export type WalletListResponse = z.infer<typeof WalletListResponseSchema>;

// ============================================================================
// API RESPONSE DTOs
// ============================================================================

export class WalletApiResponseDto extends createZodDto(
  createApiResponseSchema(WalletResponseSchema),
) {}

export class WalletSummaryApiResponseDto extends createZodDto(
  createApiResponseSchema(WalletSummaryResponseSchema),
) {}

export class WalletListApiResponseDto extends createZodDto(
  createApiResponseSchema(WalletListResponseSchema),
) {}

export class TransactionApiResponseDto extends createZodDto(
  createApiResponseSchema(TransactionResponseSchema),
) {}

/**
 * Transaction list response schema (paginated)
 * Note: Defined as a complete response schema to work around nestjs-zod OpenAPI generation bug
 */
export const TransactionListResponseSchema = z.object({
  items: z.array(TransactionResponseSchema),
  nextCursor: z.string().uuid().nullable(),
});
export type TransactionListResponse = z.infer<
  typeof TransactionListResponseSchema
>;

/**
 * Full API response for transaction list
 * Note: Defined explicitly to ensure correct OpenAPI schema generation
 */
export const TransactionListApiResponseSchema = z.object({
  success: z.literal(true),
  data: TransactionListResponseSchema.optional(),
  message: z.string().optional(),
});

export class TransactionListApiResponseDto extends createZodDto(
  TransactionListApiResponseSchema,
) {}

// ============================================================================
// ASSET SEARCH SCHEMAS
// ============================================================================

/**
 * Asset search result schema
 */
export const AssetSearchResultSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  type: z.string(),
  exchange: z.string(),
});
export type AssetSearchResultType = z.infer<typeof AssetSearchResultSchema>;

/**
 * Asset search response schema (array of results)
 */
export const AssetSearchResponseSchema = z.array(AssetSearchResultSchema);
export type AssetSearchResponse = z.infer<typeof AssetSearchResponseSchema>;

export class AssetSearchApiResponseDto extends createZodDto(
  createApiResponseSchema(AssetSearchResponseSchema),
) {}

/**
 * Asset price response schema
 */
export const AssetPriceResponseSchema = z.object({
  ticker: z.string(),
  price: z.number(),
  name: z.string().optional(),
  type: z.string().optional(),
});
export type AssetPriceResponse = z.infer<typeof AssetPriceResponseSchema>;

export class AssetPriceApiResponseDto extends createZodDto(
  createApiResponseSchema(AssetPriceResponseSchema),
) {}
