import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from './notifications.api';
import { NOTIFICATIONS_KEY } from './useNotifications';

export function useMarkAllAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
