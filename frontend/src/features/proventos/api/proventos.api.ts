import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api-response';
import type { DividendEventList } from '../types';

interface GetProventosParams {
  ticker?: string;
  skip?: number;
  take?: number;
}

export const proventosApi = {
  // TODO: remove — temporary for manual sync testing
  forceSync: async (): Promise<void> => {
    await api.post('/proventos/sync');
  },

  getAll: async (params: GetProventosParams = {}): Promise<DividendEventList> => {
    const query: Record<string, string> = {};
    if (params.ticker) query.ticker = params.ticker;
    if (params.skip !== undefined) query.skip = String(params.skip);
    if (params.take !== undefined) query.take = String(params.take);

    const response = await api.get<ApiResponse<DividendEventList>>('/proventos', {
      params: query,
    });
    return response.data.data;
  },
};
