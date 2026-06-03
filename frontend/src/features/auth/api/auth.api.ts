import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api-response';
import type { LoginCredentials, RegisterCredentials, User } from '../types';

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

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, password });
  },
};
