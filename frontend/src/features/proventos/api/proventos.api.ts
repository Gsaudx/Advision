import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api-response';
import type { WalletProventosResult } from '../types';

export const proventosApi = {
  getWalletProventos: async (
    walletId: string,
  ): Promise<WalletProventosResult> => {
    const response = await api.get<ApiResponse<WalletProventosResult>>(
      `/proventos/wallet/${walletId}`,
    );
    return response.data.data;
  },
};
