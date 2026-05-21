import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { PendingActionsResponse, PendingActionItem } from '../schemas/analytics-response.schema';

@Injectable()
export class PendingActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
  ) {}

  async getPendingActions(advisorId: string): Promise<PendingActionsResponse> {
    const key = this.cache.buildKey(advisorId, 'pending-actions', {});
    const cached = this.cache.get<PendingActionsResponse>(key);
    if (cached) return cached;

    const items: PendingActionItem[] = [];
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Fonte 1: notificações de vencimento não lidas
    const notifications = await this.prisma.notification.findMany({
      where: {
        advisorId,
        isRead: false,
        severity: { in: ['CRITICAL', 'WARNING'] },
        type: 'OPTION_EXPIRY',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Buscar nomes de cliente para walletIds presentes nas notificações
    const notifWalletIds = [...new Set(notifications.map((n) => n.walletId).filter(Boolean) as string[])];
    const notifWallets = notifWalletIds.length
      ? await this.prisma.wallet.findMany({
          where: { id: { in: notifWalletIds } },
          select: { id: true, client: { select: { name: true } } },
        })
      : [];
    const walletClientMap = new Map(notifWallets.map((w) => [w.id, w.client.name]));

    for (const n of notifications) {
      items.push({
        type: 'OPTION_EXPIRY',
        severity: n.severity === 'CRITICAL' ? 'critical' : 'warning',
        description: n.message,
        linkTo: n.walletId ? `/wallets/${n.walletId}` : '/wallets',
        clientName: (n.walletId ? walletClientMap.get(n.walletId) : undefined) ?? 'Cliente desconhecido',
        walletId: n.walletId ?? null,
      });
    }

    // Fonte 2: carteiras sem operação há > 90 dias
    const walletIds = await this.prisma.wallet.findMany({
      where: { client: { advisorId } },
      select: { id: true, client: { select: { name: true, id: true } } },
    });

    for (const wallet of walletIds) {
      const lastTx = await this.prisma.transaction.findFirst({
        where: { walletId: wallet.id },
        orderBy: { executedAt: 'desc' },
        select: { executedAt: true },
      });
      if (!lastTx || lastTx.executedAt < ninetyDaysAgo) {
        items.push({
          type: 'INACTIVE_CLIENT',
          severity: 'warning',
          description: `Cliente sem operação há mais de 90 dias`,
          linkTo: `/clients/${wallet.client.id}`,
          clientName: wallet.client.name,
          walletId: wallet.id,
        });
      }
    }

    // critical primeiro, depois warning
    items.sort((a, b) => {
      if (a.severity === b.severity) return 0;
      return a.severity === 'critical' ? -1 : 1;
    });

    const result: PendingActionsResponse = { items };
    this.cache.set(key, result);
    return result;
  }
}
