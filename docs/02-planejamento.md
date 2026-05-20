# FASE 2 — Planejamento

> **Status:** ENTREGUE
> **Data:** 2026-05-19
> **Inputs lidos:** `PROGRESS.md` + `01-investigacao.md`
> **Output:** este arquivo preenchido

---

## 1. Escopo do plano

> **Nota sobre nomenclatura:** os prefixos W01–W13 foram usados apenas para identificar e contar os widgets durante o planejamento. No código (services, hooks, componentes, endpoints) cada widget tem um nome próprio descritivo — sem prefixo numérico.

### Widgets implementados em v1 (7)

| Widget | Nome próprio | Modo | Usa período |
|--------|-------------|------|-------------|
| W03 — Melhores e piores ativos | `best-worst-assets` | Consolidado + Drill-down | Não — usa averagePrice vs. cotação atual |
| W05 — Risco de vencimento em opções | `options-expiry` | Consolidado + Drill-down | Não — sempre futuro |
| W07 — Ações pendentes do assessor | `pending-actions` | Consolidado apenas | Não — estado atual |
| W08 — Histórico de proventos | `dividends` | Consolidado + Drill-down | **Sim** — filtra por exDividendDate |
| W10 — Concentração de ativos | `asset-concentration` | Consolidado + Drill-down | Não — snapshot atual |
| W11 — Exposição setorial | `sector-exposure` | Consolidado + Drill-down | Não — snapshot atual |
| W13 — Ranking de clientes | `client-ranking` | Consolidado apenas | Não — usa computeTotals() overall |

### Widgets desbloqueados — implementar em v2 (2)

| Widget | Nome próprio | Motivo do desbloqueio |
|--------|-------------|----------------------|
| W01 — Evolução patrimonial | `patrimony-evolution` | Ver correção técnica abaixo |
| W02 — Rentabilidade vs IBOV | `benchmark` | Depende de W01 — desbloqueado junto |

#### Correção técnica: por que W01 e W02 estavam bloqueados e por que não estão mais

**Objetivo de W01:** exibir um gráfico de linha com a evolução do valor total da carteira do assessor ao longo do tempo — o equivalente visual de um extrato patrimonial.

**Objetivo de W02:** sobrepor ao gráfico de W01 uma segunda linha com a rentabilidade do Ibovespa no mesmo período, permitindo ao assessor comparar se seus clientes bateram ou perderam pro índice.

**O bloqueio original** era descrito como: _"exige série histórica; `PerformanceService.aggregate()` é `private` e não tem filtro temporal"_. Isso estava correto mas incompleto — a análise assumia que buscar preços históricos exigiria **uma chamada à API por dia por ativo**:

```
365 dias × 15 ativos = 5.475 chamadas → inviável on-demand
```

**A solução:** o endpoint `/v3/market/historical/{symbol}/1d` do OpLab aceita um range de datas e retorna a **série inteira em uma única chamada**:

```
GET /v3/market/historical/VALE3/1d?from=2026-01-01&to=2026-05-19
→ retorna ~100 candles diários de uma vez (confirmado via Postman)
```

O custo real é **uma chamada por ativo único**, não por dia. Um advisor com 15 ativos distintos no histórico gera 15 chamadas — não 5.475. O problema de performance não existe.

**Por que a implementação funciona:**

```
Transações (banco)    → sabe QUANTOS ativos havia em cada data (replay de BUY/SELL)
OpLab histórico (API) → sabe QUANTO valia cada ativo em cada data (série diária)
                                      ↓
              qty[ticker][dia] × price[ticker][dia] → valor da carteira dia a dia
```

`PerformanceService.aggregate()` ser `private` é irrelevante — W01 não precisa dele. A lógica é implementada diretamente em `PatrimonyEvolutionService` usando transações + OpLab histórico.

Para W02, o IBOV histórico via OpLab já havia sido confirmado funcional desde o planejamento original. Com W01 desbloqueado, W02 segue automaticamente.

**Impacto no filtro de período:** O seletor de período (1M / 3M / 6M / 1A / YTD / Custom) fica na página mesmo em v1. Afeta W08 e — quando v2 implementado — W01 e W02. Os demais widgets mostram estado atual independente do período.

---

## 2. Arquitetura do backend

### Estrutura de pastas

```
backend/src/modules/analytics/
├── analytics.module.ts
├── analytics.controller.ts
├── cache/
│   └── analytics-cache.service.ts
├── services/
│   ├── best-worst-assets.service.ts
│   ├── options-expiry.service.ts
│   ├── pending-actions.service.ts
│   ├── dividends.service.ts
│   ├── asset-concentration.service.ts
│   ├── sector-exposure.service.ts
│   ├── client-ranking.service.ts
│   ├── patrimony-evolution.service.ts   ← v2
│   ├── benchmark.service.ts             ← v2
│   └── sectors-reseed.service.ts
└── dto/
    ├── analytics-query.dto.ts    # DTOs de request (Zod)
    └── analytics-response.dto.ts # DTOs de response (interfaces TS)
```

### Dependências do módulo

```typescript
// analytics.module.ts
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
    PatrimonyEvolutionService,   // v2
    BenchmarkService,            // v2
    SectorsReseedService,
  ],
})
export class AnalyticsModule {}
```

`PrismaService` não precisa ser importado — é `@Global` via `SharedModule`.

### Alterações necessárias em WalletsModule

`WalletsModule` precisa exportar três serviços que hoje não estão no array `exports`:

```typescript
// wallets.module.ts — adicionar ao array exports: // [ANALYTICS]
exports: [
  // ...exports existentes (MARKET_DATA_PROVIDER)...
  PerformanceService,       // [ANALYTICS] asset-concentration, client-ranking
  CompositeMarketService,   // [ANALYTICS] best-worst-assets, options-expiry, asset-concentration, sector-exposure
  OpLabMarketService,       // [ANALYTICS] patrimony-evolution (v2), benchmark (v2), sectors/reseed
],
```

**Regra:** não remover nada existente; apenas adicionar com marcador `// [ANALYTICS]`.

### Alterações necessárias em OpLabMarketService

`OpLabMarketService` precisa de um novo método público para expor a série histórica. `makeRequest` permanece `private` — o novo método encapsula o endpoint, a conversão de timestamp em ms e a filtragem de candles sem `close`.

> **Nota:** `getMetadata(ticker)` já é um método público existente (linha 282 do serviço) — nenhuma alteração necessária para ele. O `SectorsReseedService` pode usá-lo diretamente.

```typescript
// oplab-market.service.ts — adicionar método público: // [ANALYTICS]
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

Nenhum caller existente é alterado. Blast radius: zero.

### Registro em app.module.ts

```typescript
// app.module.ts — adicionar após os módulos existentes: // [ANALYTICS]
import { AnalyticsModule } from './modules/analytics/analytics.module'; // [ANALYTICS]

@Module({
  imports: [
    // ...módulos existentes...
    AnalyticsModule, // [ANALYTICS]
  ],
})
```

---

## 3. Endpoints

| Método | Path | Auth | Parâmetros |
|--------|------|------|-----------|
| GET | `/analytics/best-worst` | JwtAuthGuard + ADVISOR | `mode`, `walletId?` |
| GET | `/analytics/options-expiry` | JwtAuthGuard + ADVISOR | `mode`, `walletId?` |
| GET | `/analytics/pending-actions` | JwtAuthGuard + ADVISOR | — |
| GET | `/analytics/dividends` | JwtAuthGuard + ADVISOR | `mode`, `walletId?`, `period`, `from?`, `to?` |
| GET | `/analytics/concentration` | JwtAuthGuard + ADVISOR | `mode`, `walletId?` |
| GET | `/analytics/sectors` | JwtAuthGuard + ADVISOR | `mode`, `walletId?` |
| GET | `/analytics/client-ranking` | JwtAuthGuard + ADVISOR | — |
| GET | `/analytics/patrimony-evolution` | JwtAuthGuard + ADVISOR | `period`, `from?`, `to?` — v2 |
| GET | `/analytics/benchmark` | JwtAuthGuard + ADVISOR | `period`, `from?`, `to?` — v2 |
| DELETE | `/analytics/cache` | JwtAuthGuard + ADVISOR | — |
| POST | `/analytics/sectors/reseed` | JwtAuthGuard + ADMIN | — |

`advisorId` é extraído sempre do JWT via `@CurrentUser()` — nunca de query params.

---

## 4. DTOs de request (Zod)

```typescript
// analytics-query.dto.ts
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
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).refine(
  (d) => d.period !== 'CUSTOM' || (!!d.from && !!d.to),
  { message: 'from e to são obrigatórios quando period=CUSTOM', path: ['from'] },
);

// Para W01 e W02 — sem mode/walletId, só período
const EvolutionQuerySchema = z.object({
  period: AnalyticsPeriodEnum.default('1A'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).refine(
  (d) => d.period !== 'CUSTOM' || (!!d.from && !!d.to),
  { message: 'from e to são obrigatórios quando period=CUSTOM', path: ['from'] },
);

export class BaseQueryDto extends createZodDto(BaseQuerySchema) {}
export class PeriodQueryDto extends createZodDto(PeriodQuerySchema) {}
export class EvolutionQueryDto extends createZodDto(EvolutionQuerySchema) {}
```

---

## 5. DTOs de response (interfaces TypeScript)

```typescript
// analytics-response.dto.ts

// best-worst-assets
export interface BestWorstAsset {
  ticker: string;
  name: string;
  clientName: string | null; // null no drilldown
  walletId: string;
  resultAbsolute: number;    // R$ — (cotacao - avgPrice) × qty
  resultPercent: number;     // %
  currentPrice: number;
  averagePrice: number;
}
export interface BestWorstAssetsResponse {
  topGains: BestWorstAsset[];  // top 5
  topLosses: BestWorstAsset[]; // top 5
}

// options-expiry
export interface OptionsExpiryPosition {
  ticker: string;
  walletId: string;
  clientName: string;
  expirationDate: string;    // ISO
  value: number;             // qty × currentPrice (fallback: qty × averagePrice)
  daysUntilExpiry: number;
}
export interface OptionsExpiryWindow {
  label: string;             // "≤ 7d" | "8–15d" | "16–30d" | "31–60d" | "60+ d"
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
  linkTo: string;            // rota frontend
  clientName: string;
  walletId: string | null;
}
export interface PendingActionsResponse {
  items: PendingActionItem[]; // ordenados: critical primeiro, depois warning
}

// dividends
export interface DividendsMonthly {
  month: string;             // "YYYY-MM"
  total: number;
}
export interface DividendsTopPayer {
  ticker: string;
  name: string;
  total: number;
}
export interface DividendsResponse {
  monthly: DividendsMonthly[];
  topPayers: DividendsTopPayer[]; // top 5
  totalPeriod: number;
}

// asset-concentration
export interface ConcentrationHolding {
  ticker: string;
  name: string;
  valueR$: number;
  percentBook: number;
  nClients: number;          // drilldown: sempre 1
  gainPercent: number;       // (currentPrice - averagePrice) / averagePrice × 100
  flags: {
    overWeight: boolean;     // percentBook > 20%
    overConcentrated: boolean; // nClients / totalClients > 50% — só consolidado
  };
}
export interface AssetConcentrationResponse {
  holdings: ConcentrationHolding[]; // top 10 por valueR$
  totalBookValue: number;
}

// sector-exposure
export interface SectorExposureItem {
  sector: string;            // "Não classificado" se null
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
  patrimonioR$: number;      // totalInvested + unrealized
  rentabilidadePercent: number;
  resultadoR$: number;       // total P&L
  lastOperationAt: string | null; // ISO
  criticalNotifications: number;
}
export interface ClientRankingResponse {
  clients: ClientRankingItem[]; // default: desc por rentabilidadePercent
}

// patrimony-evolution (v2)
export interface PatrimonyDataPoint {
  date: string;              // "YYYY-MM-DD"
  totalValue: number;        // Σ (qty[ticker] × close[ticker][date])
}
export interface PatrimonyEvolutionResponse {
  series: PatrimonyDataPoint[];
  startValue: number;
  endValue: number;
  changePercent: number;
}

// benchmark (v2)
export interface BenchmarkDataPoint {
  date: string;              // "YYYY-MM-DD"
  portfolioValue: number;    // valor absoluto da carteira
  portfolioPercent: number;  // rentabilidade acumulada desde início do período
  ibovPercent: number;       // rentabilidade acumulada do IBOV desde início do período
}
export interface BenchmarkResponse {
  series: BenchmarkDataPoint[];
  portfolioChangePercent: number;
  ibovChangePercent: number;
}
```

---

## 6. Lógica de dados por widget

### best-worst-assets

```
1. Buscar todas as wallets do advisor:
   WHERE wallet.client.advisorId = advisorId
   [drilldown: WHERE wallet.id = walletId]

2. Para cada wallet, buscar positions com include: { asset }
   Filtrar: quantity > 0

3. Coletar todos os tickers únicos

4. CompositeMarketService.getBatchPrices(tickers)
   → Record<ticker, price>

5. Para cada position:
   result = (price[ticker] ?? averagePrice) - averagePrice) × quantity
   resultPercent = ((price[ticker] ?? averagePrice) - averagePrice) / averagePrice × 100

6. No modo CONSOLIDADO: agrupar por assetId (mesmo ativo em carteiras diferentes).
   Somar resultAbsolute; recalcular resultPercent como média ponderada.
   clientName = nome do cliente da carteira com maior exposição.
   ⚠️ Decisão de implementação: em v1, NÃO agregar por assetId — retornar uma entrada
   por (walletId, assetId). Simplifica a lógica e evita ambiguidade de clientName.

7. Ordenar desc por resultAbsolute → top 5 positivos (topGains)
   Ordenar asc por resultAbsolute → top 5 negativos (topLosses)
```

### options-expiry

```
1. Buscar wallets do advisor (mesmo filtro do best-worst-assets)

2. Para cada wallet, buscar positions com:
   include: { asset: { include: { optionDetail: true } } }
   Filtrar: asset.type = 'OPTION' AND quantity > 0 AND optionDetail.expirationDate >= today

3. Coletar tickers de opções; getBatchPrices() para valor de mercado
   Fallback: averagePrice se preço não disponível

4. Calcular daysUntilExpiry = (expirationDate - today).days

5. Classificar por janela:
   ≤ 7d    → daysUntilExpiry in [0, 7]
   8–15d   → [8, 15]
   16–30d  → [16, 30]
   31–60d  → [31, 60]
   60+ d   → [61, ∞)

6. Para cada janela: somar value, contar positions

7. Retornar apenas janelas com count > 0
```

### pending-actions

```
Fonte 1 — Notificações de opções:
  WHERE advisorId = advisorId
    AND isRead = false
    AND severity IN ('CRITICAL', 'WARNING')
    AND type = 'OPTION_EXPIRY'
  include: { wallet: { include: { client: true } } }
  Para cada: montar descrição, linkTo = '/wallets/{walletId}' [confirmar rota na Fase 4]

Fonte 2 — Clientes inativos (>90 dias sem operação):
  prisma.transaction.groupBy({
    by: ['walletId'],
    _max: { executedAt: true },
    having: { executedAt: { _max: { lt: ninetyDaysAgo } } },
  })
  Filtrar pelos walletIds do advisor
  Para cada: severity = 'warning'; linkTo = '/clients/{clientId}' [confirmar rota na Fase 4]

Ordenação final: 'critical' antes de 'warning'; dentro de cada grupo, por data criação desc
```

### dividends

```
1. Calcular from/to a partir do período:
   '1M'  → [startOf(1 mês atrás), today]
   '3M'  → [startOf(3 meses atrás), today]
   '6M'  → [startOf(6 meses atrás), today]
   '1A'  → [startOf(12 meses atrás), today]
   'YTD' → [1 jan ano corrente, today]
   'CUSTOM' → [from, to] do query param

2. Buscar walletIds do advisor (ou walletId único no drilldown)

3. prisma.walletDividendPayment.findMany({
     where: {
       walletId: { in: walletIds },
       exDividendDate: { gte: from, lte: to },
     },
     include: { position: { include: { asset: true } } },
   })

4. Agrupar por mês: month = exDividendDate.toISOString().slice(0, 7) // "YYYY-MM"
   Somar totalReceived por mês

5. Top payers: agrupar por ticker, somar totalReceived; top 5
   Ticker: usar walletDividendPayment.ticker diretamente (campo próprio do modelo)
   Nome do ativo: via position.asset.name
   → position NUNCA é null: positionId é não-nullable e a relação usa onDelete: Cascade
     (deletar position cascade-deleta o payment — o cenário "position deletada" não existe)

6. Garantir que monthly lista todos os meses no range mesmo que total = 0
   (preencher gaps com { month, total: 0 })
```

### asset-concentration

```
1. Buscar positions de todas as wallets do advisor
   Filtrar: quantity > 0
   include: { asset: true, wallet: { include: { client: true } } }

2. getBatchPrices(todosOsTickers)

3. Para cada position:
   value = quantity × (price[ticker] ?? averagePrice)
   gainPercent = ((price[ticker] ?? averagePrice) - averagePrice) / averagePrice × 100

4. Agrupar por assetId:
   - somar values → totalValueForAsset
   - contar walletIds únicos → nWallets (proxy para nClients no consolidado)
   - media ponderada de gainPercent

5. totalBookValue = soma de todos os assets

6. Para cada asset (top 10 por totalValueForAsset):
   percentBook = totalValueForAsset / totalBookValue × 100
   nClients = count de clientIds únicos entre as wallets que têm esse ativo

7. totalClients = count total de clientes do advisor

8. Flags:
   overWeight = percentBook > 20
   overConcentrated = (nClients / totalClients) > 0.50

Modo DRILLDOWN:
  - Agrupar por assetId dentro da wallet única
  - nClients = 1 sempre; overConcentrated = false sempre
```

### sector-exposure

```
1. Buscar positions do advisor (filtro padrão)
   include: { asset: true }
   Filtrar: quantity > 0

2. getBatchPrices(tickers)

3. Para cada position:
   sector = asset.sector ?? 'Não classificado'
   value = quantity × (price[ticker] ?? averagePrice)

4. Agrupar por sector:
   - somar value → valueR$
   - contar assetIds únicos → assetCount

5. totalValue = soma de todos os grupos

6. Calcular percent = valueR$ / totalValue × 100

7. Ordenar por valueR$ desc
```

### client-ranking

```
1. Buscar todos os clientes do advisor:
   prisma.client.findMany({
     where: { advisorId },
     include: { wallets: true },
   })

2. Para cada cliente:
   a) Agregar computeTotals() de todas as wallets:
      - Chamar PerformanceService.computeTotals(walletId) para cada wallet
      - Somar: realized, unrealized, dividends, total, totalInvested
      - patrimonioR$ = totalInvested + unrealized
      - rentabilidadePercent = totalInvested > 0
          ? (total / totalInvested) × 100
          : 0
      - resultadoR$ = total

   b) Última operação:
      prisma.transaction.findFirst({
        where: { walletId: { in: walletIds } },
        orderBy: { executedAt: 'desc' },
        select: { executedAt: true },
      })

   c) Notificações críticas:
      prisma.notification.count({
        where: {
          advisorId,
          isRead: false,
          severity: 'CRITICAL',
          walletId: { in: walletIds.filter(Boolean) },
        },
      })

3. Ordenar por rentabilidadePercent desc (default — frontend pode reordenar)

⚠️ Performance: N+1 de computeTotals(). Com 20 carteiras × 1 assessor: 20 chamadas.
   Cada chamada já usa getBatchPrices() internamente.
   Mitigação: aceitar em v1; se performance problemática, otimizar na Fase 4.
```

### patrimony-evolution (v2)

```
1. Calcular [from, to] a partir do período (mesma lógica de dividends)

2. Buscar TODAS as transações do advisor no período + anteriores:
   prisma.transaction.findMany({
     where: { wallet: { client: { advisorId } } },
     orderBy: { executedAt: 'asc' },
     include: { asset: { include: { optionDetail: true } } },
   })
   → necessário incluir transações ANTES de from para conhecer posições iniciais
   → `Transaction` não tem relação `position` — a relação direta é `asset`
   → `optionDetail` incluído aqui fornece `expirationDate` para o passo 6b (R-P7)

3. Extrair tickers únicos de todas as transações históricas

4. Buscar séries históricas em paralelo — UMA chamada por ticker único:
   const series = await Promise.all(
     tickers.map((t) => opLabMarketService.getHistoricalSeries(t, from, to))
   )
   → priceMap: Record<ticker, Record<dateStr, close>>
   getHistoricalSeries() já faz a conversão de ms → "YYYY-MM-DD" internamente.
   Custo: N chamadas paralelas onde N = número de tickers únicos (ex: 15), não dias × tickers.

5. Construir lista de pregões no range (dias com ao menos um ticker com preço)

6. Para cada pregão:
   a. Replay de transações até aquela data → posições: Record<ticker, quantity>
   b. Para cada ticker em posições:
      price = priceMap[ticker][date] ?? último close disponível (forward-fill)
      Se ativo venceu antes da data (options): quantity = 0
   c. totalValue = Σ (quantity × price)

7. Expor dois métodos:
   getSeries(advisorId, from, to): Promise<PatrimonyDataPoint[]>   ← consumido por BenchmarkService
   getResponse(advisorId, period, from?, to?): Promise<PatrimonyEvolutionResponse>  ← consumido pelo controller

8. Retornar série + startValue + endValue + changePercent
```

### benchmark (v2)

`BenchmarkService` injeta `PatrimonyEvolutionService` para reutilizar o replay de transações sem duplicar lógica. Se o algoritmo de evolução mudar, benchmark herda a correção automaticamente.

```
1. Buscar série do portfolio via injeção:
   const portfolioSeries = await patrimonyEvolutionService.getSeries(advisorId, from, to)
   → PatrimonyDataPoint[]

2. Buscar IBOV histórico em paralelo (junto com o passo acima via Promise.all):
   const ibovSeries = await opLabMarketService.getHistoricalSeries('IBOV', from, to)
   → Array<{ date, close }>

3. Normalizar ambas para rentabilidade acumulada (base = primeiro dia do range):
   portfolioPercent[d] = (portfolioValue[d] / portfolioValue[0] - 1) × 100
   ibovPercent[d]      = (ibovClose[d]      / ibovClose[0]      - 1) × 100

4. Alinhar datas: usar apenas dias onde AMBAS as séries têm valor

5. Retornar série combinada + portfolioChangePercent + ibovChangePercent
```

---

## 7. Cache

### Implementação

```typescript
// analytics-cache.service.ts
interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

@Injectable()
export class AnalyticsCacheService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutos

  buildKey(advisorId: string, widget: string, params: Record<string, string | undefined>): string {
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

### Uso nos services

Cada service recebe `AnalyticsCacheService` via injeção. Cada método público:
1. Constrói a cache key
2. Testa o cache → retorna se hit
3. Executa a query
4. Armazena no cache
5. Retorna

### Invalidação via endpoint

```typescript
// DELETE /analytics/cache
@Delete('cache')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADVISOR')
async invalidateCache(@CurrentUser() user: User): Promise<{ success: true }> {
  this.cacheService.invalidateAdvisor(user.id);
  return { success: true };
}
```

---

## 8. Sectors Reseed

```typescript
// POST /analytics/sectors/reseed (role: ADMIN)
// SectorsReseedService.reseed():
//   1. prisma.asset.findMany({ where: { sector: null } })
//   2. Para cada asset: opLabMarketService.getMetadata(ticker)
//   3. Se metadata.sector existe: prisma.asset.update({ where: { id }, data: { sector } })
//   4. Retornar: { updated: N, failed: M, skipped: K }
// Volume esperado: 8 assets. Sem paginação necessária.
```

---

## 9. Frontend — estrutura de pastas

```
frontend/src/features/analytics/
├── api/
│   ├── analytics.api.ts              # Funções axios — uma por endpoint
│   ├── useBestWorstAssets.ts
│   ├── useOptionsExpiry.ts
│   ├── usePendingActions.ts
│   ├── useDividends.ts
│   ├── useAssetConcentration.ts
│   ├── useSectorExposure.ts
│   ├── useClientRanking.ts
│   ├── usePatrimonyEvolution.ts      ← v2
│   ├── useBenchmark.ts               ← v2
│   └── index.ts
├── types/
│   └── index.ts                      # Mirror dos DTOs de response do backend
├── components/
│   ├── AnalyticsToggle.tsx           # Consolidado / Drill-down + WalletSelector
│   ├── PeriodSelector.tsx            # 1M 3M 6M 1A YTD Custom
│   ├── WidgetCard.tsx                # Wrapper: title + loading skeleton + error state
│   └── widgets/
│       ├── BestWorstAssets.tsx
│       ├── OptionsExpiry.tsx
│       ├── PendingActions.tsx
│       ├── Dividends.tsx             # Recharts BarChart
│       ├── AssetConcentration.tsx
│       ├── SectorExposure.tsx        # Recharts BarChart ou Treemap
│       ├── ClientRanking.tsx         # Tabela com sorting frontend-side
│       ├── PatrimonyEvolution.tsx    ← v2 — Recharts LineChart
│       └── BenchmarkComparison.tsx  ← v2 — Recharts LineChart (2 linhas)
└── pages/
    └── AnalyticsPage.tsx
```

### Estado da página (`AnalyticsPage.tsx`)

```typescript
// Estado local — não precisa de Zustand nem Context
const [mode, setMode] = useState<'CONSOLIDATED' | 'DRILLDOWN'>('CONSOLIDATED');
const [walletId, setWalletId] = useState<string | null>(null);
const [period, setPeriod] = useState<AnalyticsPeriod>('1M');
const [customFrom, setCustomFrom] = useState<string | undefined>();
const [customTo, setCustomTo] = useState<string | undefined>();
```

Todos os hooks de widget recebem `{ mode, walletId, period, customFrom, customTo }` via props.

### Hook padrão (exemplo best-worst-assets)

```typescript
// useBestWorstAssets.ts
export function useBestWorstAssets(params: AnalyticsBaseParams) {
  return useQuery({
    queryKey: ['analytics', 'best-worst-assets', params],
    queryFn: () => analyticsApi.getBestWorstAssets(params),
    enabled: params.mode === 'CONSOLIDATED' || !!params.walletId,
    staleTime: 5 * 60 * 1000,
  });
}
```

### Invalidação de cache via botão

```typescript
// AnalyticsPage.tsx — botão "Atualizar dados"
const queryClient = useQueryClient();

const handleRefresh = async () => {
  await analyticsApi.invalidateCache();  // DELETE /analytics/cache
  queryClient.invalidateQueries({ queryKey: ['analytics'] });
};
```

### WalletSelector (dentro de AnalyticsToggle)

No modo DRILLDOWN, renderizar um `<select>` com todas as wallets do assessor. Usar hook existente de wallets (`useWallets` ou similar) para listar `{ walletId, clientName }`.

### WidgetCard — layout comum

```tsx
function WidgetCard({ title, isLoading, error, onRefresh?, children }) {
  if (isLoading) return <Skeleton />;
  if (error)    return <ErrorState message={error.message} />;
  return (
    <div className="...">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
```

### ClientRanking — ordenação frontend

Tabela com `useState<SortKey>` para colunas. Sem chamada extra ao backend ao trocar ordenação — re-sort em memória sobre os dados já carregados.

### Adição de rota e sidebar

```tsx
// routes/index.tsx — dentro do bloco ADVISOR:
<Route path="/analytics" element={<AnalyticsPage />} /> {/* [ANALYTICS] */}

// Sidebar.tsx — advisorNavItems:
{ name: 'Análises', href: '/analytics', icon: BarChart2 }, // [ANALYTICS]
// BarChart2 já é dependência via lucide-react
```

---

## 10. Verificações de segurança e acesso

- Todos os endpoints protegidos por `JwtAuthGuard` + `@Roles('ADVISOR')` (exceto `sectors/reseed`: `ADMIN`)
- `advisorId` sempre extraído do JWT — nunca de query params
- Em cada service, validar que `walletId` (modo drilldown) pertence a uma carteira do `advisorId` antes de processar:
  ```typescript
  const wallet = await this.prisma.wallet.findFirst({
    where: { id: walletId, client: { advisorId } },
  });
  if (!wallet) throw new ForbiddenException();
  ```

---

## 11. Ausência de migrations

Não há migrations de schema nesta feature. Justificativa:
- `Asset.sector` já existe (schema.prisma:213)
- `asset_sectors` planejada no PROGRESS.md original foi descartada (Phase 1)
- `POST /analytics/sectors/reseed` é um script de dados, não de schema

---

## 12. Riscos identificados nesta fase

| ID | Risco | Mitigação |
|----|-------|-----------|
| R-P1 | N+1 de computeTotals() em client-ranking | Aceitar em v1 (max ~20 wallets por assessor). Otimizar se necessário na Fase 4 com batch de preços único. |
| R-P2 | Rota de wallet no frontend não confirmada | pending-actions usa placeholder `/wallets?walletId={id}`. Confirmar rota real no início da Fase 4. |
| R-P3 | OpLabMarketService pode não estar exportado em WalletsModule | Adicionar ao exports conforme seção 2. Verificar que não quebra nenhum teste existente. |
| R-P4 | `Notification.walletId` nullable pode subcontar notificações críticas em client-ranking | Filtrar `walletId IS NOT NULL` — perda parcial aceitável. Documentar limitação. |
| R-P5 | Nenhum dado na primeira carga (assessor novo) | Cada widget retorna array vazio sem erro. Frontend exibe estado vazio com mensagem amigável. |
| R-P6 | `position.quantity` pode ser zero sem deleção do registro | Filtrar `quantity > 0` em todos os widgets que consultam positions. |
| R-P7 | Opções vencidas em patrimony-evolution | Após expirationDate, forçar quantity = 0 no replay de transações. |
| R-P8 | Gaps de pregão no priceMap de patrimony-evolution | Forward-fill: usar último close disponível quando o dia não tem preço (feriados, fins de semana). |

---

## 13. Ordem de implementação (alto nível — detalhada na Fase 3)

```
Bloco 1 — Backend scaffold:
  1. analytics.module.ts + analytics.controller.ts (esqueleto)
  2. analytics-cache.service.ts
  3. analytics-query.dto.ts + analytics-response.dto.ts
  4. Adicionar exports ao WalletsModule

Bloco 2 — Services por complexidade crescente (v1):
  5.  PendingActionsService    (só DB, sem prices)
  6.  DividendsService         (DB + period logic)
  7.  SectorExposureService    (DB + prices, lógica simples)
  8.  OptionsExpiryService     (DB + prices + janelas)
  9.  ClientRankingService     (DB + computeTotals)
  10. BestWorstAssetsService   (DB + prices + top/bottom)
  11. AssetConcentrationService (DB + prices + alertas)
  12. SectorsReseedService     (OpLab metadata batch)

Bloco 2b — Services v2:
  13. PatrimonyEvolutionService (transactions replay + OpLab histórico)
  14. BenchmarkService          (PatrimonyEvolution + IBOV histórico)

Bloco 3 — Wiring no controller:
  15. Conectar todos os services no AnalyticsController
  16. Registrar AnalyticsModule em app.module.ts

Bloco 4 — Frontend:
  17. types/index.ts + analytics.api.ts
  18. Hooks v1 (usePendingActions → useDividends → ... mesma ordem do backend)
  19. WidgetCard + PeriodSelector + AnalyticsToggle
  20. Widgets v1 individuais (mesma ordem dos hooks)
  21. AnalyticsPage.tsx
  22. Rota + sidebar
  23. Hooks v2: usePatrimonyEvolution + useBenchmark
  24. Widgets v2: PatrimonyEvolution + BenchmarkComparison
```

---

*Fase 2 entregue em 2026-05-19. Atualizada em 2026-05-19: W01/W02 desbloqueados (ver seção 1), prefixos W0X removidos de todo o código em favor de nomes descritivos.*
