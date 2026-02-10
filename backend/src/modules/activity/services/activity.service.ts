import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import type {
  ActivityList,
  ActivityItem,
  AdvisorMetrics,
  ClientProfile,
  PaginatedActivity,
} from '../schemas';

/**
 * Human-readable action labels for event types
 */
const EVENT_LABELS: Record<string, string> = {
  // Wallet events
  WalletCreated: 'Nova carteira criada',
  CashDeposited: 'Depósito realizado',
  CashWithdrawn: 'Saque realizado',
  PositionOpened: 'Nova posição aberta',
  PositionIncreased: 'Posição aumentada',
  PositionDecreased: 'Posição reduzida',
  PositionClosed: 'Posição encerrada',
  // Client events
  ClientCreated: 'Cliente cadastrado',
  ClientUpdated: 'Cliente atualizado',
  ClientDeleted: 'Cliente removido',
  InviteSent: 'Convite enviado',
  InviteAccepted: 'Convite aceito',
  InviteRevoked: 'Convite revogado',
  UserLinked: 'Usuario vinculado',
  // Optimization events
  OptimizationRunCreated: 'Otimizacao iniciada',
  OptimizationRunAccepted: 'Otimizacao aceita',
  RebalanceExecuted: 'Rebalanceamento executado',
};

/**
 * Get human-readable description from event payload
 */
function getDescription(eventType: string, payload: unknown): string {
  const p = payload as Record<string, string | number | null>;

  switch (eventType) {
    case 'WalletCreated':
      return `Carteira "${String(p.name)}" criada`;
    case 'CashDeposited':
      return `Deposito de R$ ${Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    case 'CashWithdrawn':
      return `Saque de R$ ${Number(p.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    case 'PositionOpened':
      return `Compra de ${String(p.quantity)} ${String(p.ticker)}`;
    case 'PositionIncreased':
      return `Aumento de ${String(p.addedQuantity)} ${String(p.ticker)}`;
    case 'PositionDecreased':
      return `Venda de ${String(p.soldQuantity)} ${String(p.ticker)}`;
    case 'PositionClosed':
      return `Encerramento de ${String(p.ticker)}`;
    case 'ClientCreated':
      return `Cliente "${String(p.name)}" cadastrado`;
    case 'ClientUpdated':
      return 'Dados do cliente atualizados';
    case 'ClientDeleted':
      return `Cliente "${String(p.name)}" removido`;
    case 'InviteSent':
      return 'Convite de acesso enviado';
    case 'InviteAccepted':
      return 'Convite aceito pelo cliente';
    case 'InviteRevoked':
      return 'Convite de acesso revogado';
    default:
      return EVENT_LABELS[eventType] || eventType;
  }
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get recent activity for an advisor (all their clients' events)
   */
  async getAdvisorActivity(
    advisorId: string,
    limit = 10,
  ): Promise<ActivityList> {
    // Get all client IDs for this advisor
    const clients = await this.prisma.client.findMany({
      where: { advisorId },
      select: { id: true, name: true },
    });

    const clientIds = clients.map((c) => c.id);
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));

    // Get wallet IDs for these clients
    const wallets = await this.prisma.wallet.findMany({
      where: { clientId: { in: clientIds } },
      select: { id: true, name: true, clientId: true },
    });

    const walletIds = wallets.map((w) => w.id);
    const walletMap = new Map(wallets.map((w) => [w.id, w]));

    // Fetch recent events for these aggregates
    const events = await this.prisma.domainEvent.findMany({
      where: {
        OR: [
          { aggregateType: 'CLIENT', aggregateId: { in: clientIds } },
          { aggregateType: 'WALLET', aggregateId: { in: walletIds } },
        ],
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });

    return events.map((event): ActivityItem => {
      let clientName: string | null = null;
      let walletName: string | null = null;

      if (event.aggregateType === 'CLIENT') {
        clientName = clientMap.get(event.aggregateId) || null;
      } else if (event.aggregateType === 'WALLET') {
        const wallet = walletMap.get(event.aggregateId);
        if (wallet) {
          walletName = wallet.name;
          clientName = clientMap.get(wallet.clientId) || null;
        }
      }

      return {
        id: event.id,
        action: EVENT_LABELS[event.eventType] || event.eventType,
        description: getDescription(event.eventType, event.payload),
        clientName,
        walletName,
        occurredAt: event.occurredAt.toISOString(),
        aggregateType: event.aggregateType,
        eventType: event.eventType,
      };
    });
  }

  /**
   * Get recent activity for a client (only their own events)
   */
  async getClientActivity(clientId: string, limit = 10): Promise<ActivityList> {
    // Get client info
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true },
    });

    // Get wallet IDs for this client
    const wallets = await this.prisma.wallet.findMany({
      where: { clientId },
      select: { id: true, name: true },
    });

    const walletIds = wallets.map((w) => w.id);
    const walletMap = new Map(wallets.map((w) => [w.id, w.name]));

    // Fetch recent events for this client's aggregates
    const events = await this.prisma.domainEvent.findMany({
      where: {
        OR: [
          { aggregateType: 'CLIENT', aggregateId: clientId },
          { aggregateType: 'WALLET', aggregateId: { in: walletIds } },
        ],
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });

    return events.map((event): ActivityItem => {
      let walletName: string | null = null;

      if (event.aggregateType === 'WALLET') {
        walletName = walletMap.get(event.aggregateId) || null;
      }

      return {
        id: event.id,
        action: EVENT_LABELS[event.eventType] || event.eventType,
        description: getDescription(event.eventType, event.payload),
        clientName: client?.name || null,
        walletName,
        occurredAt: event.occurredAt.toISOString(),
        aggregateType: event.aggregateType,
        eventType: event.eventType,
      };
    });
  }

  /**
   * Get dashboard metrics for an advisor
   */
  async getAdvisorMetrics(advisorId: string): Promise<AdvisorMetrics> {
    // Count clients
    const clientCount = await this.prisma.client.count({
      where: { advisorId },
    });

    // Get all wallets for advisor's clients and sum cash balances
    const wallets = await this.prisma.wallet.findMany({
      where: {
        client: { advisorId },
      },
      select: {
        cashBalance: true,
      },
    });

    const totalCashBalance = wallets.reduce(
      (sum, w) => sum + Number(w.cashBalance),
      0,
    );

    return {
      clientCount,
      totalWalletValue: totalCashBalance,
    };
  }

  /**
   * Get client profile info including advisor name
   */
  async getClientProfile(userId: string): Promise<ClientProfile | null> {
    const client = await this.prisma.client.findUnique({
      where: { userId },
      include: {
        advisor: {
          select: { id: true, name: true },
        },
      },
    });

    if (!client) {
      return null;
    }

    return {
      clientId: client.id,
      clientName: client.name,
      advisorId: client.advisor.id,
      advisorName: client.advisor.name,
    };
  }

  /**
   * Get paginated activity for an advisor (all their clients' events)
   */
  async getAdvisorActivityPaginated(
    advisorId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedActivity> {
    // Get all client IDs for this advisor
    const clients = await this.prisma.client.findMany({
      where: { advisorId },
      select: { id: true, name: true },
    });

    const clientIds = clients.map((c) => c.id);
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));

    // Get wallet IDs for these clients
    const wallets = await this.prisma.wallet.findMany({
      where: { clientId: { in: clientIds } },
      select: { id: true, name: true, clientId: true },
    });

    const walletIds = wallets.map((w) => w.id);
    const walletMap = new Map(wallets.map((w) => [w.id, w]));

    // Build where clause
    const whereClause = {
      OR: [
        { aggregateType: 'CLIENT' as const, aggregateId: { in: clientIds } },
        { aggregateType: 'WALLET' as const, aggregateId: { in: walletIds } },
      ],
    };

    // Get total count
    const total = await this.prisma.domainEvent.count({
      where: whereClause,
    });

    // Fetch paginated events
    const events = await this.prisma.domainEvent.findMany({
      where: whereClause,
      orderBy: { occurredAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const items = events.map((event): ActivityItem => {
      let clientName: string | null = null;
      let walletName: string | null = null;

      if (event.aggregateType === 'CLIENT') {
        clientName = clientMap.get(event.aggregateId) || null;
      } else if (event.aggregateType === 'WALLET') {
        const wallet = walletMap.get(event.aggregateId);
        if (wallet) {
          walletName = wallet.name;
          clientName = clientMap.get(wallet.clientId) || null;
        }
      }

      return {
        id: event.id,
        action: EVENT_LABELS[event.eventType] || event.eventType,
        description: getDescription(event.eventType, event.payload),
        clientName,
        walletName,
        occurredAt: event.occurredAt.toISOString(),
        aggregateType: event.aggregateType,
        eventType: event.eventType,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get paginated activity for a client (only their own events)
   */
  async getClientActivityPaginated(
    clientId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedActivity> {
    // Get client info
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true },
    });

    // Get wallet IDs for this client
    const wallets = await this.prisma.wallet.findMany({
      where: { clientId },
      select: { id: true, name: true },
    });

    const walletIds = wallets.map((w) => w.id);
    const walletMap = new Map(wallets.map((w) => [w.id, w.name]));

    // Build where clause
    const whereClause = {
      OR: [
        { aggregateType: 'CLIENT' as const, aggregateId: clientId },
        { aggregateType: 'WALLET' as const, aggregateId: { in: walletIds } },
      ],
    };

    // Get total count
    const total = await this.prisma.domainEvent.count({
      where: whereClause,
    });

    // Fetch paginated events
    const events = await this.prisma.domainEvent.findMany({
      where: whereClause,
      orderBy: { occurredAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const items = events.map((event): ActivityItem => {
      let walletName: string | null = null;

      if (event.aggregateType === 'WALLET') {
        walletName = walletMap.get(event.aggregateId) || null;
      }

      return {
        id: event.id,
        action: EVENT_LABELS[event.eventType] || event.eventType,
        description: getDescription(event.eventType, event.payload),
        clientName: client?.name || null,
        walletName,
        occurredAt: event.occurredAt.toISOString(),
        aggregateType: event.aggregateType,
        eventType: event.eventType,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
