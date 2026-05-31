import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api-response';
import type {
  NotificationList,
  NotificationSettings,
  UpdateNotificationSettingsDto,
} from '../types/notification.types';

export const notificationsApi = {
  getNotifications: async (): Promise<NotificationList> => {
    const response =
      await api.get<ApiResponse<NotificationList>>('/notifications');
    return response.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<ApiResponse<{ count: number }>>(
      '/notifications/unread-count',
    );
    return response.data.data.count;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },

  getSettings: async (): Promise<NotificationSettings> => {
    const response = await api.get<ApiResponse<NotificationSettings>>(
      '/notifications/settings',
    );
    return response.data.data;
  },

  updateSettings: async (
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> => {
    const response = await api.put<ApiResponse<NotificationSettings>>(
      '/notifications/settings',
      dto,
    );
    return response.data.data;
  },
};
