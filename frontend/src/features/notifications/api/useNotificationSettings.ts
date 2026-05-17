import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from './notifications.api';
import type { UpdateNotificationSettingsDto } from '../types/notification.types';
import { NOTIFICATIONS_KEY } from './useNotifications';

const SETTINGS_KEY = [...NOTIFICATIONS_KEY, 'settings'] as const;

export function useNotificationSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: notificationsApi.getSettings,
  });
}

export function useUpdateNotificationSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateNotificationSettingsDto) =>
      notificationsApi.updateSettings(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SETTINGS_KEY });
      void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
