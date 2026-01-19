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
 */
export type Position = Wallet['positions'][number];

/**
 * Asset type enum
 */
export type AssetType = Position['type'];

/**
 * Input for creating a new wallet
 */
export type CreateWalletInput = components['schemas']['CreateWalletInputDto'];

/**
 * Input for cash operations (deposit/withdrawal)
 */
export type CashOperationInput = components['schemas']['CashOperationInputDto'];

/**
 * Cash operation type enum
 */
export type CashOperationType = CashOperationInput['type'];

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

// ============================================================================
// Transaction types
// ============================================================================

/**
 * Single transaction record
 * Note: Using the generated schema element for field shape only.
 */
export type Transaction = NonNullable<
  components['schemas']['TransactionListApiResponseDto']['data']
>[number];

/**
 * Transaction list response (paginated)
 * Note: Backend returns { items, nextCursor }.
 */
export type TransactionList = {
  items: Transaction[];
  nextCursor: string | null;
};

export type TransactionType =
  | 'BUY'
  | 'SELL'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'DIVIDEND'
  | 'SPLIT'
  | 'SUBSCRIPTION';

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
  initialCashBalance: string;
}

/**
 * Form data used in the CashOperationModal
 */
export interface CashOperationFormData {
  type: CashOperationType;
  amount: string;
  date: string;
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
  DEPOSIT: 'Depósito',
  WITHDRAWAL: 'Saque',
  DIVIDEND: 'Dividendo',
  SPLIT: 'Desdobramento',
  SUBSCRIPTION: 'Subscrição',
};

/**
 * Maps transaction type to Tailwind color classes
 */
export const transactionTypeColors: Record<TransactionType, string> = {
  BUY: 'text-blue-400',
  SELL: 'text-orange-400',
  DEPOSIT: 'text-green-400',
  WITHDRAWAL: 'text-red-400',
  DIVIDEND: 'text-emerald-400',
  SPLIT: 'text-purple-400',
  SUBSCRIPTION: 'text-cyan-400',
};

/**
 * Maps cash operation type to display text
 */
export const cashOperationLabels: Record<CashOperationType, string> = {
  DEPOSIT: 'Depósito',
  WITHDRAWAL: 'Saque',
};

/**
 * Maps asset type to display text
 */
export const assetTypeLabels: Record<AssetType, string> = {
  STOCK: 'Ação',
  OPTION: 'Opção',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a unique idempotency key for operations
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Gets today's date in ISO format for date inputs
 */
export function getTodayISO(): string {
  return new Date().toISOString();
}
