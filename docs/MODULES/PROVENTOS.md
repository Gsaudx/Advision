# Proventos — Documentação do Módulo

## Visão Geral

O módulo de proventos rastreia dividendos e JCP recebidos pelos ativos (ações) de cada carteira. O fluxo tem duas etapas independentes:

1. **Sync**: busca eventos de dividendo na API BRAPI e salva na tabela `dividend_events`
2. **Cálculo**: cruza esses eventos com as transações da carteira para calcular quanto cada carteira recebeu, salvando em `wallet_dividend_payments`

---

## 1. Sync de Dividendos (BRAPI)

### Quem faz
`ProventosSyncService` + `BrapiDividendsService`

### Quando é disparado
| Gatilho | Condição |
|---|---|
| `APP_STARTUP` | Apenas em ambiente `development` |
| `ADMIN_LOGIN` | Quando um admin faz login |
| `MANUAL` | Endpoint `POST /proventos/sync` (temporário, será removido) |

### Regra de execução (daily lock)
Antes de qualquer sync, `ProventosSyncPolicyService.alreadySyncedToday()` verifica se já existe um registro em `dividend_sync_logs` com `syncDate = hoje`. Se sim, o sync é abortado. Isso garante **no máximo 1 sync por dia por ambiente**, usando o banco como mutex.

### Regra de eficiência (reference week)
Dentro do sync diário, apenas os tickers que **ainda não foram sincronizados na semana corrente** são buscados. `getTickersPendingSync()` filtra os tickers que já têm eventos com `referenceWeek = semana atual` na tabela `dividend_events`.

### Quais tickers são buscados
Apenas tickers de ativos do tipo `STOCK` que têm pelo menos uma posição ativa (`quantity > 0`) em qualquer carteira.

### O que é salvo
Cada evento retornado pela BRAPI vira um registro em `dividend_events` com `skipDuplicates: true` usando o campo `integrityHash` (hash SHA-256 do ticker + tipo + datas + valor). Eventos duplicados são silenciosamente ignorados.

### Delay entre requests
Configurável via `BRAPI_REQUEST_DELAY_MS` (padrão: 200ms) para não sobrecarregar a API gratuita.

---

## 2. Cálculo por Carteira

### Quem faz
`ProventosCalculationService`

### Quando é disparado
Toda vez que alguém lê proventos de uma carteira (`getWalletProventos`, `getSummary`) ou abre o dashboard da carteira (`getDashboard` no `WalletsService`). Mas o processamento só acontece se necessário — ver seção de cooldown abaixo.

### Tabela de resultado
`wallet_dividend_payments` — uma linha por combinação única de `(walletId, ticker, exDividendDate)`. Funciona como cache materializado do cálculo.

---

## 3. Controle de Reprocessamento (Cooldown + Staleness)

O processamento por carteira é protegido por duas verificações em sequência para evitar trabalho desnecessário.

### Fast path (cooldown de 1 hora)
`ensureProcessed()` faz uma única query no banco:

```
SELECT id FROM positions
WHERE walletId = ?
  AND asset.type = 'STOCK'
  AND (dividendsProcessedAt IS NULL OR dividendsProcessedAt < now() - 1h)
LIMIT 1
```

- Se **não encontrar nada**: todas as posições foram processadas há menos de 1 hora → retorna imediatamente, sem fazer mais nada.
- Se **encontrar**: alguma posição está fora do cooldown → passa para a verificação de staleness.

### Verificação de staleness (isStale)
Faz **uma única query com OR** para todos os tickers da carteira:

```
SELECT id FROM dividend_events
WHERE active = true
  AND (
    (ticker = 'PETR4' AND importedAt > <dividendsProcessedAt de PETR4>)
    OR (ticker = 'VALE3' AND importedAt > <dividendsProcessedAt de VALE3>)
    ...
  )
LIMIT 1
```

- Se **não encontrar**: nenhum evento novo para nenhum ticker → não há nada a reprocessar.
- Se **encontrar**: algum ticker tem evento novo → dispara `processWallet`.

Essa abordagem substitui o loop N+1 original (1 query por ticker) por uma única query com condições OR.

---

## 4. Processamento de uma Posição (processPosition)

Para cada posição STOCK da carteira:

1. Busca a primeira transação de compra (`BUY`) do ativo — essa é a data de início do investimento.
2. Busca todos os `dividend_events` do ticker com `exDividendDate >= primeira_compra` e `active = true`.
3. Para cada evento:
   - Recalcula a quantidade que o cliente tinha na data-ex somando BUYs e subtraindo SELLs até aquela data (`getQuantityAtDate`).
   - Se quantidade = 0: ignora o evento (cliente não tinha o ativo naquele dia).
   - Se quantidade < 0: loga warning (possível corrupção de dados) e ignora.
   - Calcula `totalReceived = quantidade × valuePerShare`.
   - Faz upsert em `wallet_dividend_payments`.
4. Ao final, atualiza `dividendsProcessedAt = now()` na posição e busca o preço histórico do ativo na data-ex mais recente via OPLAB (salvo em `priceAtLastDividend`).

**Nota:** Se a posição não tiver nenhum BUY, loga warning e marca como processada para não tentar novamente a cada leitura.

---

## 5. Consumo no Frontend

### Hook
`useWalletProventos(walletId)` — React Query com `queryKey: ['walletProventos', walletId]`

O React Query **deduplica** chamadas com a mesma chave: mesmo que `WalletDashboard` e `ProventosTab` chamem o hook simultaneamente, apenas **1 request HTTP** é feito.

### Endpoints
| Endpoint | Descrição |
|---|---|
| `GET /proventos/wallet/:walletId` | Todos os eventos por carteira (detalhado) |
| `GET /proventos/summary?walletId=` | Totais agrupados por ticker |
| `GET /proventos` | Lista global de eventos (filtrável por ticker, paginado) |

### Autorização
Todos os endpoints exigem JWT válido + verificação de acesso à carteira via `WalletAccessService.verifyWalletAccess()`. UUID do walletId é validado por regex antes de qualquer query.

### UI
- **Aba Proventos** (`ProventosTab`): total recebido, cards por ticker, tabela detalhada com tipo, data-ex, data de pagamento, quantidade, valor/ação e total.
- **PositionTable**: tag "Provento a ser pago: DD/MM/AAAA" (verde) quando há pagamento nos próximos 30 dias para aquele ativo.

---

## 6. Diagrama do Fluxo

```
BRAPI API
   │
   │ (1x por dia, por ticker pendente na semana)
   ▼
dividend_events (tabela de eventos brutos)
   │
   │ ensureProcessed() → isStale() → processWallet()
   │ (acionado na leitura, cooldown 1h por posição)
   ▼
wallet_dividend_payments (cache materializado por carteira)
   │
   │ GET /proventos/wallet/:id
   ▼
Frontend (ProventosTab + PositionTable tags)
```

---

## 7. Arquivos Relevantes

| Arquivo | Responsabilidade |
|---|---|
| `backend/src/modules/proventos/services/brapi-dividends.service.ts` | Fetch e mapeamento da BRAPI |
| `backend/src/modules/proventos/services/proventos-sync-policy.service.ts` | Daily lock + reference week |
| `backend/src/modules/proventos/services/proventos-sync.service.ts` | Orquestração do sync |
| `backend/src/modules/proventos/services/proventos-calculation.service.ts` | Cooldown, staleness, processamento por posição |
| `backend/src/modules/proventos/services/proventos.service.ts` | Listagem global de eventos |
| `backend/src/modules/proventos/controllers/proventos.controller.ts` | Endpoints REST |
| `backend/src/modules/wallets/services/wallets.service.ts` | Chama `ensureProcessed` no `getDashboard` |
| `frontend/src/features/proventos/api/useWalletProventos.ts` | Hook React Query |
| `frontend/src/features/wallets/components/ProventosTab.tsx` | Aba de proventos na carteira |
| `frontend/src/features/wallets/components/PositionTable.tsx` | Tags de provento futuro |
