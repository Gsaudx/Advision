import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from './notifications.api';
import { NOTIFICATIONS_KEY } from './useNotifications';

export function useMarkAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
