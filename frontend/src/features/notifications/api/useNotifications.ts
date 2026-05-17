import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from './notifications.api';

export const NOTIFICATIONS_KEY = ['notifications'] as const;

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: notificationsApi.getNotifications,
    staleTime: 60_000,
  });
}

export function useUnreadCount() {
  const qc = useQueryClient();

  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: notificationsApi.getUnreadCount,
    staleTime: 60_000,
    initialData: () => {
      const list = qc.getQueryData<{ unreadCount: number }>(NOTIFICATIONS_KEY);
      return list?.unreadCount;
    },
  });
}
