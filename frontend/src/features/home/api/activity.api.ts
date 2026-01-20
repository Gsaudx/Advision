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

export interface AdvisorMetrics {
  clientCount: number;
  totalWalletValue: number;
}

export interface ClientProfile {
  clientId: string;
  clientName: string;
  advisorId: string;
  advisorName: string;
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

  getAdvisorMetrics: async (): Promise<AdvisorMetrics> => {
    const response = await api.get<ApiResponse<AdvisorMetrics>>(
      '/activity/advisor/metrics',
    );
    return response.data.data;
  },

  getClientProfile: async (): Promise<ClientProfile> => {
    const response = await api.get<ApiResponse<ClientProfile>>(
      '/activity/client/profile',
    );
    return response.data.data;
  },
};
