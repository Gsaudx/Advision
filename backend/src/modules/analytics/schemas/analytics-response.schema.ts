import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createApiResponseSchema } from '@/common/schemas';

// ============================================================================
// best-worst-assets
// ============================================================================

export const BestWorstAssetSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  clientName: z.string().nullable(),
  walletId: z.string().uuid(),
  resultAbsolute: z.number(),
  resultPercent: z.number(),
  currentPrice: z.number(),
  averagePrice: z.number(),
});
export type BestWorstAsset = z.infer<typeof BestWorstAssetSchema>;

export const BestWorstAssetsResponseSchema = z.object({
  topGains: z.array(BestWorstAssetSchema),
  topLosses: z.array(BestWorstAssetSchema),
});
export type BestWorstAssetsResponse = z.infer<
  typeof BestWorstAssetsResponseSchema
>;
export class BestWorstAssetsApiResponseDto extends createZodDto(
  createApiResponseSchema(BestWorstAssetsResponseSchema),
) {}

// ============================================================================
// options-expiry
// ============================================================================

export const OptionsExpiryPositionSchema = z.object({
  ticker: z.string(),
  walletId: z.string().uuid(),
  clientName: z.string(),
  expirationDate: z.string(),
  value: z.number(),
  daysUntilExpiry: z.number(),
});
export type OptionsExpiryPosition = z.infer<typeof OptionsExpiryPositionSchema>;

export const OptionsExpiryWindowSchema = z.object({
  label: z.string(),
  totalValue: z.number(),
  count: z.number(),
  positions: z.array(OptionsExpiryPositionSchema),
});
export type OptionsExpiryWindow = z.infer<typeof OptionsExpiryWindowSchema>;

export const OptionsExpiryResponseSchema = z.object({
  windows: z.array(OptionsExpiryWindowSchema),
});
export type OptionsExpiryResponse = z.infer<typeof OptionsExpiryResponseSchema>;
export class OptionsExpiryApiResponseDto extends createZodDto(
  createApiResponseSchema(OptionsExpiryResponseSchema),
) {}

// ============================================================================
// pending-actions
// ============================================================================

export const PendingActionTypeSchema = z.enum([
  'OPTION_EXPIRY',
  'INACTIVE_CLIENT',
]);
export type PendingActionType = z.infer<typeof PendingActionTypeSchema>;

export const PendingActionSeveritySchema = z.enum(['critical', 'warning']);
export type PendingActionSeverity = z.infer<typeof PendingActionSeveritySchema>;

export const PendingActionItemSchema = z.object({
  type: PendingActionTypeSchema,
  severity: PendingActionSeveritySchema,
  description: z.string(),
  linkTo: z.string(),
  clientName: z.string(),
  walletId: z.string().nullable(),
  daysInactive: z.number().optional(),
  positionCount: z.number().optional(),
  costBasis: z.number().optional(),
});
export type PendingActionItem = z.infer<typeof PendingActionItemSchema>;

export const PendingActionsResponseSchema = z.object({
  items: z.array(PendingActionItemSchema),
});
export type PendingActionsResponse = z.infer<
  typeof PendingActionsResponseSchema
>;
export class PendingActionsApiResponseDto extends createZodDto(
  createApiResponseSchema(PendingActionsResponseSchema),
) {}

// ============================================================================
// dividends
// ============================================================================

export const DividendsMonthlySchema = z.object({
  month: z.string(),
  total: z.number(),
});
export type DividendsMonthly = z.infer<typeof DividendsMonthlySchema>;

export const DividendsTopPayerSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  total: z.number(),
});
export type DividendsTopPayer = z.infer<typeof DividendsTopPayerSchema>;

export const DividendsResponseSchema = z.object({
  monthly: z.array(DividendsMonthlySchema),
  topPayers: z.array(DividendsTopPayerSchema),
  totalPeriod: z.number(),
});
export type DividendsResponse = z.infer<typeof DividendsResponseSchema>;
export class DividendsApiResponseDto extends createZodDto(
  createApiResponseSchema(DividendsResponseSchema),
) {}

// ============================================================================
// asset-concentration
// ============================================================================

export const ConcentrationHoldingSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  valueR$: z.number(),
  percentBook: z.number(),
  nClients: z.number(),
  gainPercent: z.number(),
  flags: z.object({
    overWeight: z.boolean(),
    overConcentrated: z.boolean(),
  }),
});
export type ConcentrationHolding = z.infer<typeof ConcentrationHoldingSchema>;

export const AssetConcentrationResponseSchema = z.object({
  holdings: z.array(ConcentrationHoldingSchema),
  totalBookValue: z.number(),
});
export type AssetConcentrationResponse = z.infer<
  typeof AssetConcentrationResponseSchema
>;
export class AssetConcentrationApiResponseDto extends createZodDto(
  createApiResponseSchema(AssetConcentrationResponseSchema),
) {}

// ============================================================================
// sector-exposure
// ============================================================================

export const SectorExposureItemSchema = z.object({
  sector: z.string(),
  valueR$: z.number(),
  percent: z.number(),
  assetCount: z.number(),
});
export type SectorExposureItem = z.infer<typeof SectorExposureItemSchema>;

export const SectorExposureResponseSchema = z.object({
  sectors: z.array(SectorExposureItemSchema),
  totalValue: z.number(),
});
export type SectorExposureResponse = z.infer<
  typeof SectorExposureResponseSchema
>;
export class SectorExposureApiResponseDto extends createZodDto(
  createApiResponseSchema(SectorExposureResponseSchema),
) {}

// ============================================================================
// client-ranking
// ============================================================================

export const ClientRankingItemSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string(),
  patrimonioR$: z.number(),
  rentabilidadePercent: z.number(),
  resultadoR$: z.number(),
  lastOperationAt: z.string().nullable(),
  criticalNotifications: z.number(),
});
export type ClientRankingItem = z.infer<typeof ClientRankingItemSchema>;

export const ClientRankingResponseSchema = z.object({
  clients: z.array(ClientRankingItemSchema),
});
export type ClientRankingResponse = z.infer<typeof ClientRankingResponseSchema>;
export class ClientRankingApiResponseDto extends createZodDto(
  createApiResponseSchema(ClientRankingResponseSchema),
) {}

// ============================================================================
// patrimony-evolution
// ============================================================================

export const PatrimonyDataPointSchema = z.object({
  date: z.string(),
  totalValue: z.number(),
});
export type PatrimonyDataPoint = z.infer<typeof PatrimonyDataPointSchema>;

export const PatrimonyEvolutionResponseSchema = z.object({
  series: z.array(PatrimonyDataPointSchema),
  startValue: z.number(),
  endValue: z.number(),
  changePercent: z.number(),
});
export type PatrimonyEvolutionResponse = z.infer<
  typeof PatrimonyEvolutionResponseSchema
>;
export class PatrimonyEvolutionApiResponseDto extends createZodDto(
  createApiResponseSchema(PatrimonyEvolutionResponseSchema),
) {}

// ============================================================================
// benchmark
// ============================================================================

export const BenchmarkDataPointSchema = z.object({
  date: z.string(),
  portfolioValue: z.number(),
  portfolioPercent: z.number(),
  ibovPercent: z.number(),
});
export type BenchmarkDataPoint = z.infer<typeof BenchmarkDataPointSchema>;

export const BenchmarkResponseSchema = z.object({
  series: z.array(BenchmarkDataPointSchema),
  portfolioChangePercent: z.number(),
  ibovChangePercent: z.number(),
});
export type BenchmarkResponse = z.infer<typeof BenchmarkResponseSchema>;
export class BenchmarkApiResponseDto extends createZodDto(
  createApiResponseSchema(BenchmarkResponseSchema),
) {}

// ============================================================================
// sectors-reseed
// ============================================================================

export const SectorsReseedResponseSchema = z.object({
  updated: z.number(),
  failed: z.number(),
  skipped: z.number(),
});
export type SectorsReseedResponse = z.infer<typeof SectorsReseedResponseSchema>;
export class SectorsReseedApiResponseDto extends createZodDto(
  createApiResponseSchema(SectorsReseedResponseSchema),
) {}
