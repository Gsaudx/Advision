import { api } from '@/lib/axios';

export interface ActivityItem {
  id: string;
  action: string;
  description: string;
  clientName: string | null;
  walletName: string | null;
  occurredAt: string;
  aggregateType: string;
  eventType: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const activityApi = {
  getAdvisorActivity: async (limit = 10): Promise<ActivityItem[]> => {
    const response = await api.get<ApiResponse<ActivityItem[]>>(
      `/activity/advisor?limit=${limit}`,
    );
    return response.data.data;
  },

  getClientActivity: async (limit = 10): Promise<ActivityItem[]> => {
    const response = await api.get<ApiResponse<ActivityItem[]>>(
      `/activity/client?limit=${limit}`,
    );
    return response.data.data;
  },
};
