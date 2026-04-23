# TechSpec — Módulo de Proventos (Advision)

**Versão:** 1.0  
**Data:** 2026-04-19  
**Status:** Documentação do estado atual + gaps de implementação

---

## 1. Visão Geral da Arquitetura

O módulo segue o padrão **CQRS leve** com event store imutável e read model materializado:

```
BRAPI API
    │
    ▼
dividend_events          ← event store imutável (append-only, soft-delete)
    │
    ▼ (lazy, on-read, cooldown 1h)
wallet_dividend_payments ← read model por carteira (upsert idempotente)
    │
    ▼
Position.lastDividendDate
Position.priceAtLastDividend  ← campos desnormalizados para P&L
    │
    ▼
Frontend (React Query, deduplicado)
```

Stack: **NestJS** (backend), **Prisma + PostgreSQL 16** (persistência), **React + Vite + React Query** (frontend), **Decimal.js** (precisão financeira), **BRAPI free tier** (fonte de dados), **OPLAB** (preço histórico).

---

## 2. Banco de Dados

### 2.1 Tabela `dividend_events`

```sql
CREATE TABLE "dividend_events" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticker"          VARCHAR(20) NOT NULL,
  "dividendType"    VARCHAR(50),
  "approvedDate"    DATE,
  "paymentDate"     DATE,
  "exDividendDate"  DATE,
  "valuePerShare"   DECIMAL(18, 8),
  "source"          VARCHAR(20) NOT NULL,       -- hardcoded 'BRAPI_FREE'
  "integrityHash"   VARCHAR(200) UNIQUE NOT NULL,-- SHA-256 para desduplicação
  "rawPayload"      JSONB NOT NULL,
  "referenceWeek"   VARCHAR(10) NOT NULL,        -- 'YYYY-Www' (ISO 8601)
  "importedAt"      TIMESTAMP DEFAULT now(),
  "active"          BOOLEAN DEFAULT true          -- soft-delete
);

CREATE INDEX ON "dividend_events"("ticker");
CREATE INDEX ON "dividend_events"("referenceWeek");
CREATE INDEX ON "dividend_events"("ticker", "referenceWeek");
```

**Regra de negócio codificada:** `integrityHash = SHA-256(ticker|dividendType|approvedDate|paymentDate|valuePerShare)`. O `exDividendDate` **não** entra no hash (decisão arquitetural — revisões do campo `exDividendDate` pela BRAPI criariam duplicatas).

### 2.2 Tabela `dividend_sync_logs`

```sql
CREATE TABLE "dividend_sync_logs" (
  "id"             UUID PRIMARY KEY,
  "syncDate"       DATE UNIQUE NOT NULL,   -- mutex: 1 sync/dia
  "trigger"        VARCHAR(20) NOT NULL,   -- 'APP_STARTUP' | 'ADMIN_LOGIN' | 'MANUAL'
  "userId"         UUID REFERENCES "users"("id"),
  "tickersFound"   INT NOT NULL DEFAULT 0,
  "tickersPending" INT NOT NULL DEFAULT 0,
  "eventsCreated"  INT NOT NULL DEFAULT 0,
  "errors"         INT NOT NULL DEFAULT 0,
  "durationMs"     INT,
  "createdAt"      TIMESTAMP DEFAULT now()
);
```

**Mutex distribuído:** `syncDate UNIQUE` — `createSyncLog` captura erro Prisma `P2002` e retorna `null` (gate já assumido). Garantia de single-writer sem advisory locks.

### 2.3 Tabela `wallet_dividend_payments`

```sql
CREATE TABLE "wallet_dividend_payments" (
  "id"              UUID PRIMARY KEY,
  "walletId"        UUID NOT NULL REFERENCES "wallets"("id") ON DELETE CASCADE,
  "positionId"      UUID NOT NULL REFERENCES "positions"("id") ON DELETE CASCADE,
  "ticker"          VARCHAR(20) NOT NULL,
  "dividendType"    VARCHAR(50),
  "exDividendDate"  DATE NOT NULL,
  "paymentDate"     DATE,
  "valuePerShare"   DECIMAL(18, 8) NOT NULL,
  "quantityAtDate"  DECIMAL(18, 8) NOT NULL,  -- calculado via BUY-SELL
  "totalReceived"   DECIMAL(18, 2) NOT NULL,  -- quantity * valuePerShare

  UNIQUE ("walletId", "ticker", "exDividendDate")  -- chave de upsert
);
```

### 2.4 Campos adicionados em `positions`

```sql
ALTER TABLE "positions"
  ADD COLUMN "dividendsProcessedAt" TIMESTAMP,       -- âncora de invalidação (cooldown)
  ADD COLUMN "lastDividendDate"      DATE,            -- data do último provento recebido
  ADD COLUMN "priceAtLastDividend"   DECIMAL(18, 2);  -- preço OPLAB na data-ex mais recente
```

---

## 3. Módulo NestJS (`ProventosModule`)

### 3.1 Providers e responsabilidades

| Provider | Responsabilidade |
|---|---|
| `BrapiDividendsService` | HTTP client para BRAPI (`GET /quote/:ticker?dividends=true`). Mapeia resposta para `BrapiDividendDto[]`. |
| `ProventosSyncPolicyService` | Lock diário (`alreadySyncedToday`, `createSyncLog`), seleção de tickers pendentes por reference week. |
| `ProventosSyncService` | Orquestra sync completo: busca tickers, filtra pendentes, chama BRAPI, persiste eventos, grava log + domain events. Implementa `OnApplicationBootstrap`. |
| `ProventosCalculationService` | Cálculo lazy por carteira: `ensureProcessed`, `isStale`, `processWallet`, `processPosition`, `getWalletProventos`, `getSummary`. |
| `ProventosService` | Listagem global paginada de `dividend_events`. |
| `OpLabMarketService` | Preço histórico via OPLAB (`getHistoricalClose`). Injetado em `ProventosCalculationService`. |
| `WalletAccessService` | Verificação de autorização de acesso à carteira. |

### 3.2 Exports do módulo

```typescript
exports: [ProventosSyncService, ProventosCalculationService]
// Consumido por: AuthModule (trigger ADMIN_LOGIN), WalletsModule (ensureProcessed no dashboard)
```

---

## 4. Serviços — Detalhe de Implementação

### 4.1 `BrapiDividendsService.fetchDividends(ticker)`

```
GET https://brapi.dev/api/quote/{ticker}?dividends=true
  AbortSignal.timeout(BRAPI_TIMEOUT_MS = 10000)
  → results[0].dividendsData.cashDividends[]
  → BrapiDividendDto {
      ticker, dividendType (label), approvedDate (approvedOn),
      paymentDate, exDividendDate (lastDatePrior),
      valuePerShare (rate), rawPayload
    }
```

### 4.2 `ProventosSyncPolicyService`

**`alreadySyncedToday()`:**
```typescript
prisma.dividendSyncLog.findFirst({
  where: { syncDate: startOfDay(new Date()) }
})
// retorna true se encontrou registro
```

**`createSyncLog(trigger, userId?)`:**
```typescript
try {
  return await prisma.dividendSyncLog.create({
    data: { syncDate: startOfDay(new Date()), trigger, userId }
  })
} catch (e) {
  if (e.code === 'P2002') return null // race condition, outro processo assumiu
  throw e
}
```

**`getTickersPendingSync(tickers[])`:**
```typescript
const currentWeek = getReferenceWeek() // ex: '2026-W16'
const alreadySynced = await prisma.dividendEvent.findMany({
  where: { ticker: { in: tickers }, referenceWeek: currentWeek },
  select: { ticker: true },
  distinct: ['ticker']
})
return tickers.filter(t => !alreadySynced.find(s => s.ticker === t))
```

### 4.3 `ProventosSyncService.trySync(trigger, userId?)`

```
1. if alreadySyncedToday() → return
2. log = createSyncLog(trigger, userId)
   if !log → return (gate assumido)
3. emit DomainEvent('DividendSyncStarted')
4. tickers = SELECT DISTINCT asset.ticker
             FROM positions p JOIN assets a ON p.assetId = a.id
             WHERE a.type = 'STOCK' AND p.quantity > 0
5. pending = getTickersPendingSync(tickers)
6. for ticker of pending:
     events = brapiService.fetchDividends(ticker)
     persistNewEvents(ticker, events)
     await sleep(BRAPI_REQUEST_DELAY_MS = 200)
7. updateSyncLog(logId, { tickersFound, eventsCreated, errors, durationMs })
8. emit DomainEvent('DividendSyncCompleted' | 'DividendSyncFailed')
```

**`persistNewEvents(ticker, events[])`:**
```typescript
const rows = events.map(e => ({
  ticker: e.ticker,
  dividendType: e.dividendType,
  approvedDate: e.approvedDate,
  paymentDate: e.paymentDate,
  exDividendDate: e.exDividendDate,
  valuePerShare: e.valuePerShare,
  source: 'BRAPI_FREE',
  integrityHash: buildIntegrityHash(e), // SHA-256
  rawPayload: e.rawPayload,
  referenceWeek: getReferenceWeek(),
}))
await prisma.dividendEvent.createMany({ data: rows, skipDuplicates: true })
```

### 4.4 `ProventosCalculationService` — núcleo do cálculo

#### `ensureProcessed(walletId)`

Gate de entrada para qualquer leitura de proventos da carteira:

```typescript
const needsCheck = await prisma.position.findFirst({
  where: {
    walletId,
    asset: { type: 'STOCK' },
    OR: [
      { dividendsProcessedAt: null },
      { dividendsProcessedAt: { lt: subHours(new Date(), 1) } }
    ]
  }
})
if (!needsCheck) return // all positions within cooldown
if (await this.isStale(walletId)) await this.processWallet(walletId)
```

#### `isStale(walletId)`

Detecta novidade sem N+1:

```typescript
const positions = await prisma.position.findMany({
  where: { walletId, asset: { type: 'STOCK' } },
  select: { dividendsProcessedAt: true, asset: { select: { ticker: true } } }
})
// Early exit: nunca processada
if (positions.some(p => !p.dividendsProcessedAt)) return true

// 1 query com OR para todos os tickers
const hasNew = await prisma.dividendEvent.findFirst({
  where: {
    active: true,
    OR: positions.map(p => ({
      ticker: p.asset.ticker,
      importedAt: { gt: p.dividendsProcessedAt }
    }))
  }
})
return !!hasNew
```

#### `processPosition(walletId, position)`

```
1. firstBuy = SELECT MIN(executedAt) FROM transactions
              WHERE walletId = :walletId AND assetId = :assetId AND type = 'BUY'
   if !firstBuy → marcar dividendsProcessedAt = now() e return

2. events = SELECT * FROM dividend_events
            WHERE ticker = :ticker AND exDividendDate >= firstBuy.executedAt AND active = true
            ORDER BY exDividendDate ASC

3. lastEvent = null
   for event of events:
     if !event.exDividendDate || !event.valuePerShare → skip
     
     quantity = getQuantityAtDate(walletId, assetId, event.exDividendDate)
     // Decimal: sum BUY - sum SELL WHERE executedAt <= exDividendDate
     
     if quantity < 0 → warn('data corruption') and skip
     if quantity === 0 → skip (não possuía na data-ex)
     
     totalReceived = quantity.mul(event.valuePerShare)
     
     await prisma.walletDividendPayment.upsert({
       where: { walletId_ticker_exDividendDate: { walletId, ticker, exDividendDate } },
       create: { walletId, positionId, ticker, dividendType, exDividendDate,
                 paymentDate, valuePerShare, quantityAtDate: quantity, totalReceived },
       update: { quantityAtDate: quantity, totalReceived, paymentDate, valuePerShare }
     })
     lastEvent = event

4. priceAtLastDividend = lastEvent
     ? await oplab.getHistoricalClose(ticker, lastEvent.exDividendDate)
     : undefined

5. await prisma.position.update({
     where: { id: position.id },
     data: {
       dividendsProcessedAt: new Date(),
       lastDividendDate: lastEvent?.paymentDate ?? lastEvent?.exDividendDate ?? undefined,
       priceAtLastDividend: priceAtLastDividend ?? undefined
     }
   })
```

#### `getQuantityAtDate(walletId, assetId, date)`

```typescript
const txs = await prisma.transaction.findMany({
  where: { walletId, assetId, type: { in: ['BUY', 'SELL'] }, executedAt: { lte: date } }
})
return txs.reduce((acc, tx) => {
  return tx.type === 'BUY'
    ? acc.plus(new Decimal(tx.quantity))
    : acc.minus(new Decimal(tx.quantity))
}, new Decimal(0))
```

---

## 5. API Endpoints

### Controller: `ProventosController` (`/proventos`)

Todos com `AuthGuard('jwt')` + `RolesGuard`.

#### `GET /proventos`
- **Roles:** ADMIN, ADVISOR, CLIENT
- **Query params:** `ticker?: string`, `skip?: number`, `take?: number` (default 20, max 100)
- **Response:** `DividendEventListApiResponseDto`
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "ticker": "PETR4",
        "dividendType": "DIVIDENDO",
        "exDividendDate": "2026-01-15",
        "paymentDate": "2026-02-01",
        "valuePerShare": "1.23456789"
      }
    ],
    "total": 150,
    "skip": 0,
    "take": 20
  }
}
```

#### `GET /proventos/wallet/:walletId`
- **Roles:** ADMIN, ADVISOR, CLIENT
- **Auth extra:** `WalletAccessService.verifyWalletAccess(walletId, actor)` — valida UUID regex antes
- **Response:** `WalletProventosApiResponseDto`
```json
{
  "success": true,
  "data": {
    "walletId": "uuid",
    "items": [
      {
        "ticker": "PETR4",
        "dividendType": "DIVIDENDO",
        "exDividendDate": "2026-01-15",
        "paymentDate": "2026-02-01",
        "valuePerShare": "1.23456789",
        "quantityAtDate": "100.00000000",
        "totalReceived": "123.46"
      }
    ],
    "totalReceived": "456.78"
  }
}
```

#### `GET /proventos/summary?walletId=`
- **Roles:** ADMIN, ADVISOR, CLIENT
- **Auth extra:** `WalletAccessService.verifyWalletAccess`
- **Response:** `ProventosSummaryApiResponseDto`
```json
{
  "success": true,
  "data": [
    {
      "ticker": "PETR4",
      "totalReceived": "456.78",
      "eventsCount": 3,
      "lastDividendDate": "2026-02-01"
    }
  ]
}
```

#### `POST /proventos/sync` *(temporário — remover antes de produção)*
- **Roles:** ADMIN, ADVISOR
- **Ação:** `syncService.forceSync()` — bypassa daily lock
- **Response:** `{ success: true, data: null }`

---

## 6. Gatilhos de Sync

| Trigger | Condição | Implementação |
|---|---|---|
| `APP_STARTUP` | `NODE_ENV === 'development'` | `ProventosSyncService implements OnApplicationBootstrap` → `trySync('APP_STARTUP')` |
| `ADMIN_LOGIN` | `req.user.role === 'ADMIN'` no login | `AuthController.login` → `proventosSyncService.trySyncAfterAdminLogin(userId)` |
| `MANUAL` | `POST /proventos/sync` | `forceSync()` → `runSync('MANUAL')` — sem check de daily lock |

**Ausência de cron:** o cálculo por carteira é 100% lazy (on-read). O sync global não possui cron — **gap GAP-04**.

---

## 7. Integrações Externas

### 7.1 BRAPI (`BrapiDividendsService`)

- **Endpoint:** `GET {BRAPI_BASE_URL}/quote/{ticker}?dividends=true`
- **Autenticação:** token via query param (se configurado) ou free tier
- **Timeout:** `BRAPI_TIMEOUT_MS` (padrão: 10000ms) via `AbortSignal.timeout`
- **Rate limiting:** `BRAPI_REQUEST_DELAY_MS` (padrão: 200ms) entre requests sequenciais
- **Campo mapeado:** `results[0].dividendsData.cashDividends`

| Campo BRAPI | Campo interno |
|---|---|
| `label` | `dividendType` |
| `approvedOn` | `approvedDate` |
| `paymentDate` | `paymentDate` |
| `lastDatePrior` | `exDividendDate` |
| `rate` | `valuePerShare` |

### 7.2 OPLAB (`OpLabMarketService`)

- **Endpoint:** `GET /market/instruments/{ticker}/candles/1d?from=&to=&smooth=true&df=iso`
- **Parâmetro `smooth=true`:** preenche feriados com fechamento anterior
- **Uso:** somente para o evento mais recente por posição (obtém `priceAtLastDividend`)
- **Fallback:** se `OPLAB_ACCESS_TOKEN` ausente ou requisição falhar, retorna `null` → `priceAtLastDividend` não é preenchido → P&L usa `averagePrice` normalmente

---

## 8. Frontend

### 8.1 Cliente HTTP

`/frontend/src/lib/axios.ts`:
- `baseURL = VITE_API_URL || 'http://localhost:3000'`
- `withCredentials: true` (cookie JWT)
- Interceptor: redireciona para `/login` em 401

### 8.2 API Client (`proventos.api.ts`)

```typescript
export const proventosApi = {
  forceSync: () => api.post('/proventos/sync'),
  getAll: (params) => api.get('/proventos', { params }).then(r => r.data.data),
  getWalletProventos: (walletId) => api.get(`/proventos/wallet/${walletId}`).then(r => r.data.data),
  getSummary: (walletId) => api.get('/proventos/summary', { params: { walletId } }).then(r => r.data.data),
}
```

### 8.3 React Query Hooks

```typescript
// Listagem global
useProventos({ ticker, skip, take })
  queryKey: ['proventos', ticker, skip, take]
  queryFn: proventosApi.getAll(...)

// Por carteira — deduplicado automaticamente quando múltiplos componentes pedem o mesmo walletId
useWalletProventos(walletId, enabled = true)
  queryKey: ['walletProventos', walletId]
  queryFn: proventosApi.getWalletProventos(walletId)
  enabled: !!walletId && enabled
```

### 8.4 Componentes

| Componente | Arquivo | Dados consumidos |
|---|---|---|
| `ProventosPage` | `features/proventos/pages/ProventosPage.tsx` | `useProventos` |
| `ProventosTab` | `features/wallets/components/ProventosTab.tsx` | `useWalletProventos` (via props de `WalletPage`) |
| `PositionTable` | `features/wallets/components/PositionTable.tsx` | `proventos?: WalletProvento[]` (via props) |
| `WalletPage` | `features/wallets/pages/WalletPage.tsx` | `useWalletProventos(walletId)` (distribui para filhos) |

### 8.5 Lógica no frontend

O frontend **não executa cálculos financeiros**. A única lógica presente é:

1. **`buildSummary(items)`** em `ProventosTab.tsx` — agrupa `WalletProvento[]` por ticker em memória para os cards de resumo (soma `totalReceived`, conta eventos, guarda maior `paymentDate`). Dados brutos já vêm calculados do backend.

2. **`getUpcomingPayment(ticker, proventos)`** em `PositionTable.tsx` — filtra proventos do ticker com `paymentDate` entre hoje e hoje+30 dias, ordena ascendente, retorna o mais próximo. Somente para `position.type === 'STOCK'`.

---

## 9. Tipos TypeScript (Frontend)

`/frontend/src/features/proventos/types/index.ts`:

```typescript
export interface WalletProvento {
  ticker: string
  dividendType?: string
  exDividendDate: string
  paymentDate?: string
  valuePerShare: string
  quantityAtDate: string
  totalReceived: string
}

export interface WalletProventosResult {
  walletId: string
  items: WalletProvento[]
  totalReceived: string
}

export interface ProventosSummaryItem {
  ticker: string
  totalReceived: string
  eventsCount: number
  lastDividendDate?: string
}

export interface DividendEvent {
  id: string
  ticker: string
  dividendType?: string
  exDividendDate?: string
  paymentDate?: string
  valuePerShare?: string
}

export interface DividendEventList {
  items: DividendEvent[]
  total: number
  skip: number
  take: number
}
```

**Nota:** `api.d.ts` (gerado) não inclui `lastDividendDate` e `priceAtLastDividend` em `Position`. Workaround: `/frontend/src/features/wallets/types/index.ts` estende o tipo localmente — **GAP-06**.

---

## 10. Resposta à Pergunta 3 — Recálculo de Opções

**Resposta: NÃO. O sistema não recalcula opções quando um novo provento é registrado.**

Evidências:
- Grep em `backend/src/modules/derivatives/` e `backend/src/modules/optimization/` por `dividend|provento` retorna **zero matches**.
- `StructuredOperation`, `OperationLeg`, `OptionDetail`, `OptionLifecycle` armazenam `strikePrice`, `price`, `totalValue`, `settlementAmount` como valores imutáveis definidos na criação.
- Domain events `DividendSyncCompleted` não possuem nenhum handler consumidor. São gravados em `domain_events` mas nenhum subscriber existe.
- O módulo `ProventosModule` exporta apenas `ProventosSyncService` e `ProventosCalculationService` — nenhum é importado por `DerivativesModule` ou `OptimizationModule`.

**O que acontece quando um novo dividendo é registrado:**
1. `dividend_events` ganha uma nova linha.
2. Na próxima leitura de uma carteira com aquele ticker, `isStale()` retorna `true` e `processWallet()` reprocessa as posições STOCK.
3. Estratégias de opções sobre o mesmo ativo **não são tocadas**.

**Impacto prático:**
- Se uma opção foi estruturada antes de um dividendo relevante, o sistema continua exibindo o moneyness e P&L originais sem ajuste.
- Preços em tempo real via OPLAB atualizam dinamicamente (refletem a realidade de mercado), mas os campos calculados e armazenados nas estruturas de derivativos não são revisitados.

---

## 11. Gaps Técnicos Detalhados

### GAP-01 — Integração Proventos ↔ Opções
**Ausente:**
- Handler para `DividendSyncCompleted` no módulo de derivativos.
- Ajuste de `OptionDetail.strikePrice` por provento (ex: modelo B3).
- Flag em `StructuredOperation` indicando que foi criada "pré-dividendo".
- Recálculo de `OperationLeg.totalValue` após novo sync.

**Arquivos a criar/modificar:**
- Novo subscriber: `backend/src/modules/derivatives/handlers/dividend-sync-completed.handler.ts`
- Ou: decisão explícita de não implementar, documentada em `MODULES/DERIVATIVES.md`

### GAP-02 — Splits (task-005)
**Ausente em `getQuantityAtDate`:**
```typescript
// Falta: ajuste de quantidade por eventos de split/bonificação
// SELECT * FROM corporate_actions WHERE ticker = :ticker AND type = 'SPLIT' AND date <= :date
// ratio = produto de todos os ratios até a data
// quantity = quantity * ratio
```
Não existe modelo `CorporateAction` no schema atual.

### GAP-03 — Transação DIVIDEND (task-004 pausada)
**Ausente em `processPosition`:**
```typescript
// Após upsert do WalletDividendPayment, faltaria:
await prisma.transaction.create({
  data: {
    walletId, assetId, type: 'DIVIDEND',
    quantity: 0,
    price: totalReceived,
    executedAt: event.paymentDate ?? event.exDividendDate,
  }
})
// E: atualizar cashBalance da carteira
```
Decisão pendente: o `cashBalance` deve ser afetado? Em que data? Como tratar JCP (tributado) vs dividendo (isento)?

### GAP-04 — Cron Job de Sync
**Ausente:** `ProventosSyncService` não implementa nenhum `@Cron`. Em produção, o sync só ocorre via login de admin.

**Solução simples:**
```typescript
@Cron('0 6 * * *') // 06:00 todo dia
async scheduledSync() {
  await this.trySync('SCHEDULED')
}
```
Requer importar `ScheduleModule` em `AppModule`.

### GAP-05 — Endpoint manual a remover
`ProventosController.forceSync` e `POST /proventos/sync` — remover antes de produção ou restringir para `ADMIN` com auditoria.

### GAP-06 — Tipos desatualizados no frontend
`api.d.ts` deve ser regenerado (ou script de geração de tipos deve incluir campos `lastDividendDate` e `priceAtLastDividend` do schema Prisma).

---

## 12. Fluxo de Dados — Diagrama Textual

```
[Trigger: ADMIN_LOGIN / APP_STARTUP / MANUAL]
    │
    ▼
ProventosSyncService.trySync()
    ├─ alreadySyncedToday()? → return
    ├─ createSyncLog() → P2002? return (race condition)
    ├─ emit DividendSyncStarted
    ├─ SELECT distinct STOCK tickers with open positions
    ├─ filter by referenceWeek (skip já sincronizados esta semana)
    └─ for each pending ticker:
           BrapiDividendsService.fetchDividends(ticker)
           persistNewEvents(): createMany({ skipDuplicates: true, integrityHash })
           sleep(200ms)
    ├─ updateSyncLog(metrics)
    └─ emit DividendSyncCompleted | DividendSyncFailed

[User opens wallet or requests /proventos/wallet/:id]
    │
    ▼
ProventosCalculationService.ensureProcessed(walletId)
    ├─ findFirst STOCK position: dividendsProcessedAt IS NULL OR < now()-1h?
    │   └─ none → return (all within cooldown)
    └─ isStale(walletId)?
           ├─ any dividendsProcessedAt IS NULL? → stale
           └─ 1-query OR: any dividendEvent.importedAt > dividendsProcessedAt? → stale
        └─ processWallet(walletId)
               for each STOCK position:
                   processPosition(walletId, position)
                       ├─ firstBuy date
                       ├─ fetch dividend_events WHERE ticker AND exDate >= firstBuy
                       ├─ for each event:
                       │       getQuantityAtDate (Decimal BUY-SELL)
                       │       upsert WalletDividendPayment
                       └─ update Position: dividendsProcessedAt, lastDividendDate, priceAtLastDividend

ProventosCalculationService.getWalletProventos(walletId)
    ├─ ensureProcessed(walletId)
    └─ SELECT * FROM wallet_dividend_payments WHERE walletId ORDER BY ticker, exDividendDate
       → { walletId, items[], totalReceived }

[Frontend]
    useWalletProventos(walletId) → React Query deduplicado
        → ProventosTab: card total + grid por ticker + tabela detalhada
        → PositionTable: tag "Provento a ser pago" (paymentDate entre hoje e hoje+30d)
```
