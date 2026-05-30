import type { components } from '@/types/api';

// ============================================================================
// Types derived from auto-generated API types (single source of truth)
// ============================================================================

/**
 * Full wallet entity with positions as returned from the dashboard endpoint
 */
export type Wallet = NonNullable<
  components['schemas']['WalletApiResponseDto']['data']
>;

/**
 * Wallet summary (list item) without positions
 */
export type WalletSummary = NonNullable<
  components['schemas']['WalletListApiResponseDto']['data']
>[number];

/**
 * Position with calculated fields (P&L, current value, etc.)
 * Extended with dividend fields not yet in the generated api.d.ts
 */
export type Position = Wallet['positions'][number] & {
  lastDividendDate?: string | null;
  priceAtLastDividend?: number | null;
  optionDetail?: {
    strikePrice: number;
    initialStrike: number | null;
    expirationDate: string;
    optionType: string;
    exerciseType: string;
  } | null;
};

/**
 * Asset type enum
 */
export type AssetType = Position['type'];

/**
 * Concentration breakdown returned in the wallet dashboard
 */
export type ConcentrationItem = Wallet['concentration']['byAsset'][number];

/**
 * Wallet performance response (realized + unrealized + dividends)
 */
export type WalletPerformance = NonNullable<
  components['schemas']['WalletPerformanceApiResponseDto']['data']
>;

/**
 * Per-asset performance breakdown item
 */
export type PerformanceByAsset = WalletPerformance['byAsset'][number];

/**
 * Input for creating a new wallet
 */
export type CreateWalletInput = components['schemas']['CreateWalletInputDto'];

/**
 * Input for trade operations (buy/sell)
 */
export type TradeInput = components['schemas']['TradeInputDto'];

/**
 * Asset search result from Yahoo Finance
 */
export type AssetSearchResult = NonNullable<
  components['schemas']['AssetSearchApiResponseDto']['data']
>[number];

/**
 * Asset price response
 */
export type AssetPriceResult = NonNullable<
  components['schemas']['AssetPriceApiResponseDto']['data']
>;

/**
 * Option details result from OpLab API
 * Note: This is a frontend-specific type for OpLab market data responses
 * which include Greeks not present in the main backend schema.
 */
export interface OptionDetailsResult {
  ticker: string;
  strike: number;
  expirationDate: string;
  type: 'CALL' | 'PUT';
  contractSize?: number;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

// ============================================================================
// Transaction types
// ============================================================================

/**
 * Single transaction record
 */
export type Transaction = NonNullable<
  components['schemas']['TransactionListApiResponseDto']['data']
>['items'][number];

/**
 * Transaction list response (paginated)
 */
export type TransactionList = {
  items: Transaction[];
  nextCursor: string | null;
};

/**
 * Transaction type derived from the Transaction entity (includes option types).
 */
export type TransactionType = Transaction['type'];

// ============================================================================
// Frontend-specific types (not from backend)
// ============================================================================

/**
 * Form data used in the NewWalletModal
 */
export interface WalletFormData {
  clientId: string;
  name: string;
  description: string;
  currency: string;
}

/**
 * Form data used in the TradeModal
 */
export interface TradeFormData {
  ticker: string;
  quantity: string;
  price: string;
  date: string;
}

/**
 * Trade type for buy/sell operations
 */
export type TradeType = 'BUY' | 'SELL';

// ============================================================================
// UI Display Constants
// ============================================================================

/**
 * Maps transaction type to display text (Portuguese)
 */
export const transactionTypeLabels: Record<TransactionType, string> = {
  BUY: 'Compra',
  SELL: 'Venda',
  EXPIRED: 'Vencida',
  DIVIDEND: 'Dividendo',
  SPLIT: 'Desdobramento',
  SUBSCRIPTION: 'Subscrição',
  OPTION_EXERCISE: 'Exercício de Opção',
  OPTION_ASSIGNMENT: 'Atribuição de Opção',
  OPTION_EXPIRY: 'Vencimento de Opção',
};

/**
 * Maps transaction type to Tailwind color classes
 */
export const transactionTypeColors: Record<TransactionType, string> = {
  BUY: 'text-blue-400',
  SELL: 'text-orange-400',
  EXPIRED: 'text-gray-400',
  DIVIDEND: 'text-emerald-400',
  SPLIT: 'text-purple-400',
  SUBSCRIPTION: 'text-cyan-400',
  OPTION_EXERCISE: 'text-indigo-400',
  OPTION_ASSIGNMENT: 'text-amber-400',
  OPTION_EXPIRY: 'text-gray-400',
};

/**
 * Maps asset type to display text
 */
export const assetTypeLabels: Record<AssetType, string> = {
  STOCK: 'Ação',
  OPTION: 'Opção',
};

export interface HistoricalPriceResponse {
  type: 'STOCK' | 'OPTION';
  price: number | null;
  strike?: number | null;
  message?: string;
}
