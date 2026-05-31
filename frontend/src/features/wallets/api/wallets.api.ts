import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api-response';
import type {
  Wallet,
  WalletSummary,
  WalletPerformance,
  CreateWalletInput,
  TradeInput,
  AssetSearchResult,
  AssetPriceResult,
  TransactionList,
  OptionDetailsResult,
  HistoricalPriceResponse,
} from '../types';

export interface OptionSearchPage {
  results: AssetSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SentinelStatusItem {
  ticker: string;
  status: 'ACTIVE' | 'UNAVAILABLE' | 'NOT_MONITORED';
  monitoringSince: string | null;
  scanningSince: string | null;
}

export const walletsApi = {
  getAll: async (clientId?: string): Promise<WalletSummary[]> => {
    const params = clientId ? { clientId } : {};
    const response = await api.get<ApiResponse<WalletSummary[]>>('/wallets', {
      params,
    });
    return response.data.data;
  },

  getById: async (id: string): Promise<Wallet> => {
    const response = await api.get<ApiResponse<Wallet>>(`/wallets/${id}`);
    return response.data.data;
  },

  getPerformance: async (id: string): Promise<WalletPerformance> => {
    const response = await api.get<ApiResponse<WalletPerformance>>(
      `/wallets/${id}/performance`,
    );
    return response.data.data;
  },

  create: async (data: CreateWalletInput): Promise<Wallet> => {
    const response = await api.post<ApiResponse<Wallet>>('/wallets', data);
    return response.data.data;
  },

  buy: async (walletId: string, data: TradeInput): Promise<Wallet> => {
    const response = await api.post<ApiResponse<Wallet>>(
      `/wallets/${walletId}/trade/buy`,
      data,
    );
    return response.data.data;
  },

  sell: async (walletId: string, data: TradeInput): Promise<Wallet> => {
    const response = await api.post<ApiResponse<Wallet>>(
      `/wallets/${walletId}/trade/sell`,
      data,
    );
    return response.data.data;
  },

  searchAssets: async (
    query: string,
    limit?: number,
  ): Promise<AssetSearchResult[]> => {
    const params: Record<string, string> = { q: query };
    if (limit) params.limit = String(limit);
    const response = await api.get<ApiResponse<AssetSearchResult[]>>(
      '/wallets/assets/search',
      { params },
    );
    return response.data.data;
  },

  getAssetPrice: async (ticker: string): Promise<AssetPriceResult> => {
    const response = await api.get<ApiResponse<AssetPriceResult>>(
      `/wallets/assets/${ticker}/price`,
    );
    return response.data.data;
  },

  getTransactions: async (
    walletId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<TransactionList> => {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.cursor) params.cursor = options.cursor;
    const response = await api.get<ApiResponse<TransactionList>>(
      `/wallets/${walletId}/transactions`,
      { params },
    );
    return response.data.data;
  },

  searchOptions: async (
    underlying: string,
    optionType?: 'CALL' | 'PUT',
    limit?: number,
  ): Promise<AssetSearchResult[]> => {
    const params: Record<string, string> = { underlying };
    if (optionType) params.type = optionType;
    if (limit) params.limit = String(limit);
    const response = await api.get<ApiResponse<AssetSearchResult[]>>(
      '/wallets/options/search',
      { params },
    );
    return response.data.data;
  },

  searchOptionsPaginated: async (
    underlying: string,
    optionType?: 'CALL' | 'PUT',
    page = 1,
    pageSize = 50,
    q?: string,
  ): Promise<OptionSearchPage> => {
    const params: Record<string, string> = {
      underlying,
      page: String(page),
      pageSize: String(pageSize),
    };
    if (optionType) params.type = optionType;
    if (q) params.q = q;
    const response = await api.get<ApiResponse<OptionSearchPage>>(
      '/wallets/options/search',
      { params },
    );
    return response.data.data;
  },

  getOptionDetails: async (
    ticker: string,
    date?: string,
    underlying?: string,
  ): Promise<OptionDetailsResult | null> => {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    if (underlying) params.underlying = underlying;
    const response = await api.get<ApiResponse<OptionDetailsResult | null>>(
      `/wallets/options/${ticker}/details`,
      { params: Object.keys(params).length > 0 ? params : undefined },
    );
    return response.data.data;
  },

  getSentinelStatus: async (
    walletId: string,
  ): Promise<SentinelStatusItem[]> => {
    const response = await api.get<SentinelStatusItem[]>(
      `/wallets/${walletId}/sentinel/status`,
    );
    return response.data;
  },

  getHistoricalPrice: async (
    ticker: string,
    date: string,
    underlying?: string,
  ): Promise<HistoricalPriceResponse> => {
    const response = await api.get<ApiResponse<HistoricalPriceResponse>>(
      `/wallets/assets/${ticker}/historical-price`,
      { params: { date, ...(underlying ? { underlying } : {}) } },
    );
    return response.data.data;
  },

  expireOption: async (
    walletId: string,
    data: { ticker: string; expiredAt: string },
  ): Promise<void> => {
    await api.post(`/wallets/${walletId}/trade/expire`, data);
  },

  updateTransaction: async (
    walletId: string,
    txId: string,
    data: { date?: string; price?: number; quantity?: number },
  ): Promise<void> => {
    await api.put(`/wallets/${walletId}/transactions/${txId}`, data);
  },

  deleteTransaction: async (walletId: string, txId: string): Promise<void> => {
    await api.delete(`/wallets/${walletId}/transactions/${txId}`);
  },
};

export type { HistoricalPriceResponse } from '../types';
