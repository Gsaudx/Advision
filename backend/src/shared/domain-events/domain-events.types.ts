import type { AggregateType } from '@/generated/prisma/enums';

/**
 * Event type constants for Wallet aggregate
 */
export const WalletEvents = {
  CREATED: 'WalletCreated',
  CASH_DEPOSITED: 'CashDeposited',
  CASH_WITHDRAWN: 'CashWithdrawn',
  POSITION_OPENED: 'PositionOpened',
  POSITION_INCREASED: 'PositionIncreased',
  POSITION_DECREASED: 'PositionDecreased',
  POSITION_CLOSED: 'PositionClosed',
} as const;

/**
 * Event type constants for Client aggregate
 */
export const ClientEvents = {
  CREATED: 'ClientCreated',
  UPDATED: 'ClientUpdated',
  DELETED: 'ClientDeleted',
  INVITE_SENT: 'InviteSent',
  INVITE_ACCEPTED: 'InviteAccepted',
  INVITE_REVOKED: 'InviteRevoked',
  USER_LINKED: 'UserLinked',
} as const;

/**
 * Event type constants for Optimization aggregate
 */
export const OptimizationEvents = {
  RUN_CREATED: 'OptimizationRunCreated',
  RUN_ACCEPTED: 'OptimizationRunAccepted',
  REBALANCE_EXECUTED: 'RebalanceExecuted',
} as const;

/**
 * Event type constants for Derivatives aggregate
 */
export const DerivativesEvents = {
  OPTION_BOUGHT: 'OptionBought',
  OPTION_SOLD: 'OptionSold',
  OPTION_POSITION_CLOSED: 'OptionPositionClosed',
  STRATEGY_EXECUTED: 'StrategyExecuted',
  STRATEGY_FAILED: 'StrategyFailed',
  OPTION_EXERCISED: 'OptionExercised',
  OPTION_ASSIGNED: 'OptionAssigned',
  OPTION_EXPIRED: 'OptionExpired',
} as const;

/**
 * Union type of all wallet event types
 */
export type WalletEventType = (typeof WalletEvents)[keyof typeof WalletEvents];

/**
 * Union type of all client event types
 */
export type ClientEventType = (typeof ClientEvents)[keyof typeof ClientEvents];

/**
 * Union type of all optimization event types
 */
export type OptimizationEventType =
  (typeof OptimizationEvents)[keyof typeof OptimizationEvents];

/**
 * Union type of all derivatives event types
 */
export type DerivativesEventType =
  (typeof DerivativesEvents)[keyof typeof DerivativesEvents];

/**
 * Parameters for recording a domain event
 */
export interface RecordEventParams<T = Record<string, unknown>> {
  aggregateType: AggregateType;
  aggregateId: string;
  eventType: string;
  payload: T;
  actorId?: string;
  actorRole?: string;
  requestId?: string;
  correlationId?: string;
}

/**
 * Payload for WalletCreated event
 */
export interface WalletCreatedPayload {
  walletId: string;
  clientId: string;
  name: string;
  currency: string;
  initialCashBalance: number;
}

/**
 * Payload for CashDeposited event
 */
export interface CashDepositedPayload {
  walletId: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
}

/**
 * Payload for CashWithdrawn event
 */
export interface CashWithdrawnPayload {
  walletId: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
}

/**
 * Payload for PositionOpened event
 */
export interface PositionOpenedPayload {
  walletId: string;
  positionId: string;
  ticker: string;
  assetId: string;
  quantity: number;
  price: number;
  totalCost: number;
}

/**
 * Payload for PositionIncreased event
 */
export interface PositionIncreasedPayload {
  walletId: string;
  positionId: string;
  ticker: string;
  assetId: string;
  addedQuantity: number;
  price: number;
  previousQuantity: number;
  newQuantity: number;
  previousAveragePrice: number;
  newAveragePrice: number;
}

/**
 * Payload for PositionDecreased event
 */
export interface PositionDecreasedPayload {
  walletId: string;
  positionId: string;
  ticker: string;
  assetId: string;
  soldQuantity: number;
  price: number;
  previousQuantity: number;
  newQuantity: number;
  totalProceeds: number;
}

/**
 * Payload for PositionClosed event
 */
export interface PositionClosedPayload {
  walletId: string;
  positionId: string;
  ticker: string;
  assetId: string;
  finalQuantity: number;
  price: number;
  totalProceeds: number;
}

/**
 * Payload for ClientCreated event
 */
export interface ClientCreatedPayload {
  clientId: string;
  advisorId: string;
  name: string;
  clientCode: string;
}

/**
 * Payload for ClientUpdated event
 */
export interface ClientUpdatedPayload {
  clientId: string;
  changes: {
    name?: { from: string; to: string };
    clientCode?: { from: string; to: string };
  };
}

/**
 * Payload for InviteSent event
 */
export interface InviteSentPayload {
  clientId: string;
  advisorId: string;
  expiresAt: string;
}

/**
 * Payload for InviteAccepted event
 */
export interface InviteAcceptedPayload {
  clientId: string;
  userId: string;
  advisorId: string;
}

/**
 * Payload for UserLinked event
 */
export interface UserLinkedPayload {
  clientId: string;
  userId: string;
  advisorId: string;
}

/**
 * Payload for ClientDeleted event
 */
export interface ClientDeletedPayload {
  clientId: string;
  advisorId: string;
  name: string;
  clientCode: string;
}

/**
 * Payload for InviteRevoked event
 */
export interface InviteRevokedPayload {
  clientId: string;
  advisorId: string;
}

// ============================================================================
// DERIVATIVES EVENT PAYLOADS
// ============================================================================

/**
 * Payload for OptionBought event
 */
export interface OptionBoughtPayload {
  walletId: string;
  positionId: string;
  ticker: string;
  assetId: string;
  contracts: number;
  premium: number;
  totalCost: number;
  optionType: 'CALL' | 'PUT';
  strikePrice: number;
  expirationDate: string;
}

/**
 * Payload for OptionSold event
 */
export interface OptionSoldPayload {
  walletId: string;
  positionId: string;
  ticker: string;
  assetId: string;
  contracts: number;
  premium: number;
  totalPremium: number;
  optionType: 'CALL' | 'PUT';
  strikePrice: number;
  expirationDate: string;
  covered: boolean;
  collateralBlocked: number;
}

/**
 * Payload for OptionPositionClosed event
 */
export interface OptionPositionClosedPayload {
  walletId: string;
  positionId: string;
  ticker: string;
  assetId: string;
  contractsClosed: number;
  premium: number;
  totalValue: number;
  wasShort: boolean;
  remainingContracts: number;
}

/**
 * Payload for StrategyExecuted event
 */
export interface StrategyExecutedPayload {
  structuredOperationId: string;
  walletId: string;
  strategyType: string;
  legsCount: number;
  netPremium: number;
  isDebitStrategy: boolean;
  marginRequired: number;
  correlationId: string;
}

/**
 * Payload for StrategyFailed event
 */
export interface StrategyFailedPayload {
  structuredOperationId: string;
  walletId: string;
  strategyType: string;
  reason: string;
  correlationId: string;
}

/**
 * Payload for OptionExercised event
 */
export interface OptionExercisedPayload {
  lifecycleId: string;
  walletId: string;
  positionId: string;
  optionTicker: string;
  underlyingTicker: string;
  optionType: 'CALL' | 'PUT';
  contracts: number;
  underlyingQuantity: number;
  strikePrice: number;
  totalCost: number;
}

/**
 * Payload for OptionAssigned event
 */
export interface OptionAssignedPayload {
  lifecycleId: string;
  walletId: string;
  positionId: string;
  optionTicker: string;
  underlyingTicker: string;
  optionType: 'CALL' | 'PUT';
  contracts: number;
  underlyingQuantity: number;
  strikePrice: number;
  settlementAmount: number;
  collateralReleased: number;
}

/**
 * Payload for OptionExpired event
 */
export interface OptionExpiredPayload {
  lifecycleId: string;
  walletId: string;
  positionId: string;
  optionTicker: string;
  underlyingTicker: string;
  optionType: 'CALL' | 'PUT';
  contracts: number;
  wasShort: boolean;
  wasInTheMoney: boolean;
  strikePrice: number;
  collateralReleased: number;
}
