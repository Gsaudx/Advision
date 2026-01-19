import { api } from '@/lib/axios';
import type {
  Wallet,
  WalletSummary,
  CreateWalletInput,
  CashOperationInput,
  TradeInput,
  AssetSearchResult,
  AssetPriceResult,
  Transaction,
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

  getTransactions: async (walletId: string): Promise<Transaction[]> => {
    const response = await api.get<ApiResponse<Transaction[]>>(
      `/wallets/${walletId}/transactions`,
    );
    return response.data.data;
  },
};
