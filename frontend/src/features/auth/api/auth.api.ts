import { api } from '@/lib/axios';
import type { LoginCredentials, RegisterCredentials, User } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<User> => {
    const response = await api.post<ApiResponse<User>>(
      '/auth/login',
      credentials,
    );
    return response.data.data;
  },

  register: async (credentials: RegisterCredentials): Promise<User> => {
    const response = await api.post<ApiResponse<User>>(
      '/auth/register',
      credentials,
    );
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },
};
