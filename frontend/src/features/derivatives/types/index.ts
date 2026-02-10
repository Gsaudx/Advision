import type { AssetSearchResult } from '@/features/wallets/types';

// ============================================================================
// OPTION TYPES
// ============================================================================

export type OptionType = 'CALL' | 'PUT';
export type ExerciseType = 'AMERICAN' | 'EUROPEAN';
export type OperationStatus =
  | 'PENDING'
  | 'EXECUTED'
  | 'FAILED'
  | 'EXPIRED'
  | 'EXERCISED'
  | 'ASSIGNED';
export type OptionLifecycleEventType =
  | 'OPENED'
  | 'EXERCISED'
  | 'ASSIGNED'
  | 'EXPIRED_ITM'
  | 'EXPIRED_OTM'
  | 'CLOSED';
export type Moneyness = 'ITM' | 'ATM' | 'OTM';

export type OperationLegType =
  | 'BUY_CALL'
  | 'SELL_CALL'
  | 'BUY_PUT'
  | 'SELL_PUT'
  | 'BUY_STOCK'
  | 'SELL_STOCK';

export type StrategyType =
  | 'SINGLE_OPTION'
  | 'STRADDLE'
  | 'STRANGLE'
  | 'BULL_CALL_SPREAD'
  | 'BEAR_PUT_SPREAD'
  | 'COVERED_CALL'
  | 'PROTECTIVE_PUT'
  | 'COLLAR'
  | 'CUSTOM';

// ============================================================================
// OPTION SEARCH TYPES
// ============================================================================

export interface OptionSearchResult extends AssetSearchResult {
  strike?: number;
  expirationDate?: string;
  optionType?: OptionType;
}

// ============================================================================
// OPTION POSITION TYPES
// ============================================================================

export interface OptionDetail {
  optionType: OptionType;
  exerciseType: ExerciseType;
  strikePrice: number;
  expirationDate: string;
  underlyingTicker: string;
}

export interface OptionPosition {
  id: string;
  walletId: string;
  assetId: string;
  ticker: string;
  name: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  currentPrice?: number;
  currentValue?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  isShort: boolean;
  collateralBlocked?: number;
  optionDetail: OptionDetail;
}

export interface OptionPositionList {
  positions: OptionPosition[];
  totalPremiumPaid: number;
  totalPremiumReceived: number;
  netPremium: number;
}

// ============================================================================
// OPTION TRADE TYPES
// ============================================================================

export interface BuyOptionInput {
  ticker: string;
  quantity: number;
  premium: number;
  date: string;
  idempotencyKey: string;
}

export interface SellOptionInput {
  ticker: string;
  quantity: number;
  premium: number;
  date: string;
  covered: boolean;
  idempotencyKey: string;
}

export interface CloseOptionInput {
  quantity?: number;
  premium: number;
  date: string;
  idempotencyKey: string;
}

export interface OptionTradeResult {
  positionId: string;
  transactionId: string;
  ticker: string;
  quantity: number;
  premium: number;
  totalValue: number;
  status: OperationStatus;
}

// ============================================================================
// STRATEGY TYPES
// ============================================================================

export interface OperationLegInput {
  legType: OperationLegType;
  ticker: string;
  quantity: number;
  price: number;
}

export interface ExecuteStrategyInput {
  strategyType: StrategyType;
  underlyingTicker?: string;
  legs: OperationLegInput[];
  executedAt: string;
  notes?: string;
  idempotencyKey: string;
}

export interface OperationLeg {
  id: string;
  legOrder: number;
  legType: OperationLegType;
  ticker: string;
  assetId: string;
  quantity: number;
  price: number;
  totalValue: number;
  status: OperationStatus;
  transactionId: string | null;
  executedAt: string | null;
}

export interface StructuredOperation {
  id: string;
  walletId: string;
  strategyType: StrategyType;
  status: OperationStatus;
  totalPremium: number;
  netDebitCredit: number;
  executedAt: string | null;
  expirationDate: string | null;
  notes: string | null;
  legs: OperationLeg[];
  createdAt: string;
  updatedAt: string;
}

export interface StructuredOperationList {
  items: StructuredOperation[];
  nextCursor: string | null;
}

export interface StrategyRiskProfile {
  maxLoss: number | null;
  maxGain: number | null;
  breakEvenPoints: number[];
  netPremium: number;
  marginRequired: number;
  isDebitStrategy: boolean;
}

export interface StrategyPreview {
  strategyType: StrategyType;
  legs: OperationLegInput[];
  riskProfile: StrategyRiskProfile;
  totalCost: number;
  isValid: boolean;
  validationErrors: string[];
}

// ============================================================================
// LIFECYCLE TYPES
// ============================================================================

export interface ExerciseOptionInput {
  quantity?: number;
  notes?: string;
  idempotencyKey: string;
}

export interface AssignmentInput {
  quantity: number;
  notes?: string;
  idempotencyKey: string;
}

export interface ExpireOptionInput {
  notes?: string;
  idempotencyKey: string;
}

export interface ExerciseResult {
  lifecycleId: string;
  event: OptionLifecycleEventType;
  optionPositionId: string;
  underlyingPositionId: string | null;
  underlyingTicker: string;
  underlyingQuantity: number;
  strikePrice: number;
  totalCost: number;
  cashBalanceAfter: number;
}

export interface AssignmentResult {
  lifecycleId: string;
  event: OptionLifecycleEventType;
  optionPositionId: string;
  underlyingPositionId: string | null;
  underlyingTicker: string;
  underlyingQuantity: number;
  strikePrice: number;
  settlementAmount: number;
  cashBalanceAfter: number;
  collateralReleased: number;
}

export interface ExpirationResult {
  lifecycleId: string;
  event: OptionLifecycleEventType;
  positionId: string;
  ticker: string;
  wasInTheMoney: boolean;
  collateralReleased: number;
}

export interface UpcomingExpiration {
  positionId: string;
  ticker: string;
  optionType: OptionType;
  strikePrice: number;
  expirationDate: string;
  daysUntilExpiry: number;
  quantity: number;
  isShort: boolean;
  underlyingTicker: string;
  currentUnderlyingPrice?: number;
  moneyness?: Moneyness;
}

export interface UpcomingExpirationsResponse {
  expirations: UpcomingExpiration[];
  totalPositionsExpiring: number;
}

// ============================================================================
// FORM DATA TYPES
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function getTodayISO(): string {
  return new Date().toISOString();
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}
