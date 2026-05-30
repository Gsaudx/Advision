# Analytics — Painel de Análises do Assessor

## Visão Geral

O módulo **Analytics** fornece ao assessor um painel com nove widgets de inteligência de carteira, exibindo em tempo quase-real dados agregados de todos os seus clientes (modo **Consolidado**) ou de uma carteira específica (modo **Drilldown**).

Cada widget é servido por um service independente, compartilha uma camada de cache in-memory com TTL de 5 minutos e usa a API da **OpLab** como fonte de preços históricos e de mercado via `CompositeMarketService` / `OpLabMarketService`.

O módulo resolve três necessidades do assessor:

1. **Visão instantânea** — patrimônio consolidado, exposição setorial e ranking de rentabilidade de todos os clientes em uma única tela.
2. **Gestão de risco** — monitoramento de vencimento de opções, concentração acima de limites de segurança e clientes inativos.
3. **Comparativo de performance** — evolução patrimonial e benchmark contra o IBOV por período configurável.

---

## 1. Estrutura de Arquivos

### Backend

```
backend/src/modules/analytics/
├── __tests__/
│   ├── analytics-cache.service.spec.ts
│   ├── analytics-services.spec.ts
│   ├── analytics.controller.spec.ts
│   ├── best-worst-assets.service.spec.ts
│   ├── period.util.spec.ts
│   └── sectors-reseed.service.spec.ts
├── cache/
│   └── analytics-cache.service.ts
├── schemas/
│   ├── analytics-query.schema.ts
│   └── analytics-response.schema.ts
├── services/
│   ├── asset-concentration.service.ts
│   ├── benchmark.service.ts
│   ├── best-worst-assets.service.ts
│   ├── client-ranking.service.ts
│   ├── dividends.service.ts
│   ├── options-expiry.service.ts
│   ├── patrimony-evolution.service.ts
│   ├── pending-actions.service.ts
│   ├── sector-exposure.service.ts
│   └── sectors-reseed.service.ts
├── utils/
│   └── period.util.ts
├── analytics.controller.ts
├── analytics.module.ts
└── index.ts
```

### Frontend

```
frontend/src/features/analytics/
├── api/
│   ├── analytics.api.ts
│   └── useAnalytics.ts
├── components/
│   ├── widgets/
│   │   ├── AssetConcentration.tsx
│   │   ├── BenchmarkComparison.tsx
│   │   ├── BestWorstAssets.tsx
│   │   ├── ClientRanking.tsx
│   │   ├── Dividends.tsx
│   │   ├── OptionsExpiry.tsx
│   │   ├── PatrimonyEvolution.tsx
│   │   ├── PendingActions.tsx
│   │   └── SectorExposure.tsx
│   ├── AnalyticsToggle.tsx
│   ├── PeriodSelector.tsx
│   ├── ProportionBar.tsx
│   ├── WidgetCard.tsx
│   ├── WidgetEmptyState.tsx
│   └── WidgetEyebrow.tsx
├── pages/
│   └── AnalyticsPage.tsx
├── types/
│   └── index.ts
├── utils/
│   └── formatters.ts
└── index.ts
```

---

## 2. Schemas de Query (Validação de Entrada)

Arquivo: `backend/src/modules/analytics/schemas/analytics-query.schema.ts`

### Enums

```ts
AnalyticsModeEnum  = z.enum(['CONSOLIDATED', 'DRILLDOWN'])
AnalyticsPeriodEnum = z.enum(['1M', '3M', '6M', '1A', 'YTD', 'CUSTOM'])
```

### DTOs

| DTO | Campos | Regra de negócio |
|-----|--------|-----------------|
| `BaseQueryDto` | `mode` (default `CONSOLIDATED`), `walletId?` (UUID) | `walletId` obrigatório quando `mode = DRILLDOWN` |
| `PeriodQueryDto` | herda `BaseQueryDto` + `period` (default `1M`), `from?`, `to?` | `from` e `to` obrigatórios quando `period = CUSTOM` |
| `EvolutionQueryDto` | herda `BaseQueryDto` + `period` (default `1A`), `from?`, `to?` | `from` e `to` obrigatórios quando `period = CUSTOM` |

Validação executada pelo `nestjs-zod` via `ZodValidationPipe`. Violações retornam **422 Unprocessable Entity**.

---

## 3. Schemas de Resposta

Arquivo: `backend/src/modules/analytics/schemas/analytics-response.schema.ts`

Todos os schemas são definidos com Zod 4 e expostos via `createZodDto` para geração automática de tipos OpenAPI.

### `BestWorstAssetsResponse`

```ts
{
  topGains: BestWorstAsset[],   // top 5 maior resultado absoluto
  topLosses: BestWorstAsset[]   // top 5 menor resultado absoluto
}

BestWorstAsset = {
  ticker: string
  name: string
  clientName: string | null
  walletId: string            // UUID
  resultAbsolute: number      // (preçoAtual - pmédio) × qtd
  resultPercent: number       // variação % sobre pmédio
  currentPrice: number
  averagePrice: number
}
```

### `OptionsExpiryResponse`

```ts
{
  windows: OptionsExpiryWindow[]  // janelas com count > 0
}

OptionsExpiryWindow = {
  label: string        // ex: "≤ 7d", "8–15d", "16–30d", "31–60d", "60+ d"
  totalValue: number   // soma de qty × preçoAtual de todas as posições
  count: number        // número de posições na janela
  positions: OptionsExpiryPosition[]
}

OptionsExpiryPosition = {
  ticker, walletId, clientName, expirationDate: string, value, daysUntilExpiry
}
```

### `PendingActionsResponse`

```ts
{
  items: PendingActionItem[]  // ordenados: critical antes de warning
}

PendingActionItem = {
  type: 'OPTION_EXPIRY' | 'INACTIVE_CLIENT'
  severity: 'critical' | 'warning'
  description: string
  linkTo: string                // rota de navegação frontend
  clientName: string
  walletId: string | null
  daysInactive?: number
  positionCount?: number
  costBasis?: number
}
```

### `DividendsResponse`

```ts
{
  monthly: { month: string, total: number }[]   // YYYY-MM, gaps preenchidos com 0
  topPayers: { ticker, name, total }[]          // top 5 por valor total
  totalPeriod: number
}
```

### `AssetConcentrationResponse`

```ts
{
  holdings: ConcentrationHolding[]   // top 10 por valor, somente STOCK
  totalBookValue: number
}

ConcentrationHolding = {
  ticker, name
  'valueR$': number
  percentBook: number
  nClients: number
  gainPercent: number
  flags: {
    overWeight: boolean          // percentBook > 20%
    overConcentrated: boolean    // nClients / totalClients > 50% (só no modo CONSOLIDATED)
  }
}
```

### `SectorExposureResponse`

```ts
{
  sectors: SectorExposureItem[]   // ordenados por valor desc
  totalValue: number
}

SectorExposureItem = {
  sector: string    // fallback: "Não classificado"
  'valueR$': number
  percent: number
  assetCount: number
}
```

> Opções resolvem o setor do ativo-objeto via `optionDetail.underlyingAsset.sector`.

### `ClientRankingResponse`

```ts
{
  clients: ClientRankingItem[]   // ordenados por rentabilidadePercent desc
}

ClientRankingItem = {
  clientId, name
  'patrimonioR$': number         // totalInvested + unrealized
  rentabilidadePercent: number   // total / totalInvested × 100
  'resultadoR$': number          // realized + unrealized + dividends
  lastOperationAt: string | null
  criticalNotifications: number  // notificações CRITICAL não lidas
}
```

### `PatrimonyEvolutionResponse`

```ts
{
  series: { date: string, totalValue: number }[]
  startValue: number
  endValue: number
  changePercent: number   // (endValue - startValue) / startValue × 100
}
```

### `BenchmarkResponse`

```ts
{
  series: BenchmarkDataPoint[]
  portfolioChangePercent: number
  ibovChangePercent: number
}

BenchmarkDataPoint = {
  date: string
  portfolioValue: number
  portfolioPercent: number   // % acumulado desde o início do período
  ibovPercent: number        // % acumulado do IBOV desde o início do período
}
```

### `SectorsReseedResponse`

```ts
{ updated: number, failed: number, skipped: number }
```

---

## 4. Cache In-Memory (`AnalyticsCacheService`)

Arquivo: `backend/src/modules/analytics/cache/analytics-cache.service.ts`

| Parâmetro | Valor |
|-----------|-------|
| TTL | 5 minutos |
| Capacidade máxima | 500 entradas |
| Evicção | expirados primeiro; quando cheio, remove o mais antigo (inserção FIFO) |
| Escopo | por `advisorId + widget + params` |

### Métodos

| Método | Assinatura | Descrição |
|--------|-----------|-----------|
| `buildKey` | `(advisorId, widget, params) → string` | Gera chave determinística ordenando os params por nome. Formato: `advisorId:widget:a=1&b=2` |
| `get<T>` | `(key) → T \| null` | Retorna dado se não expirado; remove e retorna `null` se expirado |
| `set` | `(key, data) → void` | Armazena com TTL; aciona evicção se necessário |
| `invalidateAdvisor` | `(advisorId) → void` | Remove todas as entradas cujo prefixo é `advisorId:` |

Cache é **invalidado** via `DELETE /analytics/cache` (endpoint protegido) ou automaticamente quando o TTL expira.

---

## 5. Controller

Arquivo: `backend/src/modules/analytics/analytics.controller.ts`

Guards ativos em todos os endpoints: `AuthGuard('jwt')` + `RolesGuard`.

| Método | Rota | Roles | DTO de Query | Service chamado |
|--------|------|-------|-------------|----------------|
| `GET` | `/analytics/best-worst` | ADVISOR, ADMIN | `BaseQueryDto` | `BestWorstAssetsService.getBestWorstAssets` |
| `GET` | `/analytics/options-expiry` | ADVISOR, ADMIN | `BaseQueryDto` | `OptionsExpiryService.getOptionsExpiry` |
| `GET` | `/analytics/pending-actions` | ADVISOR, ADMIN | — | `PendingActionsService.getPendingActions` |
| `GET` | `/analytics/dividends` | ADVISOR, ADMIN | `PeriodQueryDto` | `DividendsService.getDividends` |
| `GET` | `/analytics/concentration` | ADVISOR, ADMIN | `BaseQueryDto` | `AssetConcentrationService.getAssetConcentration` |
| `GET` | `/analytics/sectors` | ADVISOR, ADMIN | `BaseQueryDto` | `SectorExposureService.getSectorExposure` |
| `GET` | `/analytics/client-ranking` | ADVISOR, ADMIN | — | `ClientRankingService.getClientRanking` |
| `GET` | `/analytics/patrimony-evolution` | ADVISOR, ADMIN | `EvolutionQueryDto` | `PatrimonyEvolutionService.getResponse` |
| `GET` | `/analytics/benchmark` | ADVISOR, ADMIN | `EvolutionQueryDto` | `BenchmarkService.getBenchmark` |
| `DELETE` | `/analytics/cache` | ADVISOR, ADMIN | — | `AnalyticsCacheService.invalidateAdvisor` |
| `POST` | `/analytics/sectors/reseed` | **ADMIN** | — | `SectorsReseedService.reseed` |

Todas as respostas de sucesso são envolvidas em `ApiResponseDto.success(data)`:

```json
{
  "success": true,
  "data": { ... }
}
```

---

## 6. Services

### 6.1 `BestWorstAssetsService`

**Método:** `getBestWorstAssets(advisorId, mode, walletId?)`

1. Verifica cache; retorna se hit.
2. Em modo DRILLDOWN: verifica posse da carteira (`wallet.client.advisorId`), lança `ForbiddenException` se não pertencer.
3. Resolve lista de `walletIds` (todas as carteiras do advisor, ou só a informada).
4. Busca posições ativas (`quantity > 0`) do tipo `STOCK`.
5. Consulta preços correntes via `CompositeMarketService.getBatchPrices`.
6. Calcula `resultAbsolute = (preçoAtual - pmédio) × qtd` e `resultPercent`.
7. Ordena por `resultAbsolute` desc → `topGains` (5 primeiros) e asc → `topLosses` (5 primeiros).
8. Armazena no cache e retorna.

**Fallback de preço:** se `getBatchPrices` não retornar o ticker, usa `averagePrice`.

---

### 6.2 `OptionsExpiryService`

**Método:** `getOptionsExpiry(advisorId, mode, walletId?)`

Janelas de vencimento fixas:

| Label | Dias |
|-------|------|
| `≤ 7d` | 0–7 |
| `8–15d` | 8–15 |
| `16–30d` | 16–30 |
| `31–60d` | 31–60 |
| `60+ d` | 61+ |

1. Busca posições ativas do tipo `OPTION` com `optionDetail.expirationDate >= hoje`.
2. Calcula `daysUntilExpiry = ceil((expirationDate - hoje) / 86400000)`.
3. Classifica cada posição na janela correspondente.
4. Retorna apenas janelas com `count > 0`.

**Valor da posição:** `qty × preçoAtual` (fallback para `averagePrice`).

---

### 6.3 `PendingActionsService`

**Método:** `getPendingActions(advisorId)`

Agrega dois tipos de ação pendente:

**Fonte 1 — Notificações de vencimento (`OPTION_EXPIRY`):**
- Busca notificações não lidas (`isRead = false`) com `severity` em `['CRITICAL', 'WARNING']` e `type = 'OPTION_EXPIRY'`.
- Resolve nome do cliente via `walletId`.
- Emite um item por notificação com `severity: 'critical'` ou `'warning'`.

**Fonte 2 — Clientes inativos (`INACTIVE_CLIENT`):**
- Para cada carteira do advisor, busca a última transação.
- Se inexistente ou executada há mais de 90 dias: emite um item `severity: 'warning'`.
- `daysInactive` usa a data da última transação ou `wallet.createdAt` como referência.
- `costBasis = Σ(quantity × averagePrice)` de todas as posições da carteira.

Resultado ordenado: `critical` antes de `warning`.

---

### 6.4 `DividendsService`

**Método:** `getDividends(advisorId, mode, walletId?, period, customFrom?, customTo?)`

1. Resolve período via `resolvePeriod(period, customFrom, customTo)`.
2. Busca `WalletDividendPayment` com `exDividendDate` dentro do range.
3. Agrupa por mês (`YYYY-MM`), preenchendo gaps com zero.
4. Agrega por ticker para `topPayers` (top 5).
5. Soma `totalPeriod`.

Fonte: tabela `wallet_dividend_payments` (populada pelo módulo Proventos).

---

### 6.5 `AssetConcentrationService`

**Método:** `getAssetConcentration(advisorId, mode, walletId?)`

1. Conta total de clientes do advisor para o cálculo de `overConcentrated`.
2. Busca posições ativas; filtra somente `STOCK`.
3. Agrupa por `assetId`: soma `totalValue`, conta `clientIds` e `walletIds`.
4. Ordena por `totalValue` desc; retorna top 10.
5. Para cada holding:
   - `percentBook = totalValue / totalBookValue × 100`
   - `gainPercent = (preçoAtual - pmédio) / pmédio × 100`
   - `flags.overWeight = percentBook > 20`
   - `flags.overConcentrated = nClients / totalClients > 50%` (somente CONSOLIDATED; no DRILLDOWN, sempre `false`)

---

### 6.6 `SectorExposureService`

**Método:** `getSectorExposure(advisorId, mode, walletId?)`

1. Busca todas as posições ativas (STOCK e OPTION).
2. Para opções, resolve setor via `optionDetail.underlyingAsset.sector`; para ações, usa `asset.sector`. Fallback: `'Não classificado'`.
3. Agrupa por setor: soma valor e conta ativos distintos.
4. Ordena por valor desc.

---

### 6.7 `ClientRankingService`

**Método:** `getClientRanking(advisorId)`

Para cada cliente:
1. Agrega `PerformanceService.computeTotals(walletId)` de todas as carteiras.
2. Soma os totais: `realized`, `unrealized`, `dividends`, `total`, `totalInvested`.
3. `patrimonioR$ = totalInvested + unrealized`
4. `rentabilidadePercent = total / totalInvested × 100`
5. Busca última transação e conta notificações CRITICAL não lidas.

Ordena por `rentabilidadePercent` desc.

---

### 6.8 `PatrimonyEvolutionService`

**Métodos:**

- `getSeries(advisorId, from, to, walletId?) → PatrimonyDataPoint[]` — consumido internamente e pelo `BenchmarkService`
- `getResponse(advisorId, period, customFrom?, customTo?, walletId?) → PatrimonyEvolutionResponse`

**Algoritmo de `getSeries`:**

1. Busca todas as transações no range, ordenadas por data de execução.
2. Para cada ticker envolvido, busca série histórica de preços via `OpLabMarketService.getHistoricalSeries`.
3. Constrói `priceMap[ticker][date] = close`.
4. Itera sobre todos os pregões (datas com pelo menos uma série disponível):
   - Aplica transações acumuladas até essa data (BUY/OPTION_EXERCISE/OPTION_ASSIGNMENT adicionam; SELL/EXPIRED/OPTION_EXPIRY subtraem; opções com `expirationDate ≤ dateTs` são zeradas).
   - Calcula `totalValue = Σ(qty × preço)`, com forward-fill para dias sem cotação.
5. Retorna série de `{ date, totalValue }`.

**Resposta:** `startValue`, `endValue`, `changePercent` derivados dos pontos extremos da série.

---

### 6.9 `BenchmarkService`

**Método:** `getBenchmark(advisorId, period, customFrom?, customTo?, walletId?)`

1. Chama `PatrimonyEvolutionService.getSeries` (portfólio) e `OpLabMarketService.getHistoricalSeries('IBOV', ...)` em paralelo.
2. Normaliza ambas as séries em % acumulada desde o primeiro ponto.
3. Alinha por data: inclui apenas dias presentes em ambas as séries.
4. Retorna série com `portfolioPercent` e `ibovPercent` em cada ponto.

---

### 6.10 `SectorsReseedService`

**Método:** `reseed() → SectorsReseedResponse`

Operação de manutenção (role ADMIN):

1. Busca todos os `Asset` com `sector = null`.
2. Em batches de 10, chama `OpLabMarketService.getMetadata(ticker)`.
3. Se `metadata.sector` existe: `prisma.asset.update({ sector })` → `updated++`.
4. Se `metadata.sector` é nulo/undefined: `skipped++`.
5. Se a chamada lança exceção: `failed++`.

---

## 7. Utilitários de Período

Arquivo: `backend/src/modules/analytics/utils/period.util.ts`

| Função | Assinatura | Descrição |
|--------|-----------|-----------|
| `resolvePeriod` | `(period, customFrom?, customTo?) → { from, to }` | Converte enum de período em datas concretas. `to` sempre é `23:59:59.999` do dia atual. Para `CUSTOM`, usa as datas fornecidas. |
| `formatYYYYMM` | `(date) → string` | Formata para `YYYY-MM` |
| `formatYYYYMMDD` | `(date) → string` | Formata para `YYYY-MM-DD` |
| `monthRange` | `(from, to) → string[]` | Gera lista de meses `YYYY-MM` entre duas datas (inclusivo) |

**Mapeamento de períodos:**

| Enum | Range |
|------|-------|
| `1M` | hoje − 1 mês |
| `3M` | hoje − 3 meses |
| `6M` | hoje − 6 meses |
| `1A` | hoje − 1 ano |
| `YTD` | 1º janeiro do ano corrente até hoje |
| `CUSTOM` | `from` e `to` fornecidos pelo usuário |

---

## 8. Módulo NestJS

Arquivo: `backend/src/modules/analytics/analytics.module.ts`

```ts
@Module({
  imports: [WalletsModule],   // expõe CompositeMarketService, OpLabMarketService, PerformanceService
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

Registrado em `AppModule` junto com os demais módulos do sistema.

---

## 9. Frontend

### Página Principal

Arquivo: `frontend/src/features/analytics/pages/AnalyticsPage.tsx`

Rota: `/analytics` (acessível somente para `ADVISOR` e `ADMIN`).

**Estado local:**

| Estado | Tipo | Default |
|--------|------|---------|
| `mode` | `AnalyticsMode` | `'CONSOLIDATED'` |
| `walletId` | `string \| null` | `null` |
| `period` | `AnalyticsPeriod` | `'1M'` |
| `customFrom` | `string \| undefined` | `undefined` |
| `customTo` | `string \| undefined` | `undefined` |
| `refreshing` | `boolean` | `false` |

**Layout da página (6 linhas):**

| Linha | Widgets | Proporção |
|-------|---------|-----------|
| 1 | Evolução Patrimonial | 100% |
| 2 | Benchmark IBOV (esq.) + Exposição Setorial (dir.) | 70% / 30% |
| 3 | Ações Pendentes (esq.) + Vencimento de Opções (dir.) | 50% / 50% |
| 4 | Concentração de Ativos | 100% |
| 5 | Melhores/Piores (esq.) + Proventos (dir.) | 70% / 30% |
| 6 | Ranking de Clientes (somente CONSOLIDATED) | 100% |

**Botão "Atualizar dados":** chama `invalidateCache` no backend e invalida todas as queries React Query com prefixo `['analytics']`.

**Validação de datas customizadas:** se `customFrom > customTo`, as datas são silenciosamente ignoradas (`safeCustomFrom = undefined`) em vez de propagar um estado inválido para os hooks.

---

### `AnalyticsToggle`

Seletor de modo com botões `Consolidado` / `Carteira`. Em modo DRILLDOWN, exibe `<select>` com as carteiras do advisor (carregadas via `useWallets`).

---

### `PeriodSelector`

Seletor de período com os valores `1M`, `3M`, `6M`, `1A`, `YTD` e `CUSTOM`. Em modo CUSTOM, exibe inputs de data `from` / `to`.

---

### API Client (`analytics.api.ts`)

Funções tipadas que chamam os endpoints backend via axios. Extraem `res.data.data` da resposta padronizada.

Parâmetros opcionais (`walletId`, `from`, `to`) são omitidos da query string quando `undefined` ou falsy.

---

### React Query Hooks (`useAnalytics.ts`)

| Hook | staleTime | Condição de execução |
|------|-----------|---------------------|
| `useBestWorstAssets(p)` | 5min | CONSOLIDATED ou walletId preenchido |
| `useOptionsExpiry(p)` | 5min | CONSOLIDATED ou walletId preenchido |
| `usePendingActions()` | 5min | sempre |
| `useDividends(p)` | 5min | CONSOLIDATED ou walletId preenchido |
| `useAssetConcentration(p)` | 5min | CONSOLIDATED ou walletId preenchido |
| `useSectorExposure(p)` | 5min | CONSOLIDATED ou walletId preenchido |
| `useClientRanking()` | 5min | sempre |
| `usePatrimonyEvolution(p)` | 5min | CONSOLIDATED ou walletId preenchido |
| `useBenchmark(p)` | 5min | CONSOLIDATED ou walletId preenchido |
| `useInvalidateAnalyticsCache()` | — | retorna função que chama DELETE /analytics/cache + queryClient.invalidateQueries |

O staleTime de 5 minutos no cliente espelha o TTL do cache no servidor, evitando refetches desnecessários.

---

### Formatadores (`formatters.ts`)

| Função | Exemplo de saída |
|--------|-----------------|
| `fmtBRL(value)` | `R$ 1.234,56` / `—` |
| `fmtBRLCompact(value)` | `R$ 1,23M` / `R$ 45,6k` |
| `fmtPct(value, opts)` | `+12,34%` / `−3,00%` |
| `fmtDateShort(iso)` | `15 jun` |
| `fmtDateMonth(iso)` | `jun/24` |
| `fmtDaysAgo(iso)` | `há 3d` / `ontem` / `hoje` |
| `daysAgoNum(iso)` | `3` (número de dias) |
| `colorForResult(value)` | `text-tertiary` / `text-error` / `text-on-surface-variant` |

---

## 10. Dependências entre Módulos

| Módulo | Relação |
|--------|---------|
| `WalletsModule` | Exporta `CompositeMarketService` (preços batch), `OpLabMarketService` (histórico, metadata de setor), `PerformanceService` (computeTotals para ClientRanking). Analytics importa `WalletsModule`. |
| `NotificationsModule` | Tabela `notifications` é consumida diretamente pelo `PendingActionsService` via Prisma (sem injeção de serviço). |
| `ProventosModule` | Tabela `wallet_dividend_payments` é consumida pelo `DividendsService` via Prisma. |
| `SentinelModule` | Popula notificações de vencimento de opções (`type = OPTION_EXPIRY`) que o `PendingActionsService` lê. |
| `PrismaService` | Global; todos os services do módulo o injetam diretamente. |

---

## 11. Fluxo Completo — Exemplo: Evolução Patrimonial

```
Usuário acessa /analytics
   │
   ▼
AnalyticsPage monta → chama usePatrimonyEvolution({ mode, period, walletId? })
   │
   ▼
useQuery → analyticsApi.getPatrimonyEvolution(params)
   │  GET /analytics/patrimony-evolution?mode=CONSOLIDATED&period=1A
   ▼
AnalyticsController.getPatrimonyEvolution(q, user)
   │  user.id = "advisor-123"
   ▼
PatrimonyEvolutionService.getResponse("advisor-123", "1A")
   │
   ├─ cache hit? → retorna imediatamente
   │
   └─ cache miss:
       │
       ├─ resolvePeriod("1A") → { from: 2025-05-24, to: 2026-05-24 }
       │
       ├─ getSeries("advisor-123", "2025-05-24", "2026-05-24")
       │    │
       │    ├─ prisma.transaction.findMany (todas as tx do advisor, order by executedAt ASC)
       │    │
       │    ├─ Para cada ticker: oplab.getHistoricalSeries(ticker, from, to)
       │    │
       │    └─ Replay de transações por pregão → totalValue por data
       │
       ├─ startValue, endValue, changePercent
       │
       ├─ cache.set(key, result, TTL=5min)
       │
       └─ return PatrimonyEvolutionResponse
   │
   ▼
ApiResponseDto.success(data) → { success: true, data: { series, startValue, ... } }
   │
   ▼
PatrimonyEvolution widget renderiza gráfico de área
```

---

## 12. Fluxo Completo — Exemplo: Ações Pendentes

```
PendingActionsService.getPendingActions("advisor-123")
   │
   ├─ Fonte 1: notificações
   │    prisma.notification.findMany({
   │      where: { advisorId, isRead: false,
   │               severity: ['CRITICAL','WARNING'],
   │               type: 'OPTION_EXPIRY' }
   │    })
   │    → resolve clientName via walletId
   │    → emite PendingActionItem[]{type:'OPTION_EXPIRY', severity:...}
   │
   └─ Fonte 2: clientes inativos
        Para cada carteira do advisor:
          lastTx = última transação
          if !lastTx || lastTx.executedAt < 90 dias atrás:
            calcula daysInactive e costBasis
            emite PendingActionItem[]{type:'INACTIVE_CLIENT', severity:'warning'}
   │
   ├─ sort: critical → warning
   └─ cache.set + return { items }
```

---

## 13. Edge Cases

### 13.1 Advisor sem clientes ou carteiras

Todos os services que consultam `wallet.findMany` retornam array vazio caso nenhuma carteira seja encontrada. Os services retornam estruturas vazias sem lançar erro.

### 13.2 Preço indisponível para um ticker

`CompositeMarketService.getBatchPrices` pode não retornar o ticker (cache miss + erro OpLab). Todos os services usam `?? Number(pos.averagePrice)` como fallback, garantindo que a posição nunca seja tratada como zero.

### 13.3 Série histórica vazia (patrimony-evolution e benchmark)

Se `oplab.getHistoricalSeries` retornar array vazio para um ou mais tickers, `allDates` será vazio → `points = []` → `startValue = 0`, `endValue = 0`, `changePercent = 0`. O widget exibe estado vazio.

### 13.4 DRILLDOWN com walletId de outro advisor

Todos os services que aceitam `walletId` verificam `wallet.client.advisorId === advisorId` via `findFirst`. Se null: `ForbiddenException` (403).

### 13.5 Período CUSTOM com datas invertidas

O frontend detecta `customFrom > customTo` e substitui por `undefined` antes de enviar. O backend valida com Zod refine e retorna 422 se as datas vierem invertidas diretamente na query string.

### 13.6 Cache cheio (500 entradas)

`AnalyticsCacheService` primeiro tenta remover entradas expiradas. Se ainda estiver cheio, remove a entrada mais antiga (FIFO). Sem bloqueio de inserções.

### 13.7 Opção já vencida no replay de evolução patrimonial

`PatrimonyEvolutionService.getSeries` zera a quantidade de uma opção quando `optionDetail.expirationDate <= dateTs`, mesmo que não haja transação de encerramento registrada. Isso evita supervalorizar o patrimônio com posições expiradas sem registro de EXPIRED/OPTION_EXPIRY.

---

## 14. Sequência de Testes

### 14.1 Testes Unitários

#### `AnalyticsCacheService`

| Nome do teste | Cenário | Resultado esperado |
|---------------|---------|-------------------|
| `it_should_build_deterministic_key_sorted_by_param_name` | Dado params `{b:'2', a:'1'}` e `{a:'1', b:'2'}`, chama `buildKey` | As duas chaves são idênticas: `adv1:widget:a=1&b=2` |
| `it_should_omit_undefined_params_from_key` | `walletId: undefined` no objeto de params | Chave não contém `walletId=` |
| `it_should_return_null_for_missing_key` | Chave inexistente | Retorna `null` |
| `it_should_return_cached_data_before_ttl_expires` | `set` + `get` imediato | Retorna o dado inserido |
| `it_should_return_null_after_ttl_expires` | `set` + avanço de 6 minutos (fake timers) | Retorna `null` |
| `it_should_invalidate_only_entries_for_given_advisor` | Dois advisors no cache; invalida `adv1` | Entradas de `adv1` removidas; `adv2` intacto |
| `it_should_not_exceed_max_entries_capacity` | Inserir 510 entradas | Não lança exceção; entrada mais recente acessível |

#### `resolvePeriod` / `formatYYYYMM` / `formatYYYYMMDD` / `monthRange`

| Nome do teste | Cenário | Resultado esperado |
|---------------|---------|-------------------|
| `it_should_return_custom_range_when_period_is_CUSTOM` | `period='CUSTOM'`, `from='2024-01-01'`, `to='2024-03-31'` | `from` inicia em 2024-01-01; `to` em 2024-03-31 |
| `it_should_return_range_roughly_1_month_back_for_1M` | `period='1M'` | `to - from` entre 27 e 32 dias |
| `it_should_set_to_to_end_of_day` | Qualquer período | `to.getHours() === 23 && to.getMinutes() === 59` |
| `it_should_default_to_1M_for_unknown_period` | `period='UNKNOWN'` | Range igual ao de `1M` |
| `it_should_format_date_to_YYYY_MM` | `new Date('2024-06-15')` | `'2024-06'` |
| `it_should_format_date_to_YYYY_MM_DD` | `new Date('2024-06-15')` | `'2024-06-15'` |
| `it_should_generate_all_months_inclusive` | `from=Jan`, `to=Mar` | `['2024-01', '2024-02', '2024-03']` |
| `it_should_return_single_month_when_same_month` | `from = to = Jun 10` | `['2024-06']` |

#### `SectorsReseedService`

| Nome do teste | Cenário | Resultado esperado |
|---------------|---------|-------------------|
| `it_returns_zero_counts_when_no_assets_need_reseeding` | `asset.findMany` retorna `[]` | `{ updated: 0, failed: 0, skipped: 0 }` |
| `it_updates_assets_that_have_sector_metadata` | 1 asset; `getMetadata` retorna `{ sector: 'Energy' }` | `asset.update` chamado; `updated: 1` |
| `it_skips_assets_whose_metadata_has_no_sector` | `getMetadata` retorna `{ sector: undefined }` | `skipped: 1` |
| `it_counts_failed_assets_when_metadata_fetch_throws` | `getMetadata` rejeita | `failed: 1` |

---

### 14.2 Testes de Integração (Services + Prisma mock)

#### `BestWorstAssetsService`

| Nome do teste | Cenário | Resultado esperado |
|---------------|---------|-------------------|
| `it_should_throw_ForbiddenException_in_DRILLDOWN_for_wallet_not_owned` | `wallet.findFirst` retorna `null` | Lança `ForbiddenException` |
| `it_should_return_top_gains_and_losses_in_CONSOLIDATED_mode` | 1 posição PETR4, pmédio=10, preço=15, qtd=100 | `topGains[0].resultAbsolute === 500` |
| `it_should_return_cached_data_on_second_call` | Segunda chamada com mesmos params | `wallet.findMany` chamado apenas 1 vez |
| `it_should_handle_empty_positions` | `position.findMany` retorna `[]` | `topGains = []`, `topLosses = []` |
| `it_should_use_averagePrice_as_fallback_when_market_price_unavailable` | `getBatchPrices` retorna `{}` | `currentPrice === averagePrice` |

#### `SectorExposureService`

| Nome do teste | Cenário | Resultado esperado |
|---------------|---------|-------------------|
| `it_returns_cached_result_on_cache_hit` | Cache pré-populado com a mesma chave | `wallet.findMany` não chamado |
| `it_returns_empty_sectors_when_advisor_has_no_wallets` | `wallet.findMany` retorna `[]` | `sectors = []`, `totalValue = 0` |

#### `OptionsExpiryService`

| Nome do teste | Cenário | Resultado esperado |
|---------------|---------|-------------------|
| `it_returns_cached_result_on_cache_hit` | Cache pré-populado | Service não acessa Prisma |
| `it_returns_empty_windows_when_no_option_positions` | Nenhuma posição | `windows = []` |

#### `PendingActionsService`

| Nome do teste | Cenário | Resultado esperado |
|---------------|---------|-------------------|
| `it_returns_cached_result_on_cache_hit` | Cache pré-populado | `notification.findMany` não chamado |
| `it_returns_empty_items_when_no_pending_actions` | Sem notificações, sem carteiras inativas | `items = []` |

#### `ClientRankingService`

| Nome do teste | Cenário | Resultado esperado |
|---------------|---------|-------------------|
| `it_returns_cached_result_on_cache_hit` | Cache pré-populado | `client.findMany` não chamado |
| `it_returns_empty_ranking_when_advisor_has_no_clients` | `client.findMany` retorna `[]` | `clients = []` |

---

### 14.3 Testes de Feature / API (Controller)

#### `AnalyticsController`

| Nome do teste | Endpoint | Resultado esperado |
|---------------|---------|-------------------|
| `it_getBestWorst_delegates_to_service_and_wraps_result` | `GET /analytics/best-worst` | Service chamado com `(advisorId, mode, walletId)`; resposta `{ success: true }` |
| `it_getOptionsExpiry_delegates_to_service` | `GET /analytics/options-expiry` | Service chamado; `{ success: true }` |
| `it_getPendingActions_delegates_to_service` | `GET /analytics/pending-actions` | Service chamado com `advisorId`; `{ success: true }` |
| `it_getDividends_delegates_to_service` | `GET /analytics/dividends` | Service chamado com todos os params de período |
| `it_getConcentration_delegates_to_service` | `GET /analytics/concentration` | `{ success: true }` |
| `it_getSectors_delegates_to_service` | `GET /analytics/sectors` | `{ success: true }` |
| `it_getClientRanking_delegates_to_service` | `GET /analytics/client-ranking` | `{ success: true }` |
| `it_getPatrimonyEvolution_delegates_to_service` | `GET /analytics/patrimony-evolution` | Service chamado com `(advisorId, period, from, to, walletId)`; `{ success: true }` |
| `it_getBenchmark_delegates_to_service` | `GET /analytics/benchmark` | `{ success: true }` |
| `it_invalidateCache_calls_invalidateAdvisor_and_returns_success` | `DELETE /analytics/cache` | `invalidateAdvisor(advisorId)` chamado; `{ success: true }` |
| `it_reseedSectors_delegates_to_service` | `POST /analytics/sectors/reseed` | `SectorsReseedService.reseed()` chamado; `{ success: true }` |

**Testes de autenticação e autorização (a implementar):**

| Nome do teste | Cenário | Resultado esperado |
|---------------|---------|-------------------|
| `it_should_return_401_without_jwt_cookie` | Request sem cookie de autenticação | HTTP 401 |
| `it_should_return_403_for_CLIENT_role` | Usuário com role CLIENT | HTTP 403 |
| `it_should_return_403_for_non_admin_calling_reseed` | Usuário ADVISOR chamando `POST /analytics/sectors/reseed` | HTTP 403 |
| `it_should_return_422_when_drilldown_without_walletId` | `mode=DRILLDOWN` sem `walletId` | HTTP 422 com mensagem "walletId é obrigatório no modo DRILLDOWN" |
| `it_should_return_422_when_custom_period_without_dates` | `period=CUSTOM` sem `from` e `to` | HTTP 422 com mensagem "from e to são obrigatórios quando period=CUSTOM" |

---

### 14.4 Testes de Boundary / Edge Cases

| Nome do teste | Cenário | Resultado esperado |
|---------------|---------|-------------------|
| `it_should_handle_zero_total_book_value_in_concentration` | Todas as posições com `quantity = 0` | `totalBookValue = 0`; `percentBook = 0` para todos |
| `it_should_cap_concentration_holdings_at_10` | Advisor com 15 ativos distintos | `holdings.length === 10` |
| `it_should_not_flag_overConcentrated_in_DRILLDOWN_mode` | Mesmo ativo em 100% das carteiras, modo DRILLDOWN | `flags.overConcentrated === false` |
| `it_should_include_only_non_expired_options_in_expiry_widget` | Opção com `expirationDate < hoje` | Não aparece em nenhuma janela |
| `it_should_return_all_5_windows_only_when_positions_exist_in_them` | Posições somente em "≤ 7d" e "16–30d" | `windows.length === 2` |
| `it_should_fill_dividend_months_with_zero_when_no_payments` | Nenhum pagamento em março de um range de 3 meses | `monthly` contém `{ month: 'YYYY-03', total: 0 }` |
| `it_should_compute_sector_from_underlying_asset_for_options` | Posição em opção PETRA240; ativo-objeto tem setor 'Energia' | Setor 'Energia' somado ao mapa setorial |
| `it_should_use_wallet_createdAt_as_reference_for_never_traded_wallets` | Carteira sem nenhuma transação criada há 120 dias | `daysInactive ≈ 120`; item INACTIVE_CLIENT gerado |
| `it_should_sort_pending_actions_critical_before_warning` | 2 itens warning e 1 critical | Critical aparece primeiro na lista |
| `it_should_return_changePercent_zero_when_series_is_empty` | `getHistoricalSeries` retorna array vazio para todos os tickers | `changePercent === 0`; `series = []` |
| `it_should_normalize_both_series_from_first_point_in_benchmark` | Portfólio inicia em R$10.000; IBOV em 130.000 | Ambos com `percent = 0` no primeiro ponto |
| `it_should_exclude_dates_without_ibov_data_from_benchmark` | IBOV não tem cotação em determinado feriado | Data excluída da série alinhada |
| `it_should_process_batch_of_10_assets_in_sectors_reseed` | 25 assets sem setor | `getMetadata` chamado 25 vezes em batches de 10 |
| `it_should_return_zero_rentabilidade_when_total_invested_is_zero` | Cliente sem posições | `rentabilidadePercent === 0` |
| `it_cache_key_is_different_for_different_advisor_ids` | `buildKey('adv1', ...)` e `buildKey('adv2', ...)` | Chaves distintas; não há colisão |
