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

export interface PaginatedActivity {
  items: ActivityItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdvisorMetrics {
  clientCount: number;
  totalWalletValue: number;
  pendingOperationsCount: number;
  expiringOptionsCount: number;
}

export interface AdvisorExpiration {
  positionId: string;
  ticker: string;
  optionType: 'CALL' | 'PUT';
  strikePrice: number;
  expirationDate: string;
  daysUntilExpiry: number;
  quantity: number;
  isShort: boolean;
  walletName: string;
  clientName: string;
  moneyness?: 'ITM' | 'ATM' | 'OTM';
  status: 'Proximo' | 'Em dia' | 'Vencido';
}

export interface AdvisorExpirationsList {
  expirations: AdvisorExpiration[];
  total: number;
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

  getAdvisorActivityHistory: async (
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedActivity> => {
    const response = await api.get<ApiResponse<PaginatedActivity>>(
      `/activity/advisor/history?page=${page}&pageSize=${pageSize}`,
    );
    return response.data.data;
  },

  getClientActivityHistory: async (
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedActivity> => {
    const response = await api.get<ApiResponse<PaginatedActivity>>(
      `/activity/client/history?page=${page}&pageSize=${pageSize}`,
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

  getAdvisorExpirations: async (
    daysAhead = 30,
  ): Promise<AdvisorExpirationsList> => {
    const response = await api.get<ApiResponse<AdvisorExpirationsList>>(
      `/activity/advisor/expirations?daysAhead=${daysAhead}`,
    );
    return response.data.data;
  },
};
