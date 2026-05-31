import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { NotificationSeverity } from '@/generated/prisma/enums';

const ADVISOR_ID = 'advisor-uuid-123';

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  notificationsEnabled: true,
  notificationWindowDays: 7,
  lastNotificationCheckAt: null as Date | null,
  ...overrides,
});

const makePosition = (daysUntilExpiry: number) => {
  const expDate = new Date();
  expDate.setHours(0, 0, 0, 0);
  expDate.setDate(expDate.getDate() + daysUntilExpiry);

  return {
    id: `pos-${daysUntilExpiry}`,
    walletId: 'wallet-1',
    quantity: 1,
    asset: {
      ticker: `OPT${daysUntilExpiry}`,
      optionDetail: {
        expirationDate: expDate,
        strikePrice: 10,
        optionType: 'CALL',
      },
    },
  };
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    client: { findMany: jest.Mock };
    wallet: { findMany: jest.Mock };
    position: { findMany: jest.Mock };
    notification: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      upsert: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      client: { findMany: jest.fn() },
      wallet: { findMany: jest.fn() },
      position: { findMany: jest.fn() },
      notification: {
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  // ── generateExpiryNotifications ──────────────────────────────────────────

  describe('generateExpiryNotifications', () => {
    it('returns early when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.generateExpiryNotifications(ADVISOR_ID);

      expect(prisma.client.findMany).not.toHaveBeenCalled();
    });

    it('returns early when notificationsEnabled is false', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ notificationsEnabled: false }));

      await service.generateExpiryNotifications(ADVISOR_ID);

      expect(prisma.client.findMany).not.toHaveBeenCalled();
    });

    it('respects stale check: skips when last check < 24h ago', async () => {
      const recentCheck = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ lastNotificationCheckAt: recentCheck }),
      );

      await service.generateExpiryNotifications(ADVISOR_ID);

      expect(prisma.client.findMany).not.toHaveBeenCalled();
    });

    it('bypasses stale check when forceRefresh is true', async () => {
      const recentCheck = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ lastNotificationCheckAt: recentCheck }),
      );
      prisma.client.findMany.mockResolvedValue([]);
      prisma.user.update.mockResolvedValue({});

      await service.generateExpiryNotifications(ADVISOR_ID, { forceRefresh: true });

      expect(prisma.client.findMany).toHaveBeenCalled();
    });

    it('runs when lastNotificationCheckAt is null regardless of forceRefresh', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ lastNotificationCheckAt: null }));
      prisma.client.findMany.mockResolvedValue([]);
      prisma.user.update.mockResolvedValue({});

      await service.generateExpiryNotifications(ADVISOR_ID);

      expect(prisma.client.findMany).toHaveBeenCalled();
    });

    it('runs when lastNotificationCheckAt is older than 24h', async () => {
      const oldCheck = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ lastNotificationCheckAt: oldCheck }),
      );
      prisma.client.findMany.mockResolvedValue([]);
      prisma.user.update.mockResolvedValue({});

      await service.generateExpiryNotifications(ADVISOR_ID);

      expect(prisma.client.findMany).toHaveBeenCalled();
    });

    it('updates lastNotificationCheckAt and returns early when no clients', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.client.findMany.mockResolvedValue([]);
      prisma.user.update.mockResolvedValue({});

      await service.generateExpiryNotifications(ADVISOR_ID);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: ADVISOR_ID },
        data: { lastNotificationCheckAt: expect.any(Date) },
      });
      expect(prisma.wallet.findMany).not.toHaveBeenCalled();
    });

    it('upserts one notification per position in window', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.client.findMany.mockResolvedValue([
        { id: 'client-1', name: 'Cliente A' },
      ]);
      prisma.wallet.findMany.mockResolvedValue([
        { id: 'wallet-1', name: 'Carteira 1', clientId: 'client-1' },
      ]);
      prisma.position.findMany.mockResolvedValue([
        makePosition(1),
        makePosition(4),
      ]);
      prisma.notification.upsert.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});

      await service.generateExpiryNotifications(ADVISOR_ID);

      expect(prisma.notification.upsert).toHaveBeenCalledTimes(2);
    });

    it('resets isRead when severity escalates on an already-read notification', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.client.findMany.mockResolvedValue([{ id: 'client-1', name: 'C' }]);
      prisma.wallet.findMany.mockResolvedValue([
        { id: 'wallet-1', name: 'W', clientId: 'client-1' },
      ]);
      prisma.position.findMany.mockResolvedValue([makePosition(1)]); // 1d → CRITICAL
      // Existing notification was INFO (severity 0) and already read
      prisma.notification.findUnique.mockResolvedValue({ severity: 'INFO', isRead: true });
      prisma.notification.upsert.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});

      await service.generateExpiryNotifications(ADVISOR_ID);

      expect(prisma.notification.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ isRead: false, readAt: null }),
        }),
      );
    });

    it('does not reset isRead when severity stays the same', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.client.findMany.mockResolvedValue([{ id: 'client-1', name: 'C' }]);
      prisma.wallet.findMany.mockResolvedValue([
        { id: 'wallet-1', name: 'W', clientId: 'client-1' },
      ]);
      prisma.position.findMany.mockResolvedValue([makePosition(1)]); // CRITICAL
      prisma.notification.findUnique.mockResolvedValue({ severity: 'CRITICAL', isRead: true });
      prisma.notification.upsert.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});

      await service.generateExpiryNotifications(ADVISOR_ID);

      const upsertCall = prisma.notification.upsert.mock.calls[0][0];
      expect(upsertCall.update).not.toHaveProperty('isRead');
    });

    it('does not upsert when there are no positions in window', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.client.findMany.mockResolvedValue([{ id: 'client-1', name: 'C' }]);
      prisma.wallet.findMany.mockResolvedValue([
        { id: 'wallet-1', name: 'W', clientId: 'client-1' },
      ]);
      prisma.position.findMany.mockResolvedValue([]);
      prisma.user.update.mockResolvedValue({});

      await service.generateExpiryNotifications(ADVISOR_ID);

      expect(prisma.notification.upsert).not.toHaveBeenCalled();
    });

    it('updates lastNotificationCheckAt after processing', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.client.findMany.mockResolvedValue([{ id: 'c1', name: 'C' }]);
      prisma.wallet.findMany.mockResolvedValue([
        { id: 'w1', name: 'W', clientId: 'c1' },
      ]);
      prisma.position.findMany.mockResolvedValue([makePosition(3)]);
      prisma.notification.upsert.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({});

      await service.generateExpiryNotifications(ADVISOR_ID);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: ADVISOR_ID },
        data: { lastNotificationCheckAt: expect.any(Date) },
      });
    });
  });

  // ── calculateSeverity ────────────────────────────────────────────────────

  describe('calculateSeverity (via private accessor)', () => {
    const calc = (days: number, window: number): NotificationSeverity =>
      (service as unknown as { calculateSeverity(d: number, w: number): NotificationSeverity })
        .calculateSeverity(days, window);

    it('returns CRITICAL for expired option (days <= 0)', () => {
      expect(calc(0, 7)).toBe(NotificationSeverity.CRITICAL);
      expect(calc(-1, 7)).toBe(NotificationSeverity.CRITICAL);
    });

    it('returns CRITICAL when days < 20% of window', () => {
      // 7d window → pct20 = 1.4d → days=1 < 1.4 → CRITICAL
      expect(calc(1, 7)).toBe(NotificationSeverity.CRITICAL);
    });

    it('returns WARNING when days between 20% and 50% of window', () => {
      // 7d window → pct50 = 3.5d → days=3 ≤ 3.5 and days ≥ 1.4 → WARNING
      expect(calc(3, 7)).toBe(NotificationSeverity.WARNING);
    });

    it('returns INFO when days > 50% of window', () => {
      // 7d window → days=4 > 3.5 → INFO
      expect(calc(4, 7)).toBe(NotificationSeverity.INFO);
      expect(calc(7, 7)).toBe(NotificationSeverity.INFO);
    });

    it('re-proportions correctly with 14d window', () => {
      // 14d window → pct20=2.8, pct50=7
      expect(calc(2, 14)).toBe(NotificationSeverity.CRITICAL);  // 2 < 2.8
      expect(calc(5, 14)).toBe(NotificationSeverity.WARNING);   // 2.8 ≤ 5 ≤ 7
      expect(calc(10, 14)).toBe(NotificationSeverity.INFO);     // 10 > 7
    });
  });

  // ── getNotifications ─────────────────────────────────────────────────────

  describe('getNotifications', () => {
    it('returns notifications list and unreadCount', async () => {
      const mockNotification = {
        id: 'notif-1',
        type: 'OPTION_EXPIRY',
        severity: 'WARNING',
        message: 'Test message',
        isRead: false,
        readAt: null,
        walletId: 'wallet-1',
        createdAt: new Date('2026-05-17'),
        updatedAt: new Date('2026-05-17'),
      };

      prisma.notification.findMany.mockResolvedValue([mockNotification]);

      const result = await service.getNotifications(ADVISOR_ID);

      expect(result.unreadCount).toBe(1);
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].id).toBe('notif-1');
      expect(result.notifications[0].isRead).toBe(false);
    });

    it('returns unreadCount = 0 when all are read', async () => {
      prisma.notification.findMany.mockResolvedValue([
        { id: 'n1', type: 'OPTION_EXPIRY', severity: 'INFO', message: 'msg', isRead: true, readAt: new Date(), walletId: null, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const result = await service.getNotifications(ADVISOR_ID);

      expect(result.unreadCount).toBe(0);
      expect(result.notifications[0].isRead).toBe(true);
    });
  });

  // ── getUnreadCount ────────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('returns count of unread notifications', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount(ADVISOR_ID);

      expect(result).toBe(3);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { advisorId: ADVISOR_ID, isRead: false },
      });
    });
  });

  // ── markAsRead ────────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('updates isRead and readAt for the given notification', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead(ADVISOR_ID, 'notif-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', advisorId: ADVISOR_ID },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });

    it('throws NotFoundException when notification does not exist or belongs to another advisor', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.markAsRead(ADVISOR_ID, 'notif-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('filters by advisorId to prevent IDOR', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead('other-advisor', 'notif-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'notif-1', advisorId: 'other-advisor' },
        }),
      );
    });
  });

  // ── markAllAsRead ─────────────────────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read and returns updated count', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead(ADVISOR_ID);

      expect(result).toEqual({ updated: 5 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { advisorId: ADVISOR_ID, isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });
  });

  // ── getSettings ───────────────────────────────────────────────────────────

  describe('getSettings', () => {
    it('returns notification settings for advisor', async () => {
      prisma.user.findUnique = jest.fn().mockResolvedValue({
        notificationsEnabled: true,
        notificationWindowDays: 14,
        lastNotificationCheckAt: new Date('2026-05-17'),
      });
      // findUniqueOrThrow is used by getSettings
      (prisma.user as unknown as { findUniqueOrThrow: jest.Mock }).findUniqueOrThrow =
        jest.fn().mockResolvedValue({
          notificationsEnabled: true,
          notificationWindowDays: 14,
          lastNotificationCheckAt: new Date('2026-05-17'),
        });

      const result = await service.getSettings(ADVISOR_ID);

      expect(result.notificationsEnabled).toBe(true);
      expect(result.notificationWindowDays).toBe(14);
      expect(result.lastNotificationCheckAt).toBe('2026-05-17T00:00:00.000Z');
    });
  });

  // ── updateSettings ────────────────────────────────────────────────────────

  describe('updateSettings', () => {
    it('resets lastNotificationCheckAt and fires generateExpiry', async () => {
      prisma.user.update.mockResolvedValue({});
      (prisma.user as unknown as { findUniqueOrThrow: jest.Mock }).findUniqueOrThrow =
        jest.fn().mockResolvedValue({
          notificationsEnabled: true,
          notificationWindowDays: 14,
          lastNotificationCheckAt: null,
        });
      // generateExpiryNotifications will re-read user
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ notificationWindowDays: 14, lastNotificationCheckAt: null }),
      );
      prisma.client.findMany.mockResolvedValue([]);

      await service.updateSettings(ADVISOR_ID, { notificationWindowDays: 14 });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: ADVISOR_ID },
        data: expect.objectContaining({
          notificationWindowDays: 14,
          lastNotificationCheckAt: null,
        }),
      });
    });
  });
});
