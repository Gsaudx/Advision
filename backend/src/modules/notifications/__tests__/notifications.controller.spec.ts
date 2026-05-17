import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../controllers/notifications.controller';
import { NotificationsService } from '../services/notifications.service';
import type { CurrentUserData } from '@/common/decorators';

const mockUser: CurrentUserData = {
  id: 'advisor-uuid-123',
  email: 'advisor@test.com',
  role: 'ADVISOR',
};

const mockNotification = {
  id: 'notif-1',
  type: 'OPTION_EXPIRY' as const,
  severity: 'WARNING' as const,
  message: 'Opção PETR4 vence em 3 dias',
  isRead: false,
  readAt: null,
  walletId: 'wallet-1',
  createdAt: '2026-05-17T00:00:00.000Z',
  updatedAt: '2026-05-17T00:00:00.000Z',
};

const mockSettings = {
  notificationsEnabled: true,
  notificationWindowDays: 7,
  lastNotificationCheckAt: null,
};

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: {
    getNotifications: jest.Mock;
    getUnreadCount: jest.Mock;
    markAsRead: jest.Mock;
    markAllAsRead: jest.Mock;
    getSettings: jest.Mock;
    updateSettings: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getNotifications: jest.fn(),
      getUnreadCount: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: service }],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    jest.clearAllMocks();
  });

  // ── GET /notifications ────────────────────────────────────────────────────

  describe('getNotifications', () => {
    it('returns notification list with unreadCount', async () => {
      const payload = { notifications: [mockNotification], unreadCount: 1 };
      service.getNotifications.mockResolvedValue(payload);

      const result = await controller.getNotifications(mockUser);

      expect(service.getNotifications).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ success: true, data: payload });
    });

    it('returns empty list when there are no notifications', async () => {
      service.getNotifications.mockResolvedValue({ notifications: [], unreadCount: 0 });

      const result = await controller.getNotifications(mockUser);

      expect(result.data!.notifications).toHaveLength(0);
      expect(result.data!.unreadCount).toBe(0);
    });
  });

  // ── GET /notifications/unread-count ──────────────────────────────────────

  describe('getUnreadCount', () => {
    it('returns count wrapped in data object', async () => {
      service.getUnreadCount.mockResolvedValue(4);

      const result = await controller.getUnreadCount(mockUser);

      expect(service.getUnreadCount).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ success: true, data: { count: 4 } });
    });

    it('returns count = 0 when no unread', async () => {
      service.getUnreadCount.mockResolvedValue(0);

      const result = await controller.getUnreadCount(mockUser);

      expect(result.data!.count).toBe(0);
    });
  });

  // ── PATCH /notifications/read-all ────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('calls service and returns updated count', async () => {
      service.markAllAsRead.mockResolvedValue({ updated: 3 });

      const result = await controller.markAllAsRead(mockUser);

      expect(service.markAllAsRead).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ success: true, data: { updated: 3 } });
    });

    it('returns updated = 0 when nothing was unread', async () => {
      service.markAllAsRead.mockResolvedValue({ updated: 0 });

      const result = await controller.markAllAsRead(mockUser);

      expect(result.data!.updated).toBe(0);
    });
  });

  // ── PATCH /notifications/:id/read ────────────────────────────────────────

  describe('markAsRead', () => {
    it('marks one notification as read and returns null data', async () => {
      service.markAsRead.mockResolvedValue(undefined);

      const result = await controller.markAsRead('notif-1', mockUser);

      expect(service.markAsRead).toHaveBeenCalledWith(mockUser.id, 'notif-1');
      expect(result).toEqual({ success: true, data: null });
    });

    it('passes advisorId to service to prevent IDOR', async () => {
      service.markAsRead.mockResolvedValue(undefined);

      await controller.markAsRead('notif-1', mockUser);

      expect(service.markAsRead).toHaveBeenCalledWith(
        mockUser.id,
        'notif-1',
      );
    });
  });

  // ── GET /notifications/settings ──────────────────────────────────────────

  describe('getSettings', () => {
    it('returns current notification settings', async () => {
      service.getSettings.mockResolvedValue(mockSettings);

      const result = await controller.getSettings(mockUser);

      expect(service.getSettings).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ success: true, data: mockSettings });
    });
  });

  // ── PUT /notifications/settings ──────────────────────────────────────────

  describe('updateSettings', () => {
    it('updates settings and returns updated values', async () => {
      const updated = { ...mockSettings, notificationWindowDays: 14 };
      service.updateSettings.mockResolvedValue(updated);

      const result = await controller.updateSettings(
        { notificationWindowDays: 14 },
        mockUser,
      );

      expect(service.updateSettings).toHaveBeenCalledWith(mockUser.id, {
        notificationWindowDays: 14,
      });
      expect(result).toEqual({ success: true, data: updated });
    });

    it('can disable notifications via toggle', async () => {
      const updated = { ...mockSettings, notificationsEnabled: false };
      service.updateSettings.mockResolvedValue(updated);

      const result = await controller.updateSettings(
        { notificationsEnabled: false },
        mockUser,
      );

      expect(service.updateSettings).toHaveBeenCalledWith(mockUser.id, {
        notificationsEnabled: false,
      });
      expect(result.data!.notificationsEnabled).toBe(false);
    });
  });
});
