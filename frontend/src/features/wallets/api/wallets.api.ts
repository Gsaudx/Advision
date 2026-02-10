import { api } from '@/lib/axios';
import type {
  Wallet,
  WalletSummary,
  CreateWalletInput,
  CashOperationInput,
  TradeInput,
  AssetSearchResult,
  AssetPriceResult,
  TransactionList,
  OptionDetailsResult,
} from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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

  create: async (data: CreateWalletInput): Promise<Wallet> => {
    const response = await api.post<ApiResponse<Wallet>>('/wallets', data);
    return response.data.data;
  },

  cashOperation: async (
    walletId: string,
    data: CashOperationInput,
  ): Promise<Wallet> => {
    const response = await api.post<ApiResponse<Wallet>>(
      `/wallets/${walletId}/cash`,
      data,
    );
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

  getOptionDetails: async (
    ticker: string,
  ): Promise<OptionDetailsResult | null> => {
    const response = await api.get<ApiResponse<OptionDetailsResult | null>>(
      `/wallets/options/${ticker}/details`,
    );
    return response.data.data;
  },
};
