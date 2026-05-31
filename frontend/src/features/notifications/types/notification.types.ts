export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type NotificationType = 'OPTION_EXPIRY';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  message: string;
  isRead: boolean;
  readAt: string | null;
  walletId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationList {
  notifications: NotificationItem[];
  unreadCount: number;
}

export interface NotificationSettings {
  notificationsEnabled: boolean;
  notificationWindowDays: number;
  lastNotificationCheckAt: string | null;
}

export interface UpdateNotificationSettingsDto {
  notificationsEnabled?: boolean;
  notificationWindowDays?: number;
}
