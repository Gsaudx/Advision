import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationSeverity } from '@/generated/prisma/enums';
import { PrismaService } from '@/shared/prisma/prisma.service';
import type {
  NotificationList,
  NotificationSettings,
  UpdateNotificationSettingsInput,
  MarkAllReadResult,
} from '../schemas';

const STALE_CHECK_MS = 24 * 60 * 60 * 1000; // 24 horas

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Chamado via fire-and-forget pelos gatilhos nos controllers
  async generateExpiryNotifications(
    advisorId: string,
    options: { forceRefresh?: boolean } = {},
  ): Promise<void> {
    try {
      const { forceRefresh = false } = options;

      // Passo 1 — buscar configurações do assessor
      const user = await this.prisma.user.findUnique({
        where: { id: advisorId },
        select: {
          notificationsEnabled: true,
          notificationWindowDays: true,
          lastNotificationCheckAt: true,
        },
      });

      if (!user) return;

      // Passo 2 — respeitar toggle de desabilitação
      if (!user.notificationsEnabled) return;

      // Passo 3 — stale check: só roda de novo após 24h (gatilhos passivos)
      if (!forceRefresh && user.lastNotificationCheckAt) {
        const ageMs = Date.now() - user.lastNotificationCheckAt.getTime();
        if (ageMs < STALE_CHECK_MS) return;
      }

      // Passo 4 — calcular janela de datas
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + user.notificationWindowDays);

      // Passo 5 — buscar clientes do assessor
      const clients = await this.prisma.client.findMany({
        where: { advisorId },
        select: { id: true, name: true },
      });

      if (clients.length === 0) {
        await this.updateLastCheck(advisorId);
        return;
      }

      const clientIds = clients.map((c) => c.id);
      const clientMap = new Map(clients.map((c) => [c.id, c.name]));

      // Passo 6 — buscar carteiras dos clientes
      const wallets = await this.prisma.wallet.findMany({
        where: { clientId: { in: clientIds } },
        select: { id: true, name: true, clientId: true },
      });

      if (wallets.length > 0) {
        const walletIds = wallets.map((w) => w.id);
        const walletMap = new Map(
          wallets.map((w) => [w.id, { name: w.name, clientId: w.clientId }]),
        );

        // Passo 7 — buscar posições de opções na janela (inclui vencidas = critical)
        const positions = await this.prisma.position.findMany({
          where: {
            walletId: { in: walletIds },
            quantity: { not: 0 },
            asset: {
              type: 'OPTION',
              optionDetail: {
                expirationDate: { lte: endDate },
              },
            },
          },
          include: {
            asset: { include: { optionDetail: true } },
          },
        });

        const SEVERITY_ORDER: Record<string, number> = {
          INFO: 0,
          WARNING: 1,
          CRITICAL: 2,
        };

        // Passo 8 — upsert de notificação por posição
        for (const position of positions) {
          const optionDetail = position.asset.optionDetail!;
          const expirationDate = new Date(optionDetail.expirationDate);
          expirationDate.setHours(0, 0, 0, 0);
          const daysUntilExpiry = Math.ceil(
            (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          );

          const severity = this.calculateSeverity(
            daysUntilExpiry,
            user.notificationWindowDays,
          );
          const message = this.buildMessage(
            position,
            daysUntilExpiry,
            clientMap,
            walletMap,
          );

          // Verifica se houve escalona de severidade para resetar isRead
          const existing = await this.prisma.notification.findUnique({
            where: {
              advisorId_type_relatedEntityId: {
                advisorId,
                type: 'OPTION_EXPIRY',
                relatedEntityId: position.id,
              },
            },
            select: { severity: true, isRead: true },
          });

          const severityEscalated =
            existing?.isRead &&
            SEVERITY_ORDER[severity] > SEVERITY_ORDER[existing.severity];

          await this.prisma.notification.upsert({
            where: {
              advisorId_type_relatedEntityId: {
                advisorId,
                type: 'OPTION_EXPIRY',
                relatedEntityId: position.id,
              },
            },
            update: {
              severity,
              message,
              ...(severityEscalated ? { isRead: false, readAt: null } : {}),
            },
            create: {
              advisorId,
              type: 'OPTION_EXPIRY',
              relatedEntityId: position.id,
              severity,
              message,
              walletId: position.walletId,
              isRead: false,
            },
          });
        }
      }

      // Passo 9 — atualizar timestamp do stale check
      await this.updateLastCheck(advisorId);
    } catch (err) {
      this.logger.error(
        `[NOTIF] Erro ao gerar notificações para ${advisorId}`,
        err,
      );
    }
  }

  // Listagem: não lidas + lidas nas últimas 24h
  async getNotifications(advisorId: string): Promise<NotificationList> {
    const since = new Date(Date.now() - STALE_CHECK_MS);

    const notifications = await this.prisma.notification.findMany({
      where: {
        advisorId,
        OR: [
          { isRead: false },
          { isRead: true, readAt: { gte: since } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type as 'OPTION_EXPIRY',
        severity: n.severity as 'INFO' | 'WARNING' | 'CRITICAL',
        message: n.message,
        isRead: n.isRead,
        readAt: n.readAt?.toISOString() ?? null,
        walletId: n.walletId ?? null,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      unreadCount,
    };
  }

  // Contagem de não lidas
  async getUnreadCount(advisorId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { advisorId, isRead: false },
    });
  }

  // Marcar uma notificação como lida
  async markAsRead(advisorId: string, notificationId: string): Promise<void> {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, advisorId },
      data: { isRead: true, readAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Notificação não encontrada');
  }

  // Marcar todas como lidas
  async markAllAsRead(advisorId: string): Promise<MarkAllReadResult> {
    const result = await this.prisma.notification.updateMany({
      where: { advisorId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  // Obter configurações
  async getSettings(advisorId: string): Promise<NotificationSettings> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: advisorId },
      select: {
        notificationsEnabled: true,
        notificationWindowDays: true,
        lastNotificationCheckAt: true,
      },
    });
    return {
      notificationsEnabled: user.notificationsEnabled,
      notificationWindowDays: user.notificationWindowDays,
      lastNotificationCheckAt:
        user.lastNotificationCheckAt?.toISOString() ?? null,
    };
  }

  // Atualizar configurações + forçar reprocessamento
  async updateSettings(
    advisorId: string,
    dto: UpdateNotificationSettingsInput,
  ): Promise<NotificationSettings> {
    await this.prisma.user.update({
      where: { id: advisorId },
      data: { ...dto, lastNotificationCheckAt: null },
    });

    void this.generateExpiryNotifications(advisorId, { forceRefresh: true });

    return this.getSettings(advisorId);
  }

  // ── Helpers privados ─────────────────────────────────────────────────────

  private calculateSeverity(
    daysUntilExpiry: number,
    windowDays: number,
  ): NotificationSeverity {
    const pct20 = windowDays * 0.2;
    const pct50 = windowDays * 0.5;
    if (daysUntilExpiry <= 0 || daysUntilExpiry < pct20)
      return NotificationSeverity.CRITICAL;
    if (daysUntilExpiry <= pct50) return NotificationSeverity.WARNING;
    return NotificationSeverity.INFO;
  }

  private buildMessage(
    position: {
      walletId: string;
      quantity: unknown;
      asset: {
        ticker: string;
        optionDetail: {
          strikePrice: unknown;
          optionType: string;
          expirationDate: Date;
        } | null;
      };
    },
    daysUntilExpiry: number,
    clientMap: Map<string, string>,
    walletMap: Map<string, { name: string; clientId: string }>,
  ): string {
    const optionDetail = position.asset.optionDetail!;
    const ticker = position.asset.ticker;
    const quantity = Math.abs(Number(position.quantity));
    const strike = Number(optionDetail.strikePrice).toFixed(2);
    const optType = optionDetail.optionType;
    const isShort = Number(position.quantity) < 0;
    const direction = isShort ? 'vendida' : 'comprada';
    const walletInfo = walletMap.get(position.walletId);
    const clientName = walletInfo
      ? (clientMap.get(walletInfo.clientId) ?? 'Desconhecido')
      : 'Desconhecido';
    const walletName = walletInfo?.name ?? 'Desconhecida';
    const expDate = new Date(optionDetail.expirationDate).toLocaleDateString(
      'pt-BR',
    );

    if (daysUntilExpiry <= 0) {
      return `Opção ${ticker} (${quantity} contratos ${optType}, strike R$ ${strike}) — ${direction} — da carteira ${walletName} do cliente ${clientName} está VENCIDA (${expDate}).`;
    }
    const daysStr =
      daysUntilExpiry === 1 ? '1 dia' : `${daysUntilExpiry} dias`;
    return `Opção ${ticker} (${quantity} contratos ${optType}, strike R$ ${strike}) — ${direction} — da carteira ${walletName} do cliente ${clientName} vence em ${daysStr} (${expDate}).`;
  }

  private async updateLastCheck(advisorId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: advisorId },
      data: { lastNotificationCheckAt: new Date() },
    });
  }
}
