import type { components } from '@/types/api';
import type { AssetSearchResult } from '@/features/wallets/types';

// Re-export shared utilities (single source for the whole app)
export { generateIdempotencyKey } from '@/lib/utils';
export {
  formatCurrency,
  formatPercent,
  formatDate,
  getTodayISOString as getTodayISO,
} from '@/lib/formatters';

// ============================================================================
// CONTRACT CONSTANT (single source for frontend)
// ============================================================================

/** Standard B3 options contract size (number of shares per contract) */
export const CONTRACT_SIZE = 100;

// ============================================================================
// Types derived from auto-generated API types (single source of truth)
// ============================================================================

// --- Enum-like types extracted from the generated schemas ---

export type OptionType =
  components['schemas']['OptionPositionListApiResponseDto']['data'] extends
    | infer D
    | undefined
    ? NonNullable<D> extends { positions: (infer P)[] }
      ? P extends { optionDetail: { optionType: infer T } }
        ? T
        : never
      : never
    : never;

export type ExerciseType =
  components['schemas']['OptionPositionListApiResponseDto']['data'] extends
    | infer D
    | undefined
    ? NonNullable<D> extends { positions: (infer P)[] }
      ? P extends { optionDetail: { exerciseType: infer T } }
        ? T
        : never
      : never
    : never;

export type OperationStatus = NonNullable<
  NonNullable<
    components['schemas']['OptionTradeResultApiResponseDto']['data']
  >['status']
>;

export type OptionLifecycleEventType = NonNullable<
  NonNullable<
    components['schemas']['ExerciseResultApiResponseDto']['data']
  >['event']
>;

export type OperationLegType = NonNullable<
  NonNullable<
    components['schemas']['StructuredOperationApiResponseDto']['data']
  >['legs'][number]['legType']
>;

export type StrategyType = NonNullable<
  NonNullable<
    components['schemas']['StructuredOperationApiResponseDto']['data']
  >['strategyType']
>;

export type Moneyness = NonNullable<
  NonNullable<
    components['schemas']['UpcomingExpirationsApiResponseDto']['data']
  >['expirations'][number]['moneyness']
>;

// --- Data types derived from response schemas ---

/**
 * Option detail nested inside a position
 */
export type OptionDetail = NonNullable<
  NonNullable<
    components['schemas']['OptionPositionListApiResponseDto']['data']
  >['positions'][number]['optionDetail']
>;

/**
 * Single option position
 */
export type OptionPosition = NonNullable<
  NonNullable<
    components['schemas']['OptionPositionListApiResponseDto']['data']
  >['positions'][number]
>;

/**
 * Option positions list with premium summary
 */
export type OptionPositionList = NonNullable<
  components['schemas']['OptionPositionListApiResponseDto']['data']
>;

// --- Input types ---

export type BuyOptionInput = components['schemas']['BuyOptionInputDto'];

export type SellOptionInput = components['schemas']['SellOptionInputDto'];

export type CloseOptionInput = components['schemas']['CloseOptionInputDto'];

export type OperationLegInput =
  components['schemas']['ExecuteStrategyInputDto']['legs'][number];

export type ExecuteStrategyInput =
  components['schemas']['ExecuteStrategyInputDto'];

export type ExerciseOptionInput =
  components['schemas']['ExerciseOptionInputDto'];

export type AssignmentInput = components['schemas']['AssignmentInputDto'];

export type ExpireOptionInput = components['schemas']['ExpireOptionInputDto'];

// --- Response data types ---

export type OptionTradeResult = NonNullable<
  components['schemas']['OptionTradeResultApiResponseDto']['data']
>;

export type OperationLeg = NonNullable<
  NonNullable<
    components['schemas']['StructuredOperationApiResponseDto']['data']
  >['legs'][number]
>;

export type StructuredOperation = NonNullable<
  components['schemas']['StructuredOperationApiResponseDto']['data']
>;

export type StructuredOperationList = NonNullable<
  components['schemas']['StructuredOperationListApiResponseDto']['data']
>;

export type StrategyRiskProfile = NonNullable<
  NonNullable<
    components['schemas']['StrategyPreviewApiResponseDto']['data']
  >['riskProfile']
>;

export type StrategyPreview = NonNullable<
  components['schemas']['StrategyPreviewApiResponseDto']['data']
>;

export type ExerciseResult = NonNullable<
  components['schemas']['ExerciseResultApiResponseDto']['data']
>;

export type AssignmentResult = NonNullable<
  components['schemas']['AssignmentResultApiResponseDto']['data']
>;

export type ExpirationResult = NonNullable<
  components['schemas']['ExpirationResultApiResponseDto']['data']
>;

export type UpcomingExpiration = NonNullable<
  NonNullable<
    components['schemas']['UpcomingExpirationsApiResponseDto']['data']
  >['expirations'][number]
>;

export type UpcomingExpirationsResponse = NonNullable<
  components['schemas']['UpcomingExpirationsApiResponseDto']['data']
>;

// ============================================================================
// OPTION SEARCH TYPES (frontend-specific, extends wallet search result)
// ============================================================================

export interface OptionSearchResult extends AssetSearchResult {
  strike?: number;
  expirationDate?: string;
  optionType?: OptionType;
  lastPrice?: number;
}

// ============================================================================
// FORM DATA TYPES (frontend-specific)
// ============================================================================

export interface OptionTradeFormData {
  ticker: string;
  quantity: string;
  premium: string;
  date: string;
  covered: boolean;
}

export interface StrategyFormData {
  strategyType: StrategyType;
  underlyingTicker: string;
  legs: Array<{
    legType: OperationLegType;
    ticker: string;
    quantity: string;
    price: string;
  }>;
  notes: string;
  executedAt: string;
}

// ============================================================================
// UI DISPLAY CONSTANTS
// ============================================================================

export const optionTypeLabels: Record<OptionType, string> = {
  CALL: 'CALL',
  PUT: 'PUT',
};

export const exerciseTypeLabels: Record<ExerciseType, string> = {
  AMERICAN: 'Americana',
  EUROPEAN: 'Europeia',
};

export const strategyTypeLabels: Record<StrategyType, string> = {
  SINGLE_OPTION: 'Opção Simples',
  STRADDLE: 'Straddle',
  STRANGLE: 'Strangle',
  BULL_CALL_SPREAD: 'Bull Call Spread',
  BEAR_PUT_SPREAD: 'Bear Put Spread',
  COVERED_CALL: 'Covered Call',
  PROTECTIVE_PUT: 'Protective Put',
  COLLAR: 'Collar',
  CUSTOM: 'Personalizada',
};

export const operationLegTypeLabels: Record<OperationLegType, string> = {
  BUY_CALL: 'Compra CALL',
  SELL_CALL: 'Venda CALL',
  BUY_PUT: 'Compra PUT',
  SELL_PUT: 'Venda PUT',
  BUY_STOCK: 'Compra Ação',
  SELL_STOCK: 'Venda Ação',
};

export const operationStatusLabels: Record<OperationStatus, string> = {
  PENDING: 'Pendente',
  EXECUTED: 'Executada',
  FAILED: 'Falhou',
  EXPIRED: 'Expirada',
  EXERCISED: 'Exercida',
  ASSIGNED: 'Atribuída',
};

export const moneynessLabels: Record<Moneyness, string> = {
  ITM: 'ITM',
  ATM: 'ATM',
  OTM: 'OTM',
};

export const moneynessColors: Record<Moneyness, string> = {
  ITM: 'text-green-400',
  ATM: 'text-yellow-400',
  OTM: 'text-red-400',
};
