import { api } from '@/lib/axios';
import type {
  Client,
  CreateClientInput,
  UpdateClientInput,
  InviteResponse,
} from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const clientsApi = {
  getAll: async (): Promise<Client[]> => {
    const response = await api.get<ApiResponse<Client[]>>('/clients');
    return response.data.data;
  },

  getById: async (id: string): Promise<Client> => {
    const response = await api.get<ApiResponse<Client>>(`/clients/${id}`);
    return response.data.data;
  },

  create: async (data: CreateClientInput): Promise<Client> => {
    const response = await api.post<ApiResponse<Client>>('/clients', data);
    return response.data.data;
  },

  update: async (id: string, data: UpdateClientInput): Promise<Client> => {
    const response = await api.put<ApiResponse<Client>>(`/clients/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/clients/${id}`);
  },

  generateInvite: async (clientId: string): Promise<InviteResponse> => {
    const response = await api.post<ApiResponse<InviteResponse>>(
      `/clients/${clientId}/invite`,
    );
    return response.data.data;
  },

  getInviteStatus: async (clientId: string): Promise<InviteResponse | null> => {
    const response = await api.get<ApiResponse<InviteResponse | null>>(
      `/clients/${clientId}/invite`,
    );
    return response.data.data;
  },

  revokeInvite: async (clientId: string): Promise<void> => {
    await api.delete(`/clients/${clientId}/invite`);
  },
};
