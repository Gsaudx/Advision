// Mirror dos DTOs de response do backend

export type AnalyticsMode = 'CONSOLIDATED' | 'DRILLDOWN';
export type AnalyticsPeriod = '1M' | '3M' | '6M' | '1A' | 'YTD' | 'CUSTOM';

export interface BestWorstAsset {
  ticker: string;
  name: string;
  clientName: string | null;
  walletId: string;
  resultAbsolute: number;
  resultPercent: number;
  currentPrice: number;
  averagePrice: number;
}
export interface BestWorstAssetsResponse {
  topGains: BestWorstAsset[];
  topLosses: BestWorstAsset[];
}

export interface OptionsExpiryPosition {
  ticker: string;
  walletId: string;
  clientName: string;
  expirationDate: string;
  value: number;
  daysUntilExpiry: number;
}
export interface OptionsExpiryWindow {
  label: string;
  totalValue: number;
  count: number;
  positions: OptionsExpiryPosition[];
}
export interface OptionsExpiryResponse {
  windows: OptionsExpiryWindow[];
}

export type PendingActionType = 'OPTION_EXPIRY' | 'INACTIVE_CLIENT';
export type PendingActionSeverity = 'critical' | 'warning';
export interface PendingActionItem {
  type: PendingActionType;
  severity: PendingActionSeverity;
  description: string;
  linkTo: string;
  clientName: string;
  walletId: string | null;
  daysInactive?: number;
  positionCount?: number;
  costBasis?: number;
}
export interface PendingActionsResponse {
  items: PendingActionItem[];
}

export interface DividendsMonthly {
  month: string;
  total: number;
}
export interface DividendsTopPayer {
  ticker: string;
  name: string;
  total: number;
}
export interface DividendsResponse {
  monthly: DividendsMonthly[];
  topPayers: DividendsTopPayer[];
  totalPeriod: number;
}

export interface ConcentrationHolding {
  ticker: string;
  name: string;
  valueR$: number;
  percentBook: number;
  nClients: number;
  gainPercent: number;
  flags: { overWeight: boolean; overConcentrated: boolean };
}
export interface AssetConcentrationResponse {
  holdings: ConcentrationHolding[];
  totalBookValue: number;
}

export interface SectorExposureItem {
  sector: string;
  valueR$: number;
  percent: number;
  assetCount: number;
}
export interface SectorExposureResponse {
  sectors: SectorExposureItem[];
  totalValue: number;
}

export interface ClientRankingItem {
  clientId: string;
  name: string;
  patrimonioR$: number;
  rentabilidadePercent: number;
  resultadoR$: number;
  lastOperationAt: string | null;
  criticalNotifications: number;
}
export interface ClientRankingResponse {
  clients: ClientRankingItem[];
}

export interface PatrimonyDataPoint {
  date: string;
  totalValue: number;
}
export interface PatrimonyEvolutionResponse {
  series: PatrimonyDataPoint[];
  startValue: number;
  endValue: number;
  changePercent: number;
}

export interface BenchmarkDataPoint {
  date: string;
  portfolioValue: number;
  portfolioPercent: number;
  ibovPercent: number;
}
export interface BenchmarkResponse {
  series: BenchmarkDataPoint[];
  portfolioChangePercent: number;
  ibovChangePercent: number;
}

export interface AnalyticsBaseParams {
  mode: AnalyticsMode;
  walletId?: string;
}
export interface AnalyticsPeriodParams extends AnalyticsBaseParams {
  period: AnalyticsPeriod;
  customFrom?: string;
  customTo?: string;
}
export interface AnalyticsEvolutionParams extends AnalyticsBaseParams {
  period: AnalyticsPeriod;
  customFrom?: string;
  customTo?: string;
}
