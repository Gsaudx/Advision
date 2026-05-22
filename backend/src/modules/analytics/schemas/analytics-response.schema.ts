// best-worst-assets
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

// options-expiry
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

// pending-actions
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

// dividends
export interface DividendsMonthly {
  month: string; // "YYYY-MM"
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

// asset-concentration
export interface ConcentrationHolding {
  ticker: string;
  name: string;
  valueR$: number;
  percentBook: number;
  nClients: number;
  gainPercent: number;
  flags: {
    overWeight: boolean;
    overConcentrated: boolean;
  };
}
export interface AssetConcentrationResponse {
  holdings: ConcentrationHolding[];
  totalBookValue: number;
}

// sector-exposure
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

// client-ranking
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

// patrimony-evolution (v2)
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

// benchmark (v2)
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
