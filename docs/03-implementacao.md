# FASE 3 — Checklist de Implementação

> **Status:** ENTREGUE
> **Data:** 2026-05-19
> **Inputs lidos:** `PROGRESS.md` + `02-planejamento.md`
> **Output:** este arquivo

---

## Regras obrigatórias (valer para toda a Fase 4)

- Nunca deletar código existente — comentar com `// [ANALYTICS]`
- `advisorId` sempre do JWT via `@CurrentUser()`, nunca de query params
- Imports Prisma: `@/generated/prisma/client` (tipos) e `@/generated/prisma/enums` (enums)
- Sem migration de schema — `Asset.sector` já existe
- Commitar ao final de cada bloco concluído

---

## BLOCO 1 — Backend: scaffold base

### ☐ 1.1 — Modificar `WalletsModule` — adicionar exports

**Arquivo:** `backend/src/modules/wallets/wallets.module.ts`

Localizar o array `exports` existente e adicionar ao final:

```typescript
// [ANALYTICS] exports adicionados para o AnalyticsModule
PerformanceService,
CompositeMarketService,
OpLabMarketService,
```

Imports necessários no topo (se não existirem):
```typescript
import { PerformanceService } from './services/performance.service';
import { CompositeMarketService } from './providers/composite-market.service';
import { OpLabMarketService } from './providers/oplab-market.service';
```

**Verificação:** backend compila sem erro (`npx ts-node -e "require('./src/main')"` ou equivalente).

---

### ☐ 1.2 — Adicionar `getHistoricalSeries` ao `OpLabMarketService`

**Arquivo:** `backend/src/modules/wallets/providers/oplab-market.service.ts`

Adicionar método público ao final da classe (antes do `}`):

```typescript
// [ANALYTICS] série histórica diária por ticker — usado em PatrimonyEvolutionService e BenchmarkService
async getHistoricalSeries(
  ticker: string,
  from: string, // "YYYY-MM-DD"
  to: string,   // "YYYY-MM-DD"
): Promise<Array<{ date: string; close: number }>> {
  if (!this.accessToken) return [];
  const data = await this.makeRequest<{ data?: Array<{ time: number; close?: number }> }>(
    `/market/historical/${ticker.toUpperCase()}/1d`,
    { from, to },
  );
  return (data.data ?? [])
    .filter((c) => c.close != null)
    .map((c) => ({
      date: new Date(c.time).toISOString().split('T')[0],
      close: c.close!,
    }));
}
```

**Verificação:** nenhum método existente alterado; blast radius zero.

---

### ☐ 1.3 — Criar pasta e DTOs

**Arquivo a criar:** `backend/src/modules/analytics/schemas/analytics-query.schema.ts`

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AnalyticsModeEnum = z.enum(['CONSOLIDATED', 'DRILLDOWN']);
export const AnalyticsPeriodEnum = z.enum(['1M', '3M', '6M', '1A', 'YTD', 'CUSTOM']);

const BaseQuerySchema = z.object({
  mode: AnalyticsModeEnum.default('CONSOLIDATED'),
  walletId: z.string().uuid().optional(),
}).refine(
  (d) => d.mode !== 'DRILLDOWN' || !!d.walletId,
  { message: 'walletId é obrigatório no modo DRILLDOWN', path: ['walletId'] },
);

const PeriodQuerySchema = BaseQuerySchema.extend({
  period: AnalyticsPeriodEnum.default('1M'),
  from: z.string().optional(),
  to: z.string().optional(),
}).refine(
  (d) => d.period !== 'CUSTOM' || (!!d.from && !!d.to),
  { message: 'from e to são obrigatórios quando period=CUSTOM', path: ['from'] },
);

const EvolutionQuerySchema = z.object({
  period: AnalyticsPeriodEnum.default('1A'),
  from: z.string().optional(),
  to: z.string().optional(),
}).refine(
  (d) => d.period !== 'CUSTOM' || (!!d.from && !!d.to),
  { message: 'from e to são obrigatórios quando period=CUSTOM', path: ['from'] },
);

export class BaseQueryDto extends createZodDto(BaseQuerySchema) {}
export class PeriodQueryDto extends createZodDto(PeriodQuerySchema) {}
export class EvolutionQueryDto extends createZodDto(EvolutionQuerySchema) {}
```

---

### ☐ 1.4 — Criar DTOs de response

**Arquivo a criar:** `backend/src/modules/analytics/schemas/analytics-response.schema.ts`

```typescript
// best-worst-assets
export interface BestWorstAsset {
  ticker: string;
  name: string;
  clientName: string | null;
  walletId: string;
  resultAbsolute: number;
  resultPercent: number;
  currentPrice: number;
  averagePrice: number;
}
export interface BestWorstAssetsResponse {
  topGains: BestWorstAsset[];
  topLosses: BestWorstAsset[];
}

// options-expiry
export interface OptionsExpiryPosition {
  ticker: string;
  walletId: string;
  clientName: string;
  expirationDate: string;
  value: number;
  daysUntilExpiry: number;
}
export interface OptionsExpiryWindow {
  label: string;
  totalValue: number;
  count: number;
  positions: OptionsExpiryPosition[];
}
export interface OptionsExpiryResponse {
  windows: OptionsExpiryWindow[];
}

// pending-actions
export type PendingActionType = 'OPTION_EXPIRY' | 'INACTIVE_CLIENT';
export type PendingActionSeverity = 'critical' | 'warning';
export interface PendingActionItem {
  type: PendingActionType;
  severity: PendingActionSeverity;
  description: string;
  linkTo: string;
  clientName: string;
  walletId: string | null;
}
export interface PendingActionsResponse {
  items: PendingActionItem[];
}

// dividends
export interface DividendsMonthly {
  month: string; // "YYYY-MM"
  total: number;
}
export interface DividendsTopPayer {
  ticker: string;
  name: string;
  total: number;
}
export interface DividendsResponse {
  monthly: DividendsMonthly[];
  topPayers: DividendsTopPayer[];
  totalPeriod: number;
}

// asset-concentration
export interface ConcentrationHolding {
  ticker: string;
  name: string;
  valueR$: number;
  percentBook: number;
  nClients: number;
  gainPercent: number;
  flags: {
    overWeight: boolean;
    overConcentrated: boolean;
  };
}
export interface AssetConcentrationResponse {
  holdings: ConcentrationHolding[];
  totalBookValue: number;
}

// sector-exposure
export interface SectorExposureItem {
  sector: string;
  valueR$: number;
  percent: number;
  assetCount: number;
}
export interface SectorExposureResponse {
  sectors: SectorExposureItem[];
  totalValue: number;
}

// client-ranking
export interface ClientRankingItem {
  clientId: string;
  name: string;
  patrimonioR$: number;
  rentabilidadePercent: number;
  resultadoR$: number;
  lastOperationAt: string | null;
  criticalNotifications: number;
}
export interface ClientRankingResponse {
  clients: ClientRankingItem[];
}

// patrimony-evolution (v2)
export interface PatrimonyDataPoint {
  date: string;
  totalValue: number;
}
export interface PatrimonyEvolutionResponse {
  series: PatrimonyDataPoint[];
  startValue: number;
  endValue: number;
  changePercent: number;
}

// benchmark (v2)
export interface BenchmarkDataPoint {
  date: string;
  portfolioValue: number;
  portfolioPercent: number;
  ibovPercent: number;
}
export interface BenchmarkResponse {
  series: BenchmarkDataPoint[];
  portfolioChangePercent: number;
  ibovChangePercent: number;
}
```

---

### ☐ 1.5 — Criar `AnalyticsCacheService`

**Arquivo a criar:** `backend/src/modules/analytics/cache/analytics-cache.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

@Injectable()
export class AnalyticsCacheService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 5 * 60 * 1000;

  buildKey(
    advisorId: string,
    widget: string,
    params: Record<string, string | undefined>,
  ): string {
    const sortedParams = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `${advisorId}:${widget}:${sortedParams}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set(key: string, data: unknown): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.TTL_MS });
  }

  invalidateAdvisor(advisorId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${advisorId}:`)) {
        this.cache.delete(key);
      }
    }
  }
}
```

---

### ☐ 1.6 — Criar helper de período (utilitário interno)

**Arquivo a criar:** `backend/src/modules/analytics/utils/period.util.ts`

```typescript
// [ANALYTICS] converte enum de período em datas from/to
export function resolvePeriod(
  period: string,
  customFrom?: string,
  customTo?: string,
): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);

  if (period === 'CUSTOM' && customFrom && customTo) {
    return { from: new Date(customFrom), to: new Date(customTo) };
  }

  const from = new Date();
  switch (period) {
    case '1M':  from.setMonth(from.getMonth() - 1); break;
    case '3M':  from.setMonth(from.getMonth() - 3); break;
    case '6M':  from.setMonth(from.getMonth() - 6); break;
    case '1A':  from.setFullYear(from.getFullYear() - 1); break;
    case 'YTD': from.setMonth(0, 1); from.setHours(0, 0, 0, 0); break;
    default:    from.setMonth(from.getMonth() - 1);
  }

  return { from, to };
}

export function formatYYYYMM(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function formatYYYYMMDD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Gera lista de meses "YYYY-MM" entre from e to (inclusive)
export function monthRange(from: Date, to: Date): string[] {
  const months: string[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cur <= end) {
    months.push(formatYYYYMM(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}
```

---

## BLOCO 2 — Backend: services v1

> Ordem: do mais simples ao mais complexo. Cada service segue o padrão:
> 1. Verificar ownership do walletId (modo DRILLDOWN)
> 2. Testar cache → retornar se hit
> 3. Executar lógica
> 4. Armazenar no cache
> 5. Retornar

### ☐ 2.1 — Criar `PendingActionsService`

**Arquivo a criar:** `backend/src/modules/analytics/services/pending-actions.service.ts`

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
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
      include: {
        wallet: { include: { client: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const n of notifications) {
      items.push({
        type: 'OPTION_EXPIRY',
        severity: n.severity === 'CRITICAL' ? 'critical' : 'warning',
        description: n.message,
        linkTo: n.walletId ? `/wallets/${n.walletId}` : '/wallets',
        clientName: n.wallet?.client?.name ?? 'Cliente desconhecido',
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
```

---

### ☐ 2.2 — Criar `DividendsService`

**Arquivo a criar:** `backend/src/modules/analytics/services/dividends.service.ts`

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { DividendsResponse } from '../schemas/analytics-response.schema';
import { resolvePeriod, formatYYYYMM, monthRange } from '../utils/period.util';

@Injectable()
export class DividendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
  ) {}

  async getDividends(
    advisorId: string,
    mode: string,
    walletId: string | undefined,
    period: string,
    customFrom?: string,
    customTo?: string,
  ): Promise<DividendsResponse> {
    const key = this.cache.buildKey(advisorId, 'dividends', { mode, walletId, period, customFrom, customTo });
    const cached = this.cache.get<DividendsResponse>(key);
    if (cached) return cached;

    if (mode === 'DRILLDOWN' && walletId) {
      const owned = await this.prisma.wallet.findFirst({
        where: { id: walletId, client: { advisorId } },
      });
      if (!owned) throw new ForbiddenException();
    }

    const { from, to } = resolvePeriod(period, customFrom, customTo);

    const walletIds = mode === 'DRILLDOWN' && walletId
      ? [walletId]
      : (await this.prisma.wallet.findMany({
          where: { client: { advisorId } },
          select: { id: true },
        })).map((w) => w.id);

    const payments = await this.prisma.walletDividendPayment.findMany({
      where: {
        walletId: { in: walletIds },
        exDividendDate: { gte: from, lte: to },
      },
      include: {
        position: { include: { asset: true } },
      },
    });

    // Agrupamento mensal
    const monthMap = new Map<string, number>();
    for (const p of payments) {
      const month = formatYYYYMM(new Date(p.exDividendDate));
      monthMap.set(month, (monthMap.get(month) ?? 0) + Number(p.totalReceived));
    }

    // Preencher gaps com 0
    const allMonths = monthRange(from, to);
    const monthly = allMonths.map((month) => ({
      month,
      total: monthMap.get(month) ?? 0,
    }));

    // Top payers por ticker
    const tickerMap = new Map<string, { name: string; total: number }>();
    for (const p of payments) {
      const existing = tickerMap.get(p.ticker);
      const name = p.position?.asset?.name ?? p.ticker;
      tickerMap.set(p.ticker, {
        name,
        total: (existing?.total ?? 0) + Number(p.totalReceived),
      });
    }
    const topPayers = [...tickerMap.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([ticker, { name, total }]) => ({ ticker, name, total }));

    const totalPeriod = payments.reduce((s, p) => s + Number(p.totalReceived), 0);

    const result: DividendsResponse = { monthly, topPayers, totalPeriod };
    this.cache.set(key, result);
    return result;
  }
}
```

---

### ☐ 2.3 — Criar `SectorExposureService`

**Arquivo a criar:** `backend/src/modules/analytics/services/sector-exposure.service.ts`

```typescript
import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { SectorExposureResponse } from '../schemas/analytics-response.schema';
import { CompositeMarketService } from '@/modules/wallets/providers/composite-market.service';

@Injectable()
export class SectorExposureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
    private readonly market: CompositeMarketService,
  ) {}

  async getSectorExposure(
    advisorId: string,
    mode: string,
    walletId?: string,
  ): Promise<SectorExposureResponse> {
    const key = this.cache.buildKey(advisorId, 'sectors', { mode, walletId });
    const cached = this.cache.get<SectorExposureResponse>(key);
    if (cached) return cached;

    if (mode === 'DRILLDOWN' && walletId) {
      const owned = await this.prisma.wallet.findFirst({ where: { id: walletId, client: { advisorId } } });
      if (!owned) throw new ForbiddenException();
    }

    const walletIds = mode === 'DRILLDOWN' && walletId
      ? [walletId]
      : (await this.prisma.wallet.findMany({ where: { client: { advisorId } }, select: { id: true } })).map((w) => w.id);

    const positions = await this.prisma.position.findMany({
      where: { walletId: { in: walletIds }, quantity: { gt: 0 } },
      include: { asset: true },
    });

    const tickers = [...new Set(positions.map((p) => p.asset.ticker))];
    const prices = tickers.length ? await this.market.getBatchPrices(tickers) : {};

    const sectorMap = new Map<string, { valueR$: number; assetIds: Set<string> }>();
    let totalValue = 0;

    for (const pos of positions) {
      const price = prices[pos.asset.ticker] ?? Number(pos.averagePrice);
      const value = Number(pos.quantity) * price;
      const sector = pos.asset.sector ?? 'Não classificado';

      const entry = sectorMap.get(sector) ?? { valueR$: 0, assetIds: new Set() };
      entry.valueR$ += value;
      entry.assetIds.add(pos.assetId);
      sectorMap.set(sector, entry);
      totalValue += value;
    }

    const sectors = [...sectorMap.entries()]
      .sort((a, b) => b[1].valueR$ - a[1].valueR$)
      .map(([sector, { valueR$, assetIds }]) => ({
        sector,
        valueR$,
        percent: totalValue > 0 ? (valueR$ / totalValue) * 100 : 0,
        assetCount: assetIds.size,
      }));

    const result: SectorExposureResponse = { sectors, totalValue };
    this.cache.set(key, result);
    return result;
  }
}
```

---

### ☐ 2.4 — Criar `OptionsExpiryService`

**Arquivo a criar:** `backend/src/modules/analytics/services/options-expiry.service.ts`

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { OptionsExpiryResponse, OptionsExpiryWindow } from '../schemas/analytics-response.schema';
import { CompositeMarketService } from '@/modules/wallets/providers/composite-market.service';

const WINDOWS: Array<{ label: string; min: number; max: number }> = [
  { label: '≤ 7d',   min: 0,  max: 7  },
  { label: '8–15d',  min: 8,  max: 15 },
  { label: '16–30d', min: 16, max: 30 },
  { label: '31–60d', min: 31, max: 60 },
  { label: '60+ d',  min: 61, max: Infinity },
];

@Injectable()
export class OptionsExpiryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
    private readonly market: CompositeMarketService,
  ) {}

  async getOptionsExpiry(advisorId: string, mode: string, walletId?: string): Promise<OptionsExpiryResponse> {
    const key = this.cache.buildKey(advisorId, 'options-expiry', { mode, walletId });
    const cached = this.cache.get<OptionsExpiryResponse>(key);
    if (cached) return cached;

    if (mode === 'DRILLDOWN' && walletId) {
      const owned = await this.prisma.wallet.findFirst({ where: { id: walletId, client: { advisorId } } });
      if (!owned) throw new ForbiddenException();
    }

    const walletIds = mode === 'DRILLDOWN' && walletId
      ? [walletId]
      : (await this.prisma.wallet.findMany({ where: { client: { advisorId } }, select: { id: true } })).map((w) => w.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const positions = await this.prisma.position.findMany({
      where: {
        walletId: { in: walletIds },
        quantity: { gt: 0 },
        asset: { type: 'OPTION' },
      },
      include: {
        asset: { include: { optionDetail: true } },
        wallet: { include: { client: true } },
      },
    });

    const futurePositions = positions.filter(
      (p) => p.asset.optionDetail && new Date(p.asset.optionDetail.expirationDate) >= today,
    );

    const tickers = [...new Set(futurePositions.map((p) => p.asset.ticker))];
    const prices = tickers.length ? await this.market.getBatchPrices(tickers) : {};

    const windowMap = new Map<string, OptionsExpiryWindow>(
      WINDOWS.map((w) => [w.label, { label: w.label, totalValue: 0, count: 0, positions: [] }]),
    );

    for (const pos of futurePositions) {
      const expDate = new Date(pos.asset.optionDetail!.expirationDate);
      const days = Math.ceil((expDate.getTime() - today.getTime()) / 86400000);
      const price = prices[pos.asset.ticker] ?? Number(pos.averagePrice);
      const value = Number(pos.quantity) * price;
      const win = WINDOWS.find((w) => days >= w.min && days <= w.max)!;
      const entry = windowMap.get(win.label)!;
      entry.totalValue += value;
      entry.count++;
      entry.positions.push({
        ticker: pos.asset.ticker,
        walletId: pos.walletId,
        clientName: pos.wallet.client.name,
        expirationDate: pos.asset.optionDetail!.expirationDate.toISOString(),
        value,
        daysUntilExpiry: days,
      });
    }

    const windows = [...windowMap.values()].filter((w) => w.count > 0);
    const result: OptionsExpiryResponse = { windows };
    this.cache.set(key, result);
    return result;
  }
}
```

---

### ☐ 2.5 — Criar `ClientRankingService`

**Arquivo a criar:** `backend/src/modules/analytics/services/client-ranking.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { ClientRankingResponse } from '../schemas/analytics-response.schema';
import { PerformanceService } from '@/modules/wallets/services/performance.service';

@Injectable()
export class ClientRankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
    private readonly performance: PerformanceService,
  ) {}

  async getClientRanking(advisorId: string): Promise<ClientRankingResponse> {
    const key = this.cache.buildKey(advisorId, 'client-ranking', {});
    const cached = this.cache.get<ClientRankingResponse>(key);
    if (cached) return cached;

    const clients = await this.prisma.client.findMany({
      where: { advisorId },
      include: { wallets: { select: { id: true } } },
    });

    const items = await Promise.all(
      clients.map(async (client) => {
        const walletIds = client.wallets.map((w) => w.id);

        // Agrega computeTotals de todas as carteiras
        const totalsArr = await Promise.all(
          walletIds.map((id) => this.performance.computeTotals(id)),
        );
        const agg = totalsArr.reduce(
          (acc, t) => ({
            realized: acc.realized + t.realized,
            unrealized: acc.unrealized + t.unrealized,
            dividends: acc.dividends + t.dividends,
            total: acc.total + t.total,
            totalInvested: acc.totalInvested + t.totalInvested,
          }),
          { realized: 0, unrealized: 0, dividends: 0, total: 0, totalInvested: 0 },
        );

        const patrimonioR$ = agg.totalInvested + agg.unrealized;
        const rentabilidadePercent = agg.totalInvested > 0
          ? (agg.total / agg.totalInvested) * 100
          : 0;

        const lastTx = await this.prisma.transaction.findFirst({
          where: { walletId: { in: walletIds } },
          orderBy: { executedAt: 'desc' },
          select: { executedAt: true },
        });

        const criticalNotifications = await this.prisma.notification.count({
          where: {
            advisorId,
            isRead: false,
            severity: 'CRITICAL',
            walletId: { in: walletIds },
          },
        });

        return {
          clientId: client.id,
          name: client.name,
          patrimonioR$,
          rentabilidadePercent,
          resultadoR$: agg.total,
          lastOperationAt: lastTx?.executedAt.toISOString() ?? null,
          criticalNotifications,
        };
      }),
    );

    items.sort((a, b) => b.rentabilidadePercent - a.rentabilidadePercent);

    const result: ClientRankingResponse = { clients: items };
    this.cache.set(key, result);
    return result;
  }
}
```

---

### ☐ 2.6 — Criar `BestWorstAssetsService`

**Arquivo a criar:** `backend/src/modules/analytics/services/best-worst-assets.service.ts`

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { BestWorstAssetsResponse } from '../schemas/analytics-response.schema';
import { CompositeMarketService } from '@/modules/wallets/providers/composite-market.service';

@Injectable()
export class BestWorstAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
    private readonly market: CompositeMarketService,
  ) {}

  async getBestWorstAssets(advisorId: string, mode: string, walletId?: string): Promise<BestWorstAssetsResponse> {
    const key = this.cache.buildKey(advisorId, 'best-worst', { mode, walletId });
    const cached = this.cache.get<BestWorstAssetsResponse>(key);
    if (cached) return cached;

    if (mode === 'DRILLDOWN' && walletId) {
      const owned = await this.prisma.wallet.findFirst({ where: { id: walletId, client: { advisorId } } });
      if (!owned) throw new ForbiddenException();
    }

    const walletIds = mode === 'DRILLDOWN' && walletId
      ? [walletId]
      : (await this.prisma.wallet.findMany({ where: { client: { advisorId } }, select: { id: true } })).map((w) => w.id);

    const positions = await this.prisma.position.findMany({
      where: { walletId: { in: walletIds }, quantity: { gt: 0 } },
      include: {
        asset: true,
        wallet: { include: { client: true } },
      },
    });

    const tickers = [...new Set(positions.map((p) => p.asset.ticker))];
    const prices = tickers.length ? await this.market.getBatchPrices(tickers) : {};

    const entries = positions.map((pos) => {
      const currentPrice = prices[pos.asset.ticker] ?? Number(pos.averagePrice);
      const avgPrice = Number(pos.averagePrice);
      const qty = Number(pos.quantity);
      const resultAbsolute = (currentPrice - avgPrice) * qty;
      const resultPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

      return {
        ticker: pos.asset.ticker,
        name: pos.asset.name,
        clientName: pos.wallet.client.name,
        walletId: pos.walletId,
        resultAbsolute,
        resultPercent,
        currentPrice,
        averagePrice: avgPrice,
      };
    });

    const sorted = [...entries].sort((a, b) => b.resultAbsolute - a.resultAbsolute);
    const topGains = sorted.slice(0, 5);
    const topLosses = [...entries].sort((a, b) => a.resultAbsolute - b.resultAbsolute).slice(0, 5);

    const result: BestWorstAssetsResponse = { topGains, topLosses };
    this.cache.set(key, result);
    return result;
  }
}
```

---

### ☐ 2.7 — Criar `AssetConcentrationService`

**Arquivo a criar:** `backend/src/modules/analytics/services/asset-concentration.service.ts`

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { AssetConcentrationResponse } from '../schemas/analytics-response.schema';
import { CompositeMarketService } from '@/modules/wallets/providers/composite-market.service';

@Injectable()
export class AssetConcentrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
    private readonly market: CompositeMarketService,
  ) {}

  async getAssetConcentration(advisorId: string, mode: string, walletId?: string): Promise<AssetConcentrationResponse> {
    const key = this.cache.buildKey(advisorId, 'concentration', { mode, walletId });
    const cached = this.cache.get<AssetConcentrationResponse>(key);
    if (cached) return cached;

    if (mode === 'DRILLDOWN' && walletId) {
      const owned = await this.prisma.wallet.findFirst({ where: { id: walletId, client: { advisorId } } });
      if (!owned) throw new ForbiddenException();
    }

    const allClients = await this.prisma.client.count({ where: { advisorId } });

    const walletIds = mode === 'DRILLDOWN' && walletId
      ? [walletId]
      : (await this.prisma.wallet.findMany({ where: { client: { advisorId } }, select: { id: true } })).map((w) => w.id);

    const positions = await this.prisma.position.findMany({
      where: { walletId: { in: walletIds }, quantity: { gt: 0 } },
      include: {
        asset: true,
        wallet: { include: { client: { select: { id: true } } } },
      },
    });

    const tickers = [...new Set(positions.map((p) => p.asset.ticker))];
    const prices = tickers.length ? await this.market.getBatchPrices(tickers) : {};

    // Agrupar por assetId
    const assetMap = new Map<string, {
      ticker: string; name: string;
      totalValue: number; avgPrice: number; totalQty: number;
      clientIds: Set<string>; walletIds: Set<string>;
    }>();

    let totalBookValue = 0;

    for (const pos of positions) {
      const price = prices[pos.asset.ticker] ?? Number(pos.averagePrice);
      const value = Number(pos.quantity) * price;
      totalBookValue += value;

      const entry = assetMap.get(pos.assetId) ?? {
        ticker: pos.asset.ticker,
        name: pos.asset.name,
        totalValue: 0,
        avgPrice: Number(pos.averagePrice),
        totalQty: 0,
        clientIds: new Set(),
        walletIds: new Set(),
      };
      entry.totalValue += value;
      entry.totalQty += Number(pos.quantity);
      entry.clientIds.add(pos.wallet.client.id);
      entry.walletIds.add(pos.walletId);
      assetMap.set(pos.assetId, entry);
    }

    const holdings = [...assetMap.values()]
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)
      .map((e) => {
        const percentBook = totalBookValue > 0 ? (e.totalValue / totalBookValue) * 100 : 0;
        const currentPrice = prices[e.ticker] ?? e.avgPrice;
        const gainPercent = e.avgPrice > 0 ? ((currentPrice - e.avgPrice) / e.avgPrice) * 100 : 0;
        const nClients = mode === 'DRILLDOWN' ? 1 : e.clientIds.size;
        return {
          ticker: e.ticker,
          name: e.name,
          valueR$: e.totalValue,
          percentBook,
          nClients,
          gainPercent,
          flags: {
            overWeight: percentBook > 20,
            overConcentrated: mode !== 'DRILLDOWN' && allClients > 0
              ? nClients / allClients > 0.5
              : false,
          },
        };
      });

    const result: AssetConcentrationResponse = { holdings, totalBookValue };
    this.cache.set(key, result);
    return result;
  }
}
```

---

### ☐ 2.8 — Criar `SectorsReseedService`

**Arquivo a criar:** `backend/src/modules/analytics/services/sectors-reseed.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { OpLabMarketService } from '@/modules/wallets/providers/oplab-market.service';

@Injectable()
export class SectorsReseedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oplab: OpLabMarketService,
  ) {}

  async reseed(): Promise<{ updated: number; failed: number; skipped: number }> {
    const assets = await this.prisma.asset.findMany({ where: { sector: null } });
    let updated = 0, failed = 0, skipped = 0;

    for (const asset of assets) {
      try {
        const metadata = await this.oplab.getMetadata(asset.ticker);
        if (metadata?.sector) {
          await this.prisma.asset.update({
            where: { id: asset.id },
            data: { sector: metadata.sector },
          });
          updated++;
        } else {
          skipped++;
        }
      } catch {
        failed++;
      }
    }

    return { updated, failed, skipped };
  }
}
```

---

## BLOCO 3 — Backend: services v2

### ☐ 3.1 — Criar `PatrimonyEvolutionService`

**Arquivo a criar:** `backend/src/modules/analytics/services/patrimony-evolution.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { OpLabMarketService } from '@/modules/wallets/providers/oplab-market.service';
import { PatrimonyEvolutionResponse, PatrimonyDataPoint } from '../schemas/analytics-response.schema';
import { resolvePeriod, formatYYYYMMDD } from '../utils/period.util';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';

@Injectable()
export class PatrimonyEvolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oplab: OpLabMarketService,
    private readonly cache: AnalyticsCacheService,
  ) {}

  // Consumido pelo BenchmarkService
  async getSeries(advisorId: string, from: string, to: string): Promise<PatrimonyDataPoint[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { wallet: { client: { advisorId } } },
      orderBy: { executedAt: 'asc' },
      include: { asset: { include: { optionDetail: true } } },
    });

    const tickers = [...new Set(
      transactions.filter((t) => t.asset?.ticker).map((t) => t.asset!.ticker),
    )];

    const seriesArr = await Promise.all(
      tickers.map((ticker) => this.oplab.getHistoricalSeries(ticker, from, to)),
    );

    // priceMap[ticker][date] = close
    const priceMap = new Map<string, Map<string, number>>();
    tickers.forEach((ticker, i) => {
      const m = new Map<string, number>();
      for (const point of seriesArr[i]) m.set(point.date, point.close);
      priceMap.set(ticker, m);
    });

    // Todos os pregões no range
    const allDates = [...new Set(seriesArr.flatMap((s) => s.map((p) => p.date)))].sort();

    // Replay de transações
    const points: PatrimonyDataPoint[] = [];
    const holdings = new Map<string, number>(); // ticker → quantity

    let txIdx = 0;
    for (const dateStr of allDates) {
      const dateTs = new Date(dateStr).getTime();

      // Aplicar transações até essa data
      while (txIdx < transactions.length) {
        const tx = transactions[txIdx];
        if (new Date(tx.executedAt).getTime() > dateTs) break;
        if (tx.asset?.ticker) {
          const qty = Number(tx.quantity ?? 0);
          const ticker = tx.asset.ticker;
          const cur = holdings.get(ticker) ?? 0;
          if (tx.type === 'BUY' || tx.type === 'OPTION_EXERCISE' || tx.type === 'OPTION_ASSIGNMENT') {
            holdings.set(ticker, cur + qty);
          } else if (tx.type === 'SELL' || tx.type === 'EXPIRED' || tx.type === 'OPTION_EXPIRY') {
            holdings.set(ticker, Math.max(0, cur - qty));
          }
          // Zerar opções vencidas
          if (tx.asset.optionDetail?.expirationDate) {
            const exp = new Date(tx.asset.optionDetail.expirationDate).getTime();
            if (exp <= dateTs) holdings.set(ticker, 0);
          }
        }
        txIdx++;
      }

      // Calcular valor total nessa data
      let totalValue = 0;
      for (const [ticker, qty] of holdings.entries()) {
        if (qty <= 0) continue;
        const dayMap = priceMap.get(ticker);
        // forward-fill: usar o último preço disponível
        const price = dayMap?.get(dateStr) ?? this.getLastKnownPrice(priceMap.get(ticker)!, dateStr);
        totalValue += qty * (price ?? 0);
      }

      points.push({ date: dateStr, totalValue });
    }

    return points;
  }

  private getLastKnownPrice(dayMap: Map<string, number>, date: string): number {
    const dates = [...dayMap.keys()].filter((d) => d <= date).sort();
    return dates.length ? dayMap.get(dates[dates.length - 1])! : 0;
  }

  async getResponse(
    advisorId: string,
    period: string,
    customFrom?: string,
    customTo?: string,
  ): Promise<PatrimonyEvolutionResponse> {
    const key = this.cache.buildKey(advisorId, 'patrimony-evolution', { period, customFrom, customTo });
    const cached = this.cache.get<PatrimonyEvolutionResponse>(key);
    if (cached) return cached;

    const { from, to } = resolvePeriod(period, customFrom, customTo);
    const series = await this.getSeries(advisorId, formatYYYYMMDD(from), formatYYYYMMDD(to));

    const startValue = series[0]?.totalValue ?? 0;
    const endValue = series[series.length - 1]?.totalValue ?? 0;
    const changePercent = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;

    const result: PatrimonyEvolutionResponse = { series, startValue, endValue, changePercent };
    this.cache.set(key, result);
    return result;
  }
}
```

---

### ☐ 3.2 — Criar `BenchmarkService`

**Arquivo a criar:** `backend/src/modules/analytics/services/benchmark.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { OpLabMarketService } from '@/modules/wallets/providers/oplab-market.service';
import { PatrimonyEvolutionService } from './patrimony-evolution.service';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { BenchmarkResponse } from '../schemas/analytics-response.schema';
import { resolvePeriod, formatYYYYMMDD } from '../utils/period.util';

@Injectable()
export class BenchmarkService {
  constructor(
    private readonly oplab: OpLabMarketService,
    private readonly patrimony: PatrimonyEvolutionService,
    private readonly cache: AnalyticsCacheService,
  ) {}

  async getBenchmark(advisorId: string, period: string, customFrom?: string, customTo?: string): Promise<BenchmarkResponse> {
    const key = this.cache.buildKey(advisorId, 'benchmark', { period, customFrom, customTo });
    const cached = this.cache.get<BenchmarkResponse>(key);
    if (cached) return cached;

    const { from, to } = resolvePeriod(period, customFrom, customTo);
    const fromStr = formatYYYYMMDD(from);
    const toStr = formatYYYYMMDD(to);

    const [portfolioSeries, ibovRaw] = await Promise.all([
      this.patrimony.getSeries(advisorId, fromStr, toStr),
      this.oplab.getHistoricalSeries('IBOV', fromStr, toStr),
    ]);

    // Normalizar em % acumulada desde o primeiro ponto
    const portfolioBase = portfolioSeries[0]?.totalValue ?? 1;
    const ibovBase = ibovRaw[0]?.close ?? 1;

    // Alinhar datas: só dias com ambas as séries
    const ibovMap = new Map(ibovRaw.map((p) => [p.date, p.close]));
    const aligned = portfolioSeries
      .filter((p) => ibovMap.has(p.date))
      .map((p) => ({
        date: p.date,
        portfolioValue: p.totalValue,
        portfolioPercent: portfolioBase > 0 ? ((p.totalValue - portfolioBase) / portfolioBase) * 100 : 0,
        ibovPercent: ibovBase > 0 ? ((ibovMap.get(p.date)! - ibovBase) / ibovBase) * 100 : 0,
      }));

    const portfolioChangePercent = aligned.length > 0 ? aligned[aligned.length - 1].portfolioPercent : 0;
    const ibovChangePercent = aligned.length > 0 ? aligned[aligned.length - 1].ibovPercent : 0;

    const result: BenchmarkResponse = { series: aligned, portfolioChangePercent, ibovChangePercent };
    this.cache.set(key, result);
    return result;
  }
}
```

---

## BLOCO 4 — Backend: controller + module + registro

### ☐ 4.1 — Criar `AnalyticsController`

**Arquivo a criar:** `backend/src/modules/analytics/analytics.controller.ts`

```typescript
import { Controller, Get, Post, Delete, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/generated/prisma/client';
import { AnalyticsCacheService } from './cache/analytics-cache.service';
import { BestWorstAssetsService } from './services/best-worst-assets.service';
import { OptionsExpiryService } from './services/options-expiry.service';
import { PendingActionsService } from './services/pending-actions.service';
import { DividendsService } from './services/dividends.service';
import { AssetConcentrationService } from './services/asset-concentration.service';
import { SectorExposureService } from './services/sector-exposure.service';
import { ClientRankingService } from './services/client-ranking.service';
import { PatrimonyEvolutionService } from './services/patrimony-evolution.service';
import { BenchmarkService } from './services/benchmark.service';
import { SectorsReseedService } from './services/sectors-reseed.service';
import { BaseQueryDto, PeriodQueryDto, EvolutionQueryDto } from './schemas/analytics-query.schema';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly cache: AnalyticsCacheService,
    private readonly bestWorst: BestWorstAssetsService,
    private readonly optionsExpiry: OptionsExpiryService,
    private readonly pendingActions: PendingActionsService,
    private readonly dividends: DividendsService,
    private readonly concentration: AssetConcentrationService,
    private readonly sectors: SectorExposureService,
    private readonly clientRanking: ClientRankingService,
    private readonly patrimonyEvolution: PatrimonyEvolutionService,
    private readonly benchmark: BenchmarkService,
    private readonly sectorsReseed: SectorsReseedService,
  ) {}

  @Get('best-worst')
  @Roles('ADVISOR')
  async getBestWorst(@Query() q: BaseQueryDto, @CurrentUser() user: User) {
    return this.bestWorst.getBestWorstAssets(user.id, q.mode, q.walletId);
  }

  @Get('options-expiry')
  @Roles('ADVISOR')
  async getOptionsExpiry(@Query() q: BaseQueryDto, @CurrentUser() user: User) {
    return this.optionsExpiry.getOptionsExpiry(user.id, q.mode, q.walletId);
  }

  @Get('pending-actions')
  @Roles('ADVISOR')
  async getPendingActions(@CurrentUser() user: User) {
    return this.pendingActions.getPendingActions(user.id);
  }

  @Get('dividends')
  @Roles('ADVISOR')
  async getDividends(@Query() q: PeriodQueryDto, @CurrentUser() user: User) {
    return this.dividends.getDividends(user.id, q.mode, q.walletId, q.period, q.from, q.to);
  }

  @Get('concentration')
  @Roles('ADVISOR')
  async getConcentration(@Query() q: BaseQueryDto, @CurrentUser() user: User) {
    return this.concentration.getAssetConcentration(user.id, q.mode, q.walletId);
  }

  @Get('sectors')
  @Roles('ADVISOR')
  async getSectors(@Query() q: BaseQueryDto, @CurrentUser() user: User) {
    return this.sectors.getSectorExposure(user.id, q.mode, q.walletId);
  }

  @Get('client-ranking')
  @Roles('ADVISOR')
  async getClientRanking(@CurrentUser() user: User) {
    return this.clientRanking.getClientRanking(user.id);
  }

  @Get('patrimony-evolution')
  @Roles('ADVISOR')
  async getPatrimonyEvolution(@Query() q: EvolutionQueryDto, @CurrentUser() user: User) {
    return this.patrimonyEvolution.getResponse(user.id, q.period, q.from, q.to);
  }

  @Get('benchmark')
  @Roles('ADVISOR')
  async getBenchmark(@Query() q: EvolutionQueryDto, @CurrentUser() user: User) {
    return this.benchmark.getBenchmark(user.id, q.period, q.from, q.to);
  }

  @Delete('cache')
  @Roles('ADVISOR')
  async invalidateCache(@CurrentUser() user: User) {
    this.cache.invalidateAdvisor(user.id);
    return { success: true };
  }

  @Post('sectors/reseed')
  @Roles('ADMIN')
  async reseedSectors() {
    return this.sectorsReseed.reseed();
  }
}
```

---

### ☐ 4.2 — Criar `AnalyticsModule`

**Arquivo a criar:** `backend/src/modules/analytics/analytics.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { WalletsModule } from '../wallets/wallets.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsCacheService } from './cache/analytics-cache.service';
import { BestWorstAssetsService } from './services/best-worst-assets.service';
import { OptionsExpiryService } from './services/options-expiry.service';
import { PendingActionsService } from './services/pending-actions.service';
import { DividendsService } from './services/dividends.service';
import { AssetConcentrationService } from './services/asset-concentration.service';
import { SectorExposureService } from './services/sector-exposure.service';
import { ClientRankingService } from './services/client-ranking.service';
import { PatrimonyEvolutionService } from './services/patrimony-evolution.service';
import { BenchmarkService } from './services/benchmark.service';
import { SectorsReseedService } from './services/sectors-reseed.service';

@Module({
  imports: [WalletsModule], // [ANALYTICS] acesso a PerformanceService, CompositeMarketService, OpLabMarketService
  controllers: [AnalyticsController],
  providers: [
    AnalyticsCacheService,
    BestWorstAssetsService,
    OptionsExpiryService,
    PendingActionsService,
    DividendsService,
    AssetConcentrationService,
    SectorExposureService,
    ClientRankingService,
    PatrimonyEvolutionService,
    BenchmarkService,
    SectorsReseedService,
  ],
})
export class AnalyticsModule {}
```

---

### ☐ 4.3 — Registrar `AnalyticsModule` em `app.module.ts`

**Arquivo:** `backend/src/app.module.ts`

Localizar os imports existentes e adicionar:

```typescript
import { AnalyticsModule } from './modules/analytics/analytics.module'; // [ANALYTICS]
```

No array `imports` do `@Module`, adicionar após os demais módulos:

```typescript
AnalyticsModule, // [ANALYTICS]
```

**Verificação:** `curl http://localhost:3000/analytics/pending-actions` (com cookie de auth) retorna `{ items: [] }` ou lista real.

---

## BLOCO 5 — Frontend: tipos e API

### ☐ 5.1 — Criar tipos do frontend

**Arquivo a criar:** `frontend/src/features/analytics/types/index.ts`

```typescript
// Mirror dos DTOs de response do backend

export type AnalyticsMode = 'CONSOLIDATED' | 'DRILLDOWN';
export type AnalyticsPeriod = '1M' | '3M' | '6M' | '1A' | 'YTD' | 'CUSTOM';

export interface BestWorstAsset {
  ticker: string;
  name: string;
  clientName: string | null;
  walletId: string;
  resultAbsolute: number;
  resultPercent: number;
  currentPrice: number;
  averagePrice: number;
}
export interface BestWorstAssetsResponse {
  topGains: BestWorstAsset[];
  topLosses: BestWorstAsset[];
}

export interface OptionsExpiryPosition {
  ticker: string;
  walletId: string;
  clientName: string;
  expirationDate: string;
  value: number;
  daysUntilExpiry: number;
}
export interface OptionsExpiryWindow {
  label: string;
  totalValue: number;
  count: number;
  positions: OptionsExpiryPosition[];
}
export interface OptionsExpiryResponse {
  windows: OptionsExpiryWindow[];
}

export type PendingActionType = 'OPTION_EXPIRY' | 'INACTIVE_CLIENT';
export type PendingActionSeverity = 'critical' | 'warning';
export interface PendingActionItem {
  type: PendingActionType;
  severity: PendingActionSeverity;
  description: string;
  linkTo: string;
  clientName: string;
  walletId: string | null;
}
export interface PendingActionsResponse {
  items: PendingActionItem[];
}

export interface DividendsMonthly { month: string; total: number; }
export interface DividendsTopPayer { ticker: string; name: string; total: number; }
export interface DividendsResponse {
  monthly: DividendsMonthly[];
  topPayers: DividendsTopPayer[];
  totalPeriod: number;
}

export interface ConcentrationHolding {
  ticker: string; name: string; valueR$: number; percentBook: number;
  nClients: number; gainPercent: number;
  flags: { overWeight: boolean; overConcentrated: boolean };
}
export interface AssetConcentrationResponse {
  holdings: ConcentrationHolding[];
  totalBookValue: number;
}

export interface SectorExposureItem { sector: string; valueR$: number; percent: number; assetCount: number; }
export interface SectorExposureResponse { sectors: SectorExposureItem[]; totalValue: number; }

export interface ClientRankingItem {
  clientId: string; name: string; patrimonioR$: number;
  rentabilidadePercent: number; resultadoR$: number;
  lastOperationAt: string | null; criticalNotifications: number;
}
export interface ClientRankingResponse { clients: ClientRankingItem[]; }

export interface PatrimonyDataPoint { date: string; totalValue: number; }
export interface PatrimonyEvolutionResponse {
  series: PatrimonyDataPoint[]; startValue: number; endValue: number; changePercent: number;
}

export interface BenchmarkDataPoint {
  date: string; portfolioValue: number; portfolioPercent: number; ibovPercent: number;
}
export interface BenchmarkResponse {
  series: BenchmarkDataPoint[]; portfolioChangePercent: number; ibovChangePercent: number;
}

export interface AnalyticsBaseParams {
  mode: AnalyticsMode;
  walletId?: string;
}
export interface AnalyticsPeriodParams extends AnalyticsBaseParams {
  period: AnalyticsPeriod;
  customFrom?: string;
  customTo?: string;
}
export interface AnalyticsEvolutionParams {
  period: AnalyticsPeriod;
  customFrom?: string;
  customTo?: string;
}
```

---

### ☐ 5.2 — Criar `analytics.api.ts`

**Arquivo a criar:** `frontend/src/features/analytics/api/analytics.api.ts`

```typescript
import { api } from '@/lib/axios';
import type {
  BestWorstAssetsResponse, OptionsExpiryResponse, PendingActionsResponse,
  DividendsResponse, AssetConcentrationResponse, SectorExposureResponse,
  ClientRankingResponse, PatrimonyEvolutionResponse, BenchmarkResponse,
  AnalyticsBaseParams, AnalyticsPeriodParams, AnalyticsEvolutionParams,
} from '../types';

function baseParams(p: AnalyticsBaseParams) {
  return { mode: p.mode, ...(p.walletId ? { walletId: p.walletId } : {}) };
}
function periodParams(p: AnalyticsPeriodParams) {
  return {
    ...baseParams(p), period: p.period,
    ...(p.customFrom ? { from: p.customFrom } : {}),
    ...(p.customTo ? { to: p.customTo } : {}),
  };
}
function evolutionParams(p: AnalyticsEvolutionParams) {
  return {
    period: p.period,
    ...(p.customFrom ? { from: p.customFrom } : {}),
    ...(p.customTo ? { to: p.customTo } : {}),
  };
}

export const analyticsApi = {
  getBestWorstAssets: (p: AnalyticsBaseParams) =>
    api.get<BestWorstAssetsResponse>('/analytics/best-worst', { params: baseParams(p) }).then((r) => r.data),

  getOptionsExpiry: (p: AnalyticsBaseParams) =>
    api.get<OptionsExpiryResponse>('/analytics/options-expiry', { params: baseParams(p) }).then((r) => r.data),

  getPendingActions: () =>
    api.get<PendingActionsResponse>('/analytics/pending-actions').then((r) => r.data),

  getDividends: (p: AnalyticsPeriodParams) =>
    api.get<DividendsResponse>('/analytics/dividends', { params: periodParams(p) }).then((r) => r.data),

  getConcentration: (p: AnalyticsBaseParams) =>
    api.get<AssetConcentrationResponse>('/analytics/concentration', { params: baseParams(p) }).then((r) => r.data),

  getSectorExposure: (p: AnalyticsBaseParams) =>
    api.get<SectorExposureResponse>('/analytics/sectors', { params: baseParams(p) }).then((r) => r.data),

  getClientRanking: () =>
    api.get<ClientRankingResponse>('/analytics/client-ranking').then((r) => r.data),

  getPatrimonyEvolution: (p: AnalyticsEvolutionParams) =>
    api.get<PatrimonyEvolutionResponse>('/analytics/patrimony-evolution', { params: evolutionParams(p) }).then((r) => r.data),

  getBenchmark: (p: AnalyticsEvolutionParams) =>
    api.get<BenchmarkResponse>('/analytics/benchmark', { params: evolutionParams(p) }).then((r) => r.data),

  invalidateCache: () =>
    api.delete('/analytics/cache').then((r) => r.data),
};
```

---

## BLOCO 6 — Frontend: hooks

### ☐ 6.1 — Criar hooks v1

**Arquivo a criar:** `frontend/src/features/analytics/api/hooks.ts`

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from './analytics.api';
import type { AnalyticsBaseParams, AnalyticsPeriodParams, AnalyticsEvolutionParams } from '../types';

const STALE = 5 * 60 * 1000;

export function useBestWorstAssets(p: AnalyticsBaseParams) {
  return useQuery({
    queryKey: ['analytics', 'best-worst', p],
    queryFn: () => analyticsApi.getBestWorstAssets(p),
    staleTime: STALE,
    enabled: p.mode === 'CONSOLIDATED' || !!p.walletId,
  });
}

export function useOptionsExpiry(p: AnalyticsBaseParams) {
  return useQuery({
    queryKey: ['analytics', 'options-expiry', p],
    queryFn: () => analyticsApi.getOptionsExpiry(p),
    staleTime: STALE,
    enabled: p.mode === 'CONSOLIDATED' || !!p.walletId,
  });
}

export function usePendingActions() {
  return useQuery({
    queryKey: ['analytics', 'pending-actions'],
    queryFn: analyticsApi.getPendingActions,
    staleTime: STALE,
  });
}

export function useDividends(p: AnalyticsPeriodParams) {
  return useQuery({
    queryKey: ['analytics', 'dividends', p],
    queryFn: () => analyticsApi.getDividends(p),
    staleTime: STALE,
    enabled: p.mode === 'CONSOLIDATED' || !!p.walletId,
  });
}

export function useAssetConcentration(p: AnalyticsBaseParams) {
  return useQuery({
    queryKey: ['analytics', 'concentration', p],
    queryFn: () => analyticsApi.getConcentration(p),
    staleTime: STALE,
    enabled: p.mode === 'CONSOLIDATED' || !!p.walletId,
  });
}

export function useSectorExposure(p: AnalyticsBaseParams) {
  return useQuery({
    queryKey: ['analytics', 'sectors', p],
    queryFn: () => analyticsApi.getSectorExposure(p),
    staleTime: STALE,
    enabled: p.mode === 'CONSOLIDATED' || !!p.walletId,
  });
}

export function useClientRanking() {
  return useQuery({
    queryKey: ['analytics', 'client-ranking'],
    queryFn: analyticsApi.getClientRanking,
    staleTime: STALE,
  });
}

export function usePatrimonyEvolution(p: AnalyticsEvolutionParams) {
  return useQuery({
    queryKey: ['analytics', 'patrimony-evolution', p],
    queryFn: () => analyticsApi.getPatrimonyEvolution(p),
    staleTime: STALE,
  });
}

export function useBenchmark(p: AnalyticsEvolutionParams) {
  return useQuery({
    queryKey: ['analytics', 'benchmark', p],
    queryFn: () => analyticsApi.getBenchmark(p),
    staleTime: STALE,
  });
}

export function useInvalidateAnalyticsCache() {
  const queryClient = useQueryClient();
  return async () => {
    await analyticsApi.invalidateCache();
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };
}
```

---

## BLOCO 7 — Frontend: componentes base

### ☐ 7.1 — Criar `WidgetCard`

**Arquivo a criar:** `frontend/src/features/analytics/components/WidgetCard.tsx`

```tsx
import { ReactNode } from 'react';

interface Props {
  title: string;
  isLoading: boolean;
  error?: Error | null;
  children: ReactNode;
}

export function WidgetCard({ title, isLoading, error, children }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {isLoading && (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-2/3" />
        </div>
      )}
      {!isLoading && error && (
        <p className="text-sm text-red-500">Erro ao carregar dados.</p>
      )}
      {!isLoading && !error && children}
    </div>
  );
}
```

---

### ☐ 7.2 — Criar `PeriodSelector`

**Arquivo a criar:** `frontend/src/features/analytics/components/PeriodSelector.tsx`

```tsx
import type { AnalyticsPeriod } from '../types';

const PRESETS: { label: string; value: AnalyticsPeriod }[] = [
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1A', value: '1A' },
  { label: 'YTD', value: 'YTD' },
  { label: 'Custom', value: 'CUSTOM' },
];

interface Props {
  value: AnalyticsPeriod;
  onChange: (p: AnalyticsPeriod) => void;
  customFrom?: string;
  customTo?: string;
  onCustomFromChange?: (v: string) => void;
  onCustomToChange?: (v: string) => void;
}

export function PeriodSelector({ value, onChange, customFrom, customTo, onCustomFromChange, onCustomToChange }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            value === p.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {p.label}
        </button>
      ))}
      {value === 'CUSTOM' && (
        <div className="flex items-center gap-1 ml-2">
          <input
            type="date"
            value={customFrom ?? ''}
            onChange={(e) => onCustomFromChange?.(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <span className="text-gray-400 text-sm">–</span>
          <input
            type="date"
            value={customTo ?? ''}
            onChange={(e) => onCustomToChange?.(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
      )}
    </div>
  );
}
```

---

### ☐ 7.3 — Criar `AnalyticsToggle`

**Arquivo a criar:** `frontend/src/features/analytics/components/AnalyticsToggle.tsx`

```tsx
import type { AnalyticsMode } from '../types';

interface Wallet { id: string; clientName: string }

interface Props {
  mode: AnalyticsMode;
  onModeChange: (m: AnalyticsMode) => void;
  wallets: Wallet[];
  selectedWalletId: string | null;
  onWalletChange: (id: string) => void;
}

export function AnalyticsToggle({ mode, onModeChange, wallets, selectedWalletId, onWalletChange }: Props) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {(['CONSOLIDATED', 'DRILLDOWN'] as AnalyticsMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === m ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {m === 'CONSOLIDATED' ? 'Consolidado' : 'Carteira'}
          </button>
        ))}
      </div>
      {mode === 'DRILLDOWN' && (
        <select
          value={selectedWalletId ?? ''}
          onChange={(e) => onWalletChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Selecionar carteira...</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>{w.clientName}</option>
          ))}
        </select>
      )}
    </div>
  );
}
```

---

## BLOCO 8 — Frontend: widgets

### ☐ 8.1 — Criar widget `PendingActions`

**Arquivo a criar:** `frontend/src/features/analytics/components/widgets/PendingActions.tsx`

```tsx
import { Link } from 'react-router-dom';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { WidgetCard } from '../WidgetCard';
import { usePendingActions } from '../../api/hooks';

export function PendingActions() {
  const { data, isLoading, error } = usePendingActions();

  return (
    <WidgetCard title="Ações Pendentes" isLoading={isLoading} error={error}>
      {data?.items.length === 0 && (
        <p className="text-sm text-gray-400">Nenhuma ação pendente.</p>
      )}
      <ul className="space-y-2">
        {data?.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            {item.severity === 'critical'
              ? <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              : <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />}
            <div>
              <p className="text-sm text-gray-700">{item.description}</p>
              <p className="text-xs text-gray-400">{item.clientName}</p>
              <Link to={item.linkTo} className="text-xs text-blue-500 hover:underline">Ver detalhes</Link>
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
```

---

### ☐ 8.2 — Criar widget `Dividends`

**Arquivo a criar:** `frontend/src/features/analytics/components/widgets/Dividends.tsx`

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { WidgetCard } from '../WidgetCard';
import { useDividends } from '../../api/hooks';
import type { AnalyticsPeriodParams } from '../../types';

interface Props { params: AnalyticsPeriodParams }

export function Dividends({ params }: Props) {
  const { data, isLoading, error } = useDividends(params);

  return (
    <WidgetCard title="Proventos Recebidos" isLoading={isLoading} error={error}>
      {data && (
        <>
          <p className="text-xs text-gray-400 mb-2">
            Total no período: <span className="font-semibold text-gray-700">
              {data.totalPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data.monthly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
              <Bar dataKey="total" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {data.topPayers.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Top pagadores</p>
              <ul className="space-y-1">
                {data.topPayers.map((p) => (
                  <li key={p.ticker} className="flex justify-between text-xs">
                    <span className="text-gray-700">{p.ticker} — {p.name}</span>
                    <span className="font-medium">{p.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </WidgetCard>
  );
}
```

---

### ☐ 8.3 — Criar widget `OptionsExpiry`

**Arquivo a criar:** `frontend/src/features/analytics/components/widgets/OptionsExpiry.tsx`

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { WidgetCard } from '../WidgetCard';
import { useOptionsExpiry } from '../../api/hooks';
import type { AnalyticsBaseParams } from '../../types';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#6b7280'];

interface Props { params: AnalyticsBaseParams }

export function OptionsExpiry({ params }: Props) {
  const { data, isLoading, error } = useOptionsExpiry(params);

  return (
    <WidgetCard title="Risco de Vencimento de Opções" isLoading={isLoading} error={error}>
      {data?.windows.length === 0 && <p className="text-sm text-gray-400">Sem opções com vencimento futuro.</p>}
      {data && data.windows.length > 0 && (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.windows} layout="vertical" margin={{ top: 0, right: 10, left: 40, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 10 }}
              tickFormatter={(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
            <Bar dataKey="totalValue" radius={[0, 3, 3, 0]}>
              {data.windows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </WidgetCard>
  );
}
```

---

### ☐ 8.4 — Criar widget `ClientRanking`

**Arquivo a criar:** `frontend/src/features/analytics/components/widgets/ClientRanking.tsx`

```tsx
import { useState } from 'react';
import { WidgetCard } from '../WidgetCard';
import { useClientRanking } from '../../api/hooks';
import type { ClientRankingItem } from '../../types';

type SortKey = keyof Pick<ClientRankingItem, 'patrimonioR$' | 'rentabilidadePercent' | 'resultadoR$' | 'criticalNotifications'>;

export function ClientRanking() {
  const { data, isLoading, error } = useClientRanking();
  const [sortKey, setSortKey] = useState<SortKey>('rentabilidadePercent');

  const sorted = data
    ? [...data.clients].sort((a, b) => b[sortKey] - a[sortKey])
    : [];

  const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtPct = (v: number) => `${v.toFixed(2)}%`;

  return (
    <WidgetCard title="Ranking de Clientes" isLoading={isLoading} error={error}>
      {sorted.length === 0 && !isLoading && <p className="text-sm text-gray-400">Sem dados.</p>}
      {sorted.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left py-1">Cliente</th>
                <th className="text-right py-1 cursor-pointer hover:text-gray-600" onClick={() => setSortKey('patrimonioR$')}>Patrimônio</th>
                <th className="text-right py-1 cursor-pointer hover:text-gray-600" onClick={() => setSortKey('rentabilidadePercent')}>Rent.</th>
                <th className="text-right py-1 cursor-pointer hover:text-gray-600" onClick={() => setSortKey('resultadoR$')}>Resultado</th>
                <th className="text-right py-1">Últ. op.</th>
                <th className="text-right py-1 cursor-pointer hover:text-gray-600" onClick={() => setSortKey('criticalNotifications')}>Alertas</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const lastOp = c.lastOperationAt ? new Date(c.lastOperationAt) : null;
                const daysAgo = lastOp ? Math.floor((Date.now() - lastOp.getTime()) / 86400000) : null;
                return (
                  <tr key={c.clientId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 font-medium text-gray-700">{c.name}</td>
                    <td className="text-right">{fmtCurrency(c.patrimonioR$)}</td>
                    <td className={`text-right font-medium ${c.rentabilidadePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {fmtPct(c.rentabilidadePercent)}
                    </td>
                    <td className={`text-right ${c.resultadoR$ >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {fmtCurrency(c.resultadoR$)}
                    </td>
                    <td className={`text-right ${daysAgo && daysAgo > 90 ? 'text-orange-500 font-medium' : 'text-gray-500'}`}>
                      {daysAgo != null ? `${daysAgo}d` : '—'}
                    </td>
                    <td className={`text-right font-medium ${c.criticalNotifications > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {c.criticalNotifications || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}
```

---

### ☐ 8.5 — Criar widget `BestWorstAssets`

**Arquivo a criar:** `frontend/src/features/analytics/components/widgets/BestWorstAssets.tsx`

```tsx
import { TrendingUp, TrendingDown } from 'lucide-react';
import { WidgetCard } from '../WidgetCard';
import { useBestWorstAssets } from '../../api/hooks';
import type { AnalyticsBaseParams, BestWorstAsset } from '../../types';

interface Props { params: AnalyticsBaseParams }

function AssetRow({ a }: { a: BestWorstAsset }) {
  const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
  const fmtR$ = (v: number) =>
    (v >= 0 ? '+' : '') + v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return (
    <li className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
      <div>
        <span className="text-sm font-medium text-gray-700">{a.ticker}</span>
        {a.clientName && <span className="ml-1.5 text-xs text-gray-400">{a.clientName}</span>}
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${a.resultAbsolute >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {fmtR$(a.resultAbsolute)}
        </p>
        <p className="text-xs text-gray-400">{fmtPct(a.resultPercent)}</p>
      </div>
    </li>
  );
}

export function BestWorstAssets({ params }: Props) {
  const { data, isLoading, error } = useBestWorstAssets(params);
  return (
    <WidgetCard title="Melhores e Piores Ativos" isLoading={isLoading} error={error}>
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs font-medium text-gray-500">Top Ganhos</span>
            </div>
            <ul>{data.topGains.map((a, i) => <AssetRow key={i} a={a} />)}</ul>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-2">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-medium text-gray-500">Top Perdas</span>
            </div>
            <ul>{data.topLosses.map((a, i) => <AssetRow key={i} a={a} />)}</ul>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
```

---

### ☐ 8.6 — Criar widget `AssetConcentration`

**Arquivo a criar:** `frontend/src/features/analytics/components/widgets/AssetConcentration.tsx`

```tsx
import { WidgetCard } from '../WidgetCard';
import { useAssetConcentration } from '../../api/hooks';
import type { AnalyticsBaseParams } from '../../types';

interface Props { params: AnalyticsBaseParams }

export function AssetConcentration({ params }: Props) {
  const { data, isLoading, error } = useAssetConcentration(params);
  return (
    <WidgetCard title="Concentração de Ativos" isLoading={isLoading} error={error}>
      {data?.holdings.length === 0 && <p className="text-sm text-gray-400">Sem posições.</p>}
      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100">
                <th className="text-left py-1">Ativo</th>
                <th className="text-right">Valor</th>
                <th className="text-right">% Book</th>
                <th className="text-right">Clientes</th>
                <th className="text-right">Rent.</th>
              </tr>
            </thead>
            <tbody>
              {data.holdings.map((h) => (
                <tr key={h.ticker} className={`border-b border-gray-50 ${h.flags.overWeight ? 'bg-yellow-50' : ''} ${h.flags.overConcentrated ? 'bg-red-50' : ''}`}>
                  <td className="py-1.5 font-medium text-gray-700">{h.ticker}</td>
                  <td className="text-right">{h.valueR$.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className={`text-right font-medium ${h.flags.overWeight ? 'text-yellow-600' : ''}`}>{h.percentBook.toFixed(1)}%</td>
                  <td className={`text-right ${h.flags.overConcentrated ? 'text-red-500 font-medium' : ''}`}>{h.nClients}</td>
                  <td className={`text-right ${h.gainPercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>{h.gainPercent.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}
```

---

### ☐ 8.7 — Criar widget `SectorExposure`

**Arquivo a criar:** `frontend/src/features/analytics/components/widgets/SectorExposure.tsx`

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { WidgetCard } from '../WidgetCard';
import { useSectorExposure } from '../../api/hooks';
import type { AnalyticsBaseParams } from '../../types';

interface Props { params: AnalyticsBaseParams }

export function SectorExposure({ params }: Props) {
  const { data, isLoading, error } = useSectorExposure(params);
  return (
    <WidgetCard title="Exposição Setorial" isLoading={isLoading} error={error}>
      {data?.sectors.length === 0 && <p className="text-sm text-gray-400">Sem dados setoriais.</p>}
      {data && data.sectors.length > 0 && (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.sectors} layout="vertical" margin={{ top: 0, right: 10, left: 80, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <YAxis type="category" dataKey="sector" tick={{ fontSize: 10 }} width={75} />
            <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
            <Bar dataKey="percent" fill="#6366f1" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </WidgetCard>
  );
}
```

---

### ☐ 8.8 — Criar widget `PatrimonyEvolution` (v2)

**Arquivo a criar:** `frontend/src/features/analytics/components/widgets/PatrimonyEvolution.tsx`

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { WidgetCard } from '../WidgetCard';
import { usePatrimonyEvolution } from '../../api/hooks';
import type { AnalyticsEvolutionParams } from '../../types';

interface Props { params: AnalyticsEvolutionParams }

export function PatrimonyEvolution({ params }: Props) {
  const { data, isLoading, error } = usePatrimonyEvolution(params);
  return (
    <WidgetCard title="Evolução Patrimonial" isLoading={isLoading} error={error}>
      {data?.series.length === 0 && <p className="text-sm text-gray-400">Sem dados no período.</p>}
      {data && data.series.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mb-2">
            Variação: <span className={`font-semibold ${data.changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
            </span>
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data.series} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
              <Line type="monotone" dataKey="totalValue" stroke="#3b82f6" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </WidgetCard>
  );
}
```

---

### ☐ 8.9 — Criar widget `BenchmarkComparison` (v2)

**Arquivo a criar:** `frontend/src/features/analytics/components/widgets/BenchmarkComparison.tsx`

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { WidgetCard } from '../WidgetCard';
import { useBenchmark } from '../../api/hooks';
import type { AnalyticsEvolutionParams } from '../../types';

interface Props { params: AnalyticsEvolutionParams }

export function BenchmarkComparison({ params }: Props) {
  const { data, isLoading, error } = useBenchmark(params);
  return (
    <WidgetCard title="Rentabilidade vs IBOV" isLoading={isLoading} error={error}>
      {data?.series.length === 0 && <p className="text-sm text-gray-400">Sem dados no período.</p>}
      {data && data.series.length > 0 && (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data.series} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="portfolioPercent" name="Carteira" stroke="#3b82f6" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="ibovPercent" name="IBOV" stroke="#f59e0b" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </WidgetCard>
  );
}
```

---

## BLOCO 9 — Frontend: página e integração

### ☐ 9.1 — Criar `AnalyticsPage`

**Arquivo a criar:** `frontend/src/features/analytics/pages/AnalyticsPage.tsx`

```tsx
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { AnalyticsMode, AnalyticsPeriod, AnalyticsBaseParams, AnalyticsPeriodParams, AnalyticsEvolutionParams } from '../types';
import { useInvalidateAnalyticsCache } from '../api/hooks';
import { PeriodSelector } from '../components/PeriodSelector';
import { AnalyticsToggle } from '../components/AnalyticsToggle';
import { PendingActions } from '../components/widgets/PendingActions';
import { Dividends } from '../components/widgets/Dividends';
import { OptionsExpiry } from '../components/widgets/OptionsExpiry';
import { ClientRanking } from '../components/widgets/ClientRanking';
import { BestWorstAssets } from '../components/widgets/BestWorstAssets';
import { AssetConcentration } from '../components/widgets/AssetConcentration';
import { SectorExposure } from '../components/widgets/SectorExposure';
import { PatrimonyEvolution } from '../components/widgets/PatrimonyEvolution';
import { BenchmarkComparison } from '../components/widgets/BenchmarkComparison';

// Buscar wallets do assessor para o WalletSelector — reutilizar hook existente
import { useWallets } from '@/features/wallets/api/useWallets';

type WalletEntry = { id: string; name?: string; client?: { name: string } };

export function AnalyticsPage() {
  const [mode, setMode] = useState<AnalyticsMode>('CONSOLIDATED');
  const [walletId, setWalletId] = useState<string | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>('1M');
  const [customFrom, setCustomFrom] = useState<string | undefined>();
  const [customTo, setCustomTo] = useState<string | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  const invalidate = useInvalidateAnalyticsCache();
  const { data: walletsData } = useWallets();

  // Verificar se o hook useWallets retorna o formato esperado — ajustar se necessário
  const wallets = ((walletsData ?? []) as WalletEntry[]).map((w) => ({
    id: w.id,
    clientName: w.client?.name ?? w.name ?? w.id,
  }));

  const baseParams: AnalyticsBaseParams = { mode, walletId: walletId ?? undefined };
  const periodParams: AnalyticsPeriodParams = { ...baseParams, period, customFrom, customTo };
  const evolutionParams: AnalyticsEvolutionParams = { period, customFrom, customTo };

  const handleRefresh = async () => {
    setRefreshing(true);
    await invalidate();
    setRefreshing(false);
  };

  const handleModeChange = (m: AnalyticsMode) => {
    setMode(m);
    if (m === 'CONSOLIDATED') setWalletId(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Análises</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar dados
        </button>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-4 flex-wrap">
        <AnalyticsToggle
          mode={mode}
          onModeChange={handleModeChange}
          wallets={wallets}
          selectedWalletId={walletId}
          onWalletChange={setWalletId}
        />
        <PeriodSelector
          value={period}
          onChange={setPeriod}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
      </div>

      {/* Grid de widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Categoria 1 — Performance */}
        <PatrimonyEvolution params={evolutionParams} />
        <BenchmarkComparison params={evolutionParams} />
        <BestWorstAssets params={baseParams} />

        {/* Categoria 2 — Operacional */}
        <OptionsExpiry params={baseParams} />
        <PendingActions />
        <Dividends params={periodParams} />

        {/* Categoria 3 — Risco e Composição */}
        <AssetConcentration params={baseParams} />
        <SectorExposure params={baseParams} />

        {/* Categoria 4 — Comparativo */}
        <ClientRanking />
      </div>
    </div>
  );
}
```

> **⚠️ VERIFICAR na Fase 4:** `useWallets` pode ter assinatura diferente do esperado. Checar o hook real antes de usar e ajustar o mapeamento de `wallets` se necessário.

---

### ☐ 9.2 — Adicionar rota em `routes/index.tsx`

**Arquivo:** `frontend/src/routes/index.tsx`

Localizar o bloco `ADVISOR` existente e adicionar:

```tsx
import { AnalyticsPage } from '@/features/analytics/pages/AnalyticsPage'; // [ANALYTICS]

// Dentro do bloco de rotas ADVISOR:
<Route path="/analytics" element={<AnalyticsPage />} /> {/* [ANALYTICS] */}
```

---

### ☐ 9.3 — Adicionar item no menu lateral

**Arquivo:** `frontend/src/components/layout/Sidebar.tsx`

Localizar `advisorNavItems` e adicionar (após 'Proventos' ou onde fizer sentido visual):

```typescript
import { BarChart2 } from 'lucide-react'; // [ANALYTICS] — já é dependência do projeto

// No array advisorNavItems:
{ name: 'Análises', href: '/analytics', icon: BarChart2 }, // [ANALYTICS]
```

---

## BLOCO 10 — Verificação final (smoke test)

### ☐ 10.1 — Backend: verificar compilação

```bash
cd backend && npx tsc --noEmit
```

Esperado: sem erros de tipagem.

---

### ☐ 10.2 — Backend: verificar endpoints com curl

```bash
# Substituir <COOKIE> pelo cookie de auth JWT
curl -s -b "<COOKIE>" http://localhost:3000/analytics/pending-actions | jq .
curl -s -b "<COOKIE>" http://localhost:3000/analytics/client-ranking | jq .
curl -s -b "<COOKIE>" "http://localhost:3000/analytics/dividends?period=1M" | jq .
curl -s -b "<COOKIE>" "http://localhost:3000/analytics/sectors?mode=CONSOLIDATED" | jq .
```

Esperado: objetos JSON sem erro 500.

---

### ☐ 10.3 — Backend: verificar invalidação de cache

```bash
curl -s -X DELETE -b "<COOKIE>" http://localhost:3000/analytics/cache | jq .
```

Esperado: `{ "success": true }`.

---

### ☐ 10.4 — Frontend: verificar que página carrega

1. Acessar `/analytics` no browser
2. Todos os widgets devem mostrar skeleton durante loading
3. Após load: dados aparecem ou estado vazio com mensagem
4. Toggle Consolidado ↔ Carteira funciona
5. Botão "Atualizar dados" não gera erro no console

---

### ☐ 10.5 — Verificar que features existentes não foram quebradas

1. Dashboard do assessor (`/advisor/home`) — card de vencimentos ainda aparece
2. Listagem de carteiras — funciona normalmente
3. Notificações — página de configurações sem erro
4. Proventos — página de proventos sem erro

---

*Fase 3 entregue em 2026-05-19. Aguardando aprovação para iniciar Fase 4.*
