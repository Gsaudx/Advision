# Proventos — Módulo Sentinel

## Visão Geral

O módulo de proventos usa a técnica de **Opção Sentinela** para detectar dividendos e JCP pagos por empresas. Em vez de consultar a BRAPI (que retorna dados com delay e cobertura limitada), o sistema detecta proventos observando quedas no **preço de exercício (strike)** de opções sobre a ação.

**Princípio de mercado:** Na data ex-dividendo, a B3 reduz automaticamente o strike de todas as opções sobre a ação pelo valor exato do provento pago. Essa queda é rastreável via API da OpLab e serve como fonte primária de verdade para o montante do dividendo.

O sistema Sentinel convive com o backend BRAPI (intacto e funcional), mas substitui os chamadas do frontend para endpoints de proventos da BRAPI. Para reverter completamente para BRAPI: descomentar as chamadas no frontend (marcadas com `// [SENTINEL]`).

---

## 1. Conceito — Opção Sentinela

Para cada ação monitorada (ex: PETR4), o sistema mantém **uma única opção sentinela** — a opção CALL ou PUT com maior vencimento disponível e bid > 0 no mercado. Essa opção é o "termômetro" de dividendos:

- Na data ex-dividendo, o strike da opção sentinela cai exatamente pelo valor do dividendo
- O sistema detecta essa queda comparando o strike histórico dia a dia via OpLab
- Cada queda detectada vira um registro em `dividends_history`

A sentinela é **global por ativo-base** — uma única linha em `sentinel_options` para PETR4, independente de quantas carteiras ou usuários possuem PETR4. Isso garante no máximo 1 chamada à OpLab por ativo por dia.

---

## 2. Modelo de Dados

### `sentinel_options`

```sql
id               UUID PK
underlying_symbol VARCHAR(10) UNIQUE NOT NULL   -- ex: "PETR4"
option_symbol     VARCHAR(20)                   -- ex: "PETRD5" (null quando UNAVAILABLE)
status            ENUM('ACTIVE', 'UNAVAILABLE')
initial_strike    DECIMAL(18,2)                 -- strike_eod no momento da criação
current_strike    DECIMAL(18,2)                 -- strike atualizado após cada check
due_date          DATE                          -- vencimento da opção sentinela atual
monitoring_since  DATE NOT NULL                 -- data de criação (limite retroativo da v1)
last_checked_at   DATE NOT NULL                 -- lock diário global por ativo
scanning_since    DATE                          -- (M2) preenchido durante varredura retroativa
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

**Regras:**
- `UNIQUE(underlying_symbol)` — uma sentinela por ativo-base em todo o sistema
- `monitoring_since` é imutável após criação (v1) e pode ser retroativamente expandido (M2)
- `last_checked_at = hoje` → lock: qualquer abertura de carteira no mesmo dia faz SKIP
- `scanning_since != null` → varredura retroativa em andamento (M2)

### `dividends_history`

```sql
id                UUID PK
underlying_symbol VARCHAR(10) NOT NULL            -- ex: "PETR4"
sentinel_option_id UUID FK sentinel_options(id)
detected_at       DATE NOT NULL                   -- data exata do ajuste de strike
previous_strike   DECIMAL(18,2) NOT NULL
new_strike        DECIMAL(18,2) NOT NULL
dividend_amount   DECIMAL(18,8) NOT NULL          -- previous_strike - new_strike (sempre positivo)
created_at        TIMESTAMP

UNIQUE(underlying_symbol, detected_at, dividend_amount)  -- idempotência
```

**Nota:** `dividend_amount` é sempre positivo — o strike da opção só cai com proventos na B3.

### Extensões em tabelas existentes (Melhorias v2)

**`option_details`** — campo `initial_strike` (M4):
```sql
initial_strike DECIMAL(18,2)   -- strike original da compra; gravado uma vez, nunca sobrescrito por dividendos
```

**`TransactionType` enum** — valor `EXPIRED` (M3):
```sql
BUY | SELL | EXPIRED   -- EXPIRED = opção que venceu sem valor (pó); price = 0, cashBalance inalterado
```

### Relacionamento entre tabelas

```
sentinel_options (1)
    └── dividends_history (N)
         └── referenciado por wallet_dividend_payments (via ticker + exDividendDate)

option_details
    ├── strikePrice     -- strike atual (ajustado por dividendos via M4)
    └── initialStrike   -- strike no momento da compra (imutável por dividendos)
```

---

## 3. Arquitetura do Backend

### Estrutura de módulos

```
src/modules/
└── sentinel/
    ├── sentinel.module.ts
    ├── controllers/
    │   └── sentinel-events.controller.ts   GET /wallets/:id/events (SSE)
    ├── services/
    │   ├── sentinel-option.service.ts       lógica central (5 branches + varredura retroativa)
    │   └── sse.service.ts                   gerenciador de streams SSE
    └── schemas/
        └── sentinel.schema.ts               tipos OpLab (OpLabOptionFlat, OpLabHistoricalEntry)
```

O `SentinelModule` é importado por `WalletsModule` (para injeção em `WalletsService` e `TradingService`) e por `DerivativesModule` (M1: fire-and-forget no `buyOption`). O `SentinelOptionService` é exportado pelo módulo.

### `SentinelOptionService` — responsabilidades

| Método | Visibilidade | O que faz |
|---|---|---|
| `checkWalletSentinels(walletId)` | `async` | Verifica todas as sentinelas da carteira em paralelo; propaga e emite SSE |
| `checkSentinel(underlyingSymbol, walletId)` | `async` | Direciona para o branch correto (1-5) |
| `propagateDividendsToWallet(walletId)` | `async` | Grava dividendos em `wallet_dividend_payments` |
| `triggerRetroactiveScanIfNeeded(ticker, purchaseDate, walletId)` | `async` | Dispara varredura retroativa se necessário (M2) |
| `retroactiveScan(ticker, fromDate, walletId)` | `async` | Orquestra varredura histórica em chunks anuais (M2) |
| `resolveUnderlyingTicker(ticker)` | `async` | STOCK → próprio ticker; OPTION → ticker do ativo-base |
| `fetchHistory(spot, from, to, optionSymbol)` | `async` | Busca histórico de opção na OpLab |
| `createSentinel(symbol, today)` | `private` | Branch 4 — cria nova sentinela |
| `checkForStrikeChanges(sentinel, today, toDate?)` | `private` | Branch 2 — verifica quedas de strike |
| `rollSentinel(sentinel, today)` | `private` | Branch 3 — rola sentinela vencida |
| `retryUnavailable(sentinel, today)` | `private` | Branch 5 — tenta reativar sentinela UNAVAILABLE |
| `propagateStrikeAdjustments(walletId, underlying, amount)` | `async` | M4 — ajusta strike das opções da carteira |
| `processRetroactiveChunk(ticker, sentinelId, from, to, walletId)` | `private` | M2 — processa um chunk anual |
| `detectDividendsInEntries(ticker, sentinelId, entries, walletId)` | `private` | M2 — detecta quedas em sequência histórica |
| `buildAnnualChunks(from, to)` | `private` | M2 — divide período em fatias anuais |
| `fetchHistoryAll(spot, from, to)` | `private` | M2 — busca histórico sem filtrar por symbol |
| `getQuantityAtDate(walletId, assetId, date)` | `private` | Reconstrói quantidade histórica via replay de transações |

### `SseService` — gerenciador de streams

```typescript
// Mapa de walletId → Subject RxJS
private streams = new Map<string, Subject<MessageEvent>>();

getStream(walletId)  // retorna Observable — o frontend se inscreve
emit(walletId, payload)  // emite evento para clientes conectados
close(walletId)  // fecha e remove o stream
```

### `SentinelEventsController` — endpoint SSE

```
GET /wallets/:id/events
Roles: ADVISOR, ADMIN, CLIENT
Autenticação: JWT (cookie HttpOnly)
```

**Defesa em profundidade — 2 camadas independentes:**

| Camada | Validação | Mecanismo |
|---|---|---|
| Controller | Autenticação | `AuthGuard('jwt')` |
| Controller | Autorização por papel | `RolesGuard` + `@Roles(...)` |
| Controller | Formato do UUID | regex antes de qualquer operação |
| Controller | Acesso à carteira | `walletAccess.verifyWalletAccess(walletId, user)` |
| Service | Ticker é STOCK | `checkSentinel()` valida tipo antes de operar |
| Service | Dividendo positivo | `checkForStrikeChanges()` ignora se `diff <= 0.001` |
| Service | Quantidade histórica | `propagateDividendsToWallet()` ignora se `quantity <= 0` |
| Service | Falha na OpLab | `try/catch` — `last_checked_at` não é atualizado se falhar |

---

## 4. Fluxo de Monitoramento — 5 Branches

O método `checkSentinel(underlyingSymbol, walletId)` implementa uma máquina de estados com 5 branches:

```
checkSentinel(symbol, walletId):
  Busca sentinel_options WHERE underlying_symbol = symbol

  BRANCH 1: Existe, ACTIVE, last_checked_at = hoje
      └─ return []  (SKIP — lock diário ativo)

  BRANCH 2: Existe, ACTIVE, last_checked_at < hoje, due_date >= hoje
      └─ checkForStrikeChanges(sentinel, today)
           └─ GET /historical/options/{spot}/{lastChecked}/{hoje}?symbol={optionSymbol}
                ├─ Ordena entradas por data
                ├─ Compara strike de cada dia com referência anterior
                ├─ Cada queda > 0.001 → INSERT dividends_history (ON CONFLICT DO NOTHING)
                └─ UPDATE sentinel SET current_strike, last_checked_at = hoje

  BRANCH 3: Existe, ACTIVE, due_date < hoje  (opção sentinela venceu)
      ├─ checkForStrikeChanges até due_date (dividendos pendentes do período)
      ├─ GET /v3/market/options/{symbol}     (nova opção)
      └─ UPDATE sentinel: novo optionSymbol, strike, dueDate, lastCheckedAt
         (monitoring_since preservado — não deleta o registro)

  BRANCH 4: Não existe
      └─ createSentinel(symbol, today)
           ├─ GET /v3/market/options/{symbol}
           ├─ Filtra bid > 0, due_date > hoje, ordena due_date DESC, pega o maior
           ├─ SIM → INSERT ACTIVE com strike_eod como baseline
           └─ NÃO → INSERT UNAVAILABLE (re-tentativa em 30 dias)

  BRANCH 5: Existe, UNAVAILABLE
      ├─ daysSinceCheck < 30 → return [] (ainda não é hora)
      └─ daysSinceCheck >= 30 → retryUnavailable(sentinel)
           ├─ Encontrou opção → UPDATE para ACTIVE
           └─ Não encontrou → UPDATE last_checked_at = hoje (re-tenta em 30 dias)
```

**Ponto crítico:** A sentinela nunca é deletada — apenas atualizada. Isso preserva `monitoring_since` e todo o histórico de `dividends_history` vinculado.

### Trigger do monitoramento

**Versão v1 (legado):** Trigger estava em `getDashboard()` → bug: React Query cacheava a resposta, então o sentinel só era acionado na primeira abertura. **Solução:** mover o trigger para `SentinelEventsController.events()` — o `useEffect` do frontend abre o SSE a toda renderização, garantindo que o sentinel é sempre acionado.

**Versão v2 (atual):** O trigger ocorre em dois momentos:
1. Ao abrir a carteira (SSE controller, preservado da v1)
2. No momento da compra de ativo (M1 — fire-and-forget encadeado nos controllers de compra)

---

## 5. Propagação de Dividendos

`propagateDividendsToWallet(walletId)` popula `wallet_dividend_payments` a partir de `dividends_history`:

```
Para cada posição STOCK da carteira:
  1. Busca sentinela ativa para o ticker
  2. Busca firstBuy — data de compra mais antiga deste ativo nesta carteira
  3. fromDate = MAX(firstBuy.executedAt, sentinel.monitoringSince)
  4. Busca dividends_history WHERE detected_at >= fromDate
  5. Para cada evento:
     - quantity = getQuantityAtDate(walletId, assetId, detected_at)
       (replay de transações BUY/SELL até aquela data)
     - Se quantity <= 0 → pula (ativo não pertencia ao cliente naquela data)
     - totalReceived = quantity × dividend_amount
     - UPSERT wallet_dividend_payments(walletId, ticker, exDividendDate)
```

**Idempotência:** `UNIQUE(walletId, ticker, exDividendDate)` garante que re-execuções apenas atualizam os valores (upsert), sem criar duplicatas.

**Fonte de dados:** `wallet_dividend_payments` é lida pelos endpoints `GET /proventos/wallet/:id` e `GET /proventos/summary`. O frontend continua usando os mesmos endpoints — a mudança é transparente para a API.

---

## 6. Comunicação em Tempo Real (SSE)

### Fluxo SSE

```
1. Usuário abre carteira
2. Frontend: GET /wallets/:id → dados imediatos (sem bloqueio)
3. Frontend: abre EventSource → GET /wallets/:id/events (SSE)
4. Backend (SSE controller): verifica acesso, retorna Observable
5. Backend (fire-and-forget): checkWalletSentinels(walletId) [background]
6. Após verificação:
   ├─ Dividendos novos → emit { type: 'dividends_updated' }
   └─ Sem novidades   → emit { type: 'check_complete' }
7. Frontend recebe evento → invalida cache de proventos se 'dividends_updated'
8. Frontend fecha a conexão SSE
```

### Frontend — `WalletPage.tsx`

```typescript
useEffect(() => {
  const eventSource = new EventSource(`${VITE_API_URL}/wallets/${walletId}/events`, {
    withCredentials: true,
  });

  eventSource.onmessage = (e) => {
    const event = JSON.parse(e.data);
    if (event.type === 'dividends_updated') {
      void queryClient.invalidateQueries({ queryKey: ['walletProventos', walletId] });
      void queryClient.invalidateQueries({ queryKey: ['wallet', walletId] }); // M4: atualiza strikes
    }
    if (event.type === 'dividends_updated' || event.type === 'check_complete') {
      eventSource.close();
    }
  };

  eventSource.onerror = () => eventSource.close();
  return () => eventSource.close();
}, [walletId, queryClient]);
```

### Endpoint de status da sentinela

```
GET /wallets/:id/sentinel/status
Roles: ALL
Resposta: SentinelStatusItem[]
```

```typescript
interface SentinelStatusItem {
  ticker: string;
  status: 'ACTIVE' | 'UNAVAILABLE' | 'NOT_MONITORED';
  monitoringSince: string | null;  // YYYY-MM-DD
  scanningSince: string | null;    // (M2) YYYY-MM-DD — preenchido durante varredura retroativa
}
```

---

## 7. Melhorias v2

As melhorias v2 (Sentinela Melhorias v1 internamente) adicionam 4 funcionalidades ortogonais, implementadas em ordem de dependência: M4 → M1 → M2 → M3.

---

### M1 — Sentinela na Compra (fire-and-forget encadeado)

**Problema:** Na v1, a sentinela só era criada/verificada ao abrir a carteira. Uma compra retroativa não criava a sentinela imediatamente — o assessor precisava abrir a carteira depois.

**Solução:** Fire-and-forget encadeado nos controllers de compra. Encadeado (não paralelo) para garantir que a sentinela exista antes de disparar a varredura retroativa.

```typescript
// WalletsController.buy() e DerivativesController.buyOption()
(async () => {
  try {
    const sentinelTicker = await this.sentinelService.resolveUnderlyingTicker(body.ticker);
    if (!sentinelTicker) return;
    await this.sentinelService.checkSentinel(sentinelTicker, id);            // cria se não existe
    const purchaseDate = new Date(body.date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (purchaseDate < today) {
      await this.sentinelService.triggerRetroactiveScanIfNeeded(sentinelTicker, purchaseDate, id);
    }
    await this.sentinelService.propagateDividendsToWallet(id);
  } catch (err) {
    this.logger.error(`[M1+M2] Sentinel chain failed for ${body.ticker}`, err);
  }
})();
```

`resolveUnderlyingTicker(ticker)` retorna:
- `ticker` se o ativo for STOCK (ex: `PETR4` → `PETR4`)
- `underlyingAsset.ticker` se for OPTION (ex: `PETRD5` → `PETR4`)
- `null` se o ativo não existir no banco

---

### M2 — Varredura Retroativa

**Problema:** Ao registrar uma compra com data no passado, os dividendos pagos entre a data de compra e hoje não eram detectados — `monitoring_since` era a data de criação da sentinela (hoje), e dividendos anteriores ficavam fora do radar.

**Solução:** `retroactiveScan` percorre o histórico de opções da OpLab desde a data de compra, detectando dividendos em chunks anuais.

#### Algoritmo

```
retroactiveScan(ticker, fromDate, walletId):
  1. Verifica se sentinela existe e está ACTIVE
  2. Se scanning_since != null → varredura já em andamento, pula
  3. UPDATE scanning_since = effectiveFrom (sinaliza ao frontend: calculando…)
  4. buildAnnualChunks(effectiveFrom, monitoring_since):
     Divide o período em fatias 2020-01-01 a hoje, anuais
  5. Para cada chunk:
     processRetroactiveChunk(ticker, sentinelId, from, to, walletId):
       a. fetchHistoryAll(ticker, from, to) — sem filtrar por symbol
       b. Agrupa por symbol, escolhe a série com mais entradas (maior cobertura)
       c. detectDividendsInEntries: compara strike dia a dia, insere em dividends_history
       d. Se a série venceu no meio do chunk, continua com a segunda maior
  6. UPDATE monitoring_since = effectiveFrom, scanning_since = null
  7. emitDividendsUpdatedForTicker: SSE para todas as carteiras com o ticker
```

**Por que chunks anuais?** Uma requisição única para 5 anos de histórico seria instável. Chunks anuais são pequenos, tolerantes a falhas e recomeçáveis — se a OpLab cair no meio, `scanning_since` permanece preenchido como marcador de retomada.

**Indicação visual no frontend:** Badge laranja "Calculando proventos desde DD/MM/AAAA…" exibido quando `scanningSince != null` na resposta do endpoint de status.

#### `triggerRetroactiveScanIfNeeded`

```typescript
// Disparado no fire-and-forget da compra (M1) — só inicia varredura se necessário
async triggerRetroactiveScanIfNeeded(ticker, purchaseDate, walletId):
  sentinel = findUnique(ticker)
  if (!sentinel || UNAVAILABLE) return
  effectiveDate = MAX(purchaseDate, 2020-01-01)
  if (effectiveDate >= monitoring_since) return  // período já coberto
  retroactiveScan(ticker, effectiveDate, walletId).catch(...)  // fire-and-forget
```

---

### M3 — Preço Histórico + Edição/Deleção de Transação + Expiração de Opção

#### M3.1 — Preço histórico de ativo

**Endpoint:**
```
GET /wallets/assets/:ticker/historical-price?date=YYYY-MM-DD
Roles: ADVISOR, ADMIN
```

**Resposta:**
```typescript
interface HistoricalPriceResponse {
  type: 'STOCK' | 'OPTION';
  price: number | null;    // preço de fechamento (ação) ou prêmio (opção)
  strike?: number | null;  // strike vigente naquela data (só para opções)
  message?: string;        // "Sem dados para esta data" quando price = null
}
```

**Lógica no backend:**
- `STOCK`: chama `opLabService.getHistoricalClose(ticker, date)` (candles 1d)
- `OPTION`: chama `sentinelService.fetchHistory(underlying, date, date, ticker)` e retorna `close` + `strike`
- OpLab retorna vazio/inválido para opções vencidas → `try/catch` retorna `{ price: null, message: '...' }` em vez de 500

**Frontend — `UnifiedTradeModal.tsx`:**
Ao mudar a data de compra para um dia no passado, o modal:
1. Detecta se a data é retroativa (`selected < today && ticker preenchido`)
2. Ativa `useHistoricalPrice(ticker, date, enabled)` com `staleTime: Infinity` (dados históricos não mudam)
3. Preenche automaticamente o campo `price` (ação) ou `premium` (opção) quando a resposta chegar
4. Exibe spinner `isFetchingHistorical` abaixo do campo de data

**Hook `useHistoricalPrice`:**
```typescript
// frontend/src/features/wallets/api/useHistoricalPrice.ts
export function useHistoricalPrice(ticker, date, enabled) {
  return useQuery({
    queryKey: ['historicalPrice', ticker, date],
    queryFn: () => walletsApi.getHistoricalPrice(ticker, date),
    enabled: enabled && ticker.length > 0 && date.length > 0,
    staleTime: Infinity,
  });
}
```

#### M3.2 — Edição e deleção de transações

**Endpoints:**
```
PUT    /wallets/:id/transactions/:txId   Roles: ADVISOR, ADMIN
DELETE /wallets/:id/transactions/:txId   Roles: ADVISOR, ADMIN
```

**`PUT` — updateTransaction:**
- Aceita `{ date?, price?, quantity? }` — todos opcionais
- Calcula delta de custo (`oldCost - newCost`) e ajusta `cashBalance` se tipo BUY
- Recalcula `position` via replay de todas as transações (`recalculatePosition`)
- Se `date` mudou e ativo é OPTION: busca `fetchHistory` para atualizar `strikePrice` e `initialStrike`
- Fire-and-forget encadeado: `checkSentinel → triggerRetroactiveScanIfNeeded` se data mudou
- Propaga dividendos ao final

**`DELETE` — deleteTransaction:**
- BUY: `cashBalance += price * qty` (devolve o dinheiro gasto)
- SELL: `cashBalance -= price * qty` (remove o dinheiro recebido)
- EXPIRED: cashBalance inalterado (preço = 0)
- Remove a posição se `quantity` resultante = 0

**`recalculatePosition` — replay de transações:**
```typescript
// Reconstrói quantity e averagePrice do zero a partir de todas as txs BUY/SELL/EXPIRED
// Retorna quantity resultante (0 indica que a posição pode ser removida)
private async recalculatePosition(walletId, assetId): Promise<number>
```

**Frontend — `EditTransactionModal` e delete confirmation:**
- Botões Pencil e Trash2 aparecem na coluna de ações da tabela de transações (BUY/SELL editáveis; BUY/SELL/EXPIRED deletáveis)
- Modal de edição: campo de data para todos os tipos; campos de preço e quantidade apenas para BUY/SELL
- Modal de confirmação de deleção (app-styled, não `window.confirm()`): exibe tipo, ticker, preço e aviso de irreversibilidade
- Hooks: `useUpdateTransaction(walletId)` e `useDeleteTransaction(walletId)` — invalidam `transactionQueryKeys.byWallet(walletId)` e `['wallet', walletId]` no `onSuccess`

#### M3.3 — Expiração de opção (vencimento sem valor)

**Endpoint:**
```
POST /wallets/:id/trade/expire
Body: { ticker: string; expiredAt: string }
Roles: ADVISOR, ADMIN
```

**Lógica:**
- Cria transação `EXPIRED` com `price = 0` na data de vencimento
- `cashBalance` não é afetado (a opção virou pó — nenhum recebimento)
- Remove a posição se `quantity` resultante = 0

**Cenário de uso — opção retroativa vencida:**
Ao registrar uma compra de opção com data no passado onde o vencimento já passou, o `UnifiedTradeModal` detecta a condição e abre o `ExpiredOptionClosingModal`.

**`ExpiredOptionClosingModal.tsx`:**
O assessor escolhe como a opção foi encerrada:
- **"Venceu" (virou pó):** `onConfirm(dueDate, 'expired')` → chama `expireOption` → transação EXPIRED, preço = 0
- **"Vendida antes":** `onConfirm(saleDate, 'sold', salePrice)` → chama `sellAsset` → transação SELL com o prêmio recebido

O campo "Prêmio recebido" busca automaticamente o preço histórico da opção na data de venda via `useQuery` com `gcTime: 0` (garante cache limpo a cada abertura do modal) e `staleTime: 0`.

**Importante:** `gcTime: 0` (não `staleTime: 0`) é necessário para evitar que o campo seja pré-preenchido com o valor de uma sessão anterior ao reabrir o modal.

---

### M4 — Ajuste de Strike por Proventos em Opções

**Problema:** Quando uma empresa paga dividendo, a B3 reduz automaticamente o strike de todas as opções sobre aquela ação. O sistema não refletia esse ajuste — o strike exibido no frontend ficava desatualizado.

**Solução:** `propagateStrikeAdjustments` é chamado sempre que um novo dividendo é detectado (tanto no fluxo de verificação diária quanto na varredura retroativa).

#### Campo `initialStrike`

```prisma
model OptionDetail {
  strikePrice   Decimal   -- strike atual (ajustado por dividendos)
  initialStrike Decimal?  -- strike original da compra (imutável por dividendos)
}
```

- `initialStrike` é gravado **uma única vez**, ao criar o `optionDetail` em `AssetResolverService`
- `propagateStrikeAdjustments` atualiza apenas `strikePrice` — nunca `initialStrike`
- Exceção: `updateTransaction` com mudança de data também atualiza `initialStrike` (assessor corrigiu "quando comprou" — o original muda junto)

#### `propagateStrikeAdjustments`

```typescript
// Subtrai dividendAmount do strikePrice de todas as opções ativas desta carteira
// cujo ativo-base é underlyingSymbol e cujo vencimento >= hoje
async propagateStrikeAdjustments(walletId, underlyingSymbol, dividendAmount): Promise<void>
```

**Escopo:** apenas a carteira que disparou a detecção (lazy — cada carteira ajusta seus próprios dados).

#### Badge visual no frontend

`PositionTable.tsx` exibe badge "Ajustado por proventos" quando `strikePrice < initialStrike`:

```tsx
{position.optionDetail?.initialStrike != null &&
  position.optionDetail.strikePrice < position.optionDetail.initialStrike && (
    <span className="badge-info text-xs">
      Ajustado por proventos
      <span className="text-on-surface-variant ml-1">
        (original: {formatCurrency(position.optionDetail.initialStrike)})
      </span>
    </span>
  )}
```

---

## 8. API — Endpoints

### Módulo Sentinel

| Método | Rota | Roles | Descrição |
|---|---|---|---|
| `GET (SSE)` | `/wallets/:id/events` | ADVISOR, ADMIN, CLIENT | Stream SSE de eventos da sentinela |
| `GET` | `/wallets/:id/sentinel/status` | ALL | Status de monitoramento por ticker da carteira |

### Módulo Wallets — novos endpoints (M3)

| Método | Rota | Roles | Descrição |
|---|---|---|---|
| `GET` | `/wallets/assets/:ticker/historical-price?date=` | ADVISOR, ADMIN | Preço histórico do ativo na data |
| `PUT` | `/wallets/:id/transactions/:txId` | ADVISOR, ADMIN | Edita data/preço/quantidade de transação |
| `DELETE` | `/wallets/:id/transactions/:txId` | ADVISOR, ADMIN | Remove transação e desfaz efeito financeiro |
| `POST` | `/wallets/:id/trade/expire` | ADVISOR, ADMIN | Registra opção como vencida (EXPIRED, price=0) |

### Módulo Wallets — endpoints existentes (não alterados na interface)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/wallets/assets/search?q=` | Busca ativos (OpLab + BD local) |
| `GET` | `/wallets/options/search?underlying=` | Busca opções de um ativo |
| `GET` | `/wallets/options/:ticker/details` | Detalhes + gregas de uma opção |
| `GET` | `/wallets/:id/transactions` | Histórico de transações (cursor pagination) |
| `POST` | `/wallets/:id/trade/buy` | Compra de ativo |
| `POST` | `/wallets/:id/trade/sell` | Venda de ativo |

**Nota sobre `GET /wallets/options/:ticker/details`:** Para opções vencidas (ex: ticker não retorna dados da OpLab), o controller faz fallback para a tabela `option_details` no banco:
```typescript
const details =
  (await this.marketService.getOptionDetails(ticker)) ??
  (await this.walletsService.getOptionDetailsFromDb(ticker));
```

---

## 9. Frontend — Componentes e Hooks

### Novos arquivos (M2/M3)

| Arquivo | Tipo | Descrição |
|---|---|---|
| `api/useHistoricalPrice.ts` | Hook | Busca preço histórico; `staleTime: Infinity` |
| `api/useUpdateTransaction.ts` | Hook | `useUpdateTransaction` e `useDeleteTransaction` |
| `api/useSentinelStatus.ts` | Hook | Busca status de monitoramento por ticker |
| `api/useExpireOption.ts` | Hook | Registra opção como EXPIRED |
| `components/ExpiredOptionClosingModal.tsx` | Componente | Modal de encerramento de opção retroativa vencida |

### Arquivos modificados

| Arquivo | Modificações |
|---|---|
| `pages/WalletPage.tsx` | SSE `useEffect`; `EditTransactionModal` inline; delete confirmation modal; botões Pencil/Trash2 na tabela |
| `components/PositionTable.tsx` | Badge "Monitorado desde"; badge "Calculando proventos…" (M2); badge "Ajustado por proventos" (M4) |
| `components/UnifiedTradeModal.tsx` | `handleAssetDateChange`/`handleOptionDateChange`; `useHistoricalPrice`; `isFetchingHistorical` spinner; `max={displayExpiration}` no input de data de opção |
| `components/ExpiredOptionClosingModal.tsx` | Campo "Prêmio recebido" com `useQuery` de preço histórico (`gcTime: 0`); estado `priceUnavailable` com hint âmbar |
| `api/wallets.api.ts` | `getHistoricalPrice`, `updateTransaction`, `deleteTransaction`, `getSentinelStatus`; `HistoricalPriceResponse`; `SentinelStatusItem.scanningSince` |
| `api/index.ts` | Exportações de todos os novos hooks |

### `OptionTickerAutocomplete` — modo manual (M3 QA)

Para registrar opções vencidas (não retornadas pela OpLab), o componente suporta um terceiro modo `'manual'`:

```typescript
type SearchStep = 'underlying' | 'option' | 'manual';
```

- Link "Digitar ticker da opção manualmente" no dropdown aciona o modo
- Input de texto livre chama `onChange(v)` a cada keystroke, disparando `useOptionDetails` no pai
- O backend faz fallback para `option_details` do banco quando a OpLab não retorna dados da opção

---

## 10. Sistema Legado BRAPI

O backend BRAPI permanece **100% intacto e funcional**. Nenhuma tabela ou service foi removido. A contingência de reversão é:

```
1. Descomentar chamadas BRAPI no frontend       → proventos voltam via BRAPI
2. Descomentar ensureProcessed() em wallets.service.ts → cálculo síncrono volta
3. Desativar SentinelModule no app.module.ts     → sentinela para completamente
```

Os endpoints `GET /proventos/wallet/:id` e `GET /proventos/summary` continuam funcionando sem alteração — eles leem `wallet_dividend_payments`, que agora é populado pela sentinela em vez da BRAPI. O frontend não sabe da diferença.

**Coexistência:** `dividends_history` (sentinela) e `dividend_events` (BRAPI) são tabelas distintas. O sistema sentinela popula `wallet_dividend_payments` diretamente, sem passar por `dividend_events`.

---

## 11. Migrações de Banco de Dados

| Migration | SQL |
|---|---|
| `add_sentinel_options_and_dividends_history` | Cria `sentinel_options` e `dividends_history` |
| `add_initial_strike_to_option_details` | `ALTER TABLE option_details ADD COLUMN initial_strike DECIMAL(18,2)` + backfill |
| `add_scanning_since_to_sentinel_options` | `ALTER TABLE sentinel_options ADD COLUMN scanning_since DATE` |
| `add_expired_to_transaction_type` | `ALTER TYPE "TransactionType" ADD VALUE 'EXPIRED'` (irreversível no PostgreSQL) |

**Backfill de `initial_strike`:** Registros existentes tinham `strike_price` ainda intacto (M4 não havia rodado), portanto `initial_strike = strike_price` é seguro para todos os registros históricos.

---

## 12. Edge Cases e Comportamentos Especiais

### Race condition na criação de sentinela (Branch 4)
Duas carteiras com o mesmo ativo abertas simultaneamente podem tentar criar a sentinela ao mesmo tempo. Solução: capturar `P2002` (Prisma unique constraint) no `catch` de `createSentinel` e tratar como no-op — a sentinela já foi criada pela chamada concorrente.

### OpLab indisponível
`last_checked_at` **não é atualizado** em caso de falha na chamada à OpLab. Na próxima abertura da carteira, o sistema tenta novamente com o mesmo range de datas. Isso garante que nenhum período fique descoberto silenciosamente.

### Opção vencida sem substituto (Branch 3 → UNAVAILABLE)
Se ao rolar a sentinela não existir opção com `bid > 0`, a sentinela volta para UNAVAILABLE. A re-tentativa ocorre automaticamente em 30 dias (Branch 5).

### Compra retroativa com sentinela já existente (v1)
A sentinela não é tocada. A nova posição herda o `monitoring_since` existente. Dividendos entre a data de compra retroativa e `monitoring_since` não são computados na v1. Na v2 (M2), `triggerRetroactiveScanIfNeeded` preenche esse gap automaticamente.

### Filtro de enum via relação no Prisma 7.x
Bug documentado: `where: { asset: { type: 'STOCK' } }` retorna vazio silenciosamente. **Regra:** nunca filtrar enum via relação — sempre filtrar em JavaScript após o `findMany`.

```typescript
// ERRADO — bug silencioso no Prisma 7.x
const positions = await prisma.position.findMany({ where: { walletId, asset: { type: 'STOCK' } } });

// CORRETO
const positions = (await prisma.position.findMany({ where: { walletId }, include: { asset: true } }))
  .filter(p => p.asset.type === 'STOCK');
```

### `Promise.allSettled` engole erros
Sempre iterar sobre os resultados do `Promise.allSettled` e logar os `rejected`:
```typescript
results.forEach((r, i) => {
  if (r.status === 'rejected')
    this.logger.error(`[SENTINEL] checkSentinel(${stockSymbols[i]}) rejeitou: ...`);
});
```

### Cache do React Query em modais (`gcTime: 0`)
Para campos que devem sempre começar vazios ao reabrir um modal (ex: "Prêmio recebido" em `ExpiredOptionClosingModal`), usar `gcTime: 0` — destrói o cache quando a query fica sem subscribers (modal fecha). `staleTime: 0` sozinho não é suficiente — React Query ainda serve cache na remontagem.

---

## 13. Arquivos Relevantes

### Backend — Sentinel

| Arquivo | Responsabilidade |
|---|---|
| `src/modules/sentinel/sentinel.module.ts` | Módulo NestJS (importado por WalletsModule e DerivativesModule) |
| `src/modules/sentinel/services/sentinel-option.service.ts` | Lógica central: 5 branches, varredura retroativa, propagação |
| `src/modules/sentinel/services/sse.service.ts` | Gerenciador de streams SSE (Subject RxJS por walletId) |
| `src/modules/sentinel/controllers/sentinel-events.controller.ts` | Endpoint SSE com defesa em 2 camadas |
| `src/modules/sentinel/schemas/sentinel.schema.ts` | Tipos OpLab (OpLabOptionFlat, OpLabHistoricalEntry) |

### Backend — Wallets (modificados)

| Arquivo | Modificações |
|---|---|
| `src/modules/wallets/services/wallets.service.ts` | `getHistoricalPrice`, `getOptionDetailsFromDb`; injeção de `SentinelOptionService` e `OpLabMarketService` |
| `src/modules/wallets/services/trading.service.ts` | `updateTransaction`, `deleteTransaction`, `expireOption`, `recalculatePosition`; injeção de `SentinelOptionService` |
| `src/modules/wallets/services/asset-resolver.service.ts` | Preenche `initialStrike` ao criar `optionDetail` |
| `src/modules/wallets/controllers/wallets.controller.ts` | Novos endpoints histórico/edição/deleção/expiração; fire-and-forget M1 em `buy()` |
| `src/modules/wallets/schemas/wallet.schema.ts` | `HistoricalPriceResponse`, `UpdateTransactionInputDto`, `ExpireOptionInputDto`, `optionDetail` em `PositionResponseSchema` |
| `src/modules/wallets/wallets.module.ts` | Importa `SentinelModule` |

### Backend — Derivatives (modificados)

| Arquivo | Modificações |
|---|---|
| `src/modules/derivatives/controllers/derivatives.controller.ts` | Fire-and-forget M1 em `buyOption()`; injeção de `SentinelOptionService` |
| `src/modules/derivatives/derivatives.module.ts` | Importa `SentinelModule` |

### Frontend

| Arquivo | Responsabilidade |
|---|---|
| `features/wallets/pages/WalletPage.tsx` | SSE; `EditTransactionModal`; delete confirmation modal |
| `features/wallets/components/PositionTable.tsx` | Badges de monitoramento, varredura, ajuste de strike |
| `features/wallets/components/UnifiedTradeModal.tsx` | Preço histórico ao mudar data; `ExpiredOptionClosingModal` |
| `features/wallets/components/ExpiredOptionClosingModal.tsx` | Modal de encerramento de opção retroativa vencida |
| `features/derivatives/options/components/OptionTickerAutocomplete.tsx` | Modo manual para digitar ticker de opção vencida |
| `features/wallets/api/useHistoricalPrice.ts` | Hook de preço histórico (`staleTime: Infinity`) |
| `features/wallets/api/useUpdateTransaction.ts` | `useUpdateTransaction`, `useDeleteTransaction` |
| `features/wallets/api/useSentinelStatus.ts` | Hook de status de monitoramento |
| `features/wallets/api/useExpireOption.ts` | Hook de expiração de opção |
| `features/wallets/api/wallets.api.ts` | Métodos de API: histórico, edição, deleção, status sentinela |

### Sistema Legado BRAPI (intacto)

| Arquivo | Status |
|---|---|
| `src/modules/proventos/services/brapi-dividends.service.ts` | Intacto — contingência |
| `src/modules/proventos/services/proventos-sync.service.ts` | Intacto — contingência |
| `src/modules/proventos/services/proventos-calculation.service.ts` | Intacto — `ensureProcessed()` comentado em `getDashboard` |
| `src/modules/proventos/controllers/proventos.controller.ts` | Intacto — endpoints BRAPI ainda funcionam |
| `frontend/src/features/proventos/pages/ProventosPage.tsx` | Botão "Forçar sync BRAPI" comentado (`[SENTINEL]`) |
