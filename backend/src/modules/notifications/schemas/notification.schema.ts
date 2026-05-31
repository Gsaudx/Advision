import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createApiResponseSchema } from '@/common/schemas';

// ── Notification item ──────────────────────────────────────────────────────

export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['OPTION_EXPIRY']),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  message: z.string(),
  isRead: z.boolean(),
  readAt: z.string().nullable(),
  walletId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type NotificationItem = z.infer<typeof notificationSchema>;

// ── Notification list ──────────────────────────────────────────────────────

export const notificationListSchema = z.object({
  notifications: z.array(notificationSchema),
  unreadCount: z.number().int().nonnegative(),
});

export type NotificationList = z.infer<typeof notificationListSchema>;

export class NotificationListApiResponseDto extends createZodDto(
  createApiResponseSchema(notificationListSchema),
) {}

// ── Unread count ───────────────────────────────────────────────────────────

export const unreadCountSchema = z.object({
  count: z.number().int().nonnegative(),
});

export type UnreadCount = z.infer<typeof unreadCountSchema>;

export class UnreadCountApiResponseDto extends createZodDto(
  createApiResponseSchema(unreadCountSchema),
) {}

// ── Mark all read result ───────────────────────────────────────────────────

export const markAllReadSchema = z.object({
  updated: z.number().int().nonnegative(),
});

export type MarkAllReadResult = z.infer<typeof markAllReadSchema>;

export class MarkAllReadApiResponseDto extends createZodDto(
  createApiResponseSchema(markAllReadSchema),
) {}

// ── Settings ───────────────────────────────────────────────────────────────

export const notificationSettingsSchema = z.object({
  notificationsEnabled: z.boolean(),
  notificationWindowDays: z.number().int().min(1).max(30),
  lastNotificationCheckAt: z.string().nullable(),
});

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

export class NotificationSettingsApiResponseDto extends createZodDto(
  createApiResponseSchema(notificationSettingsSchema),
) {}

// ── Update settings DTO ────────────────────────────────────────────────────

export const updateNotificationSettingsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  notificationWindowDays: z.number().int().min(1).max(30).optional(),
});

export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;

export class UpdateNotificationSettingsDto extends createZodDto(
  updateNotificationSettingsSchema,
) {}
