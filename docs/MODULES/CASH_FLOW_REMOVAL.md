# Remoção do Fluxo de Caixa

## Visão Geral

A branch `removendo-fluxo-caixa` remove completamente o conceito de **saldo em caixa** (`cashBalance`) e **colateral bloqueado** (`blockedCollateral`) do Advision. O sistema passa a modelar o patrimônio exclusivamente via **posições abertas**, alinhando o modelo de dados à realidade de um sistema de gestão de carteiras de investimento — não de conta corrente.

**Motivação:** O fluxo de caixa criava fricção desnecessária no registro de operações (validação de saldo, bloqueio de colateral, DEPOSIT/WITHDRAWAL como pré-requisito para qualquer compra) e distorcia o cálculo de patrimônio do assessor. Para o TCC, o modelo "posições como fonte da verdade" é mais simples, correto e alinhado com o que corretoras brasileiras reportam.

---

## 1. Decisões de Domínio

| Decisão | Antes | Depois |
|---------|-------|--------|
| **Patrimônio da carteira** | `cashBalance + Σ(qty × preço_mercado)` | 3 métricas: `totalCostBasis`, `totalMarketValue`, `totalUnrealizedPL` |
| **Patrimônio do assessor** | `Σ(cashBalance)` de todas as carteiras | `Σ(qty × averagePrice)` de todas as posições abertas |
| **Compra de ativo** | Verifica e debita `cashBalance` | Registra posição diretamente — sem validação de saldo |
| **Venda de ativo** | Credita `cashBalance` | Registra venda diretamente — sem crédito de saldo |
| **Compra de opção** | Verifica `cashBalance - blockedCollateral >= custo` | Registra posição diretamente |
| **Venda de opção (PUT short)** | Bloqueia colateral em `blockedCollateral` | Registra posição diretamente |
| **Criação de carteira** | Aceita `initialCashBalance`, cria Transaction DEPOSIT | Cria carteira sem saldo inicial |
| **DEPOSIT / WITHDRAWAL** | Tipos válidos no enum `TransactionType` | Removidos do schema e dos dados históricos |

### Novo modelo de patrimônio (3 métricas)

| Métrica | Fórmula | Significado |
|---------|---------|-------------|
| **Total Investido (Cost Basis)** | `Σ(position.quantity × position.averagePrice)` | Quanto foi desembolsado para comprar todas as posições abertas |
| **Valor de Mercado (Market Value)** | `Σ(position.quantity × position.currentPrice)` | Quanto vale o portfólio a preços atuais |
| **Lucro/Prejuízo Não Realizado** | `totalMarketValue − totalCostBasis` | Diferença entre valor atual e custo — positivo = ganho |

> Essas 3 métricas englobam **todas as posições abertas**: ações e opções. Posições short de opção têm `quantity` negativa, o que reflete corretamente o impacto no patrimônio.

---

## 2. Banco de Dados

### Migration gerada

**Arquivo:** `backend/prisma/migrations/20260512215155_remove_cash_flow/migration.sql`

```sql
-- Limpar dados históricos (executado manualmente antes da migration)
DELETE FROM "Transaction" WHERE type IN ('DEPOSIT', 'WITHDRAWAL');

-- Remover campos do model Wallet
ALTER TABLE "Wallet" DROP COLUMN "cashBalance";
ALTER TABLE "Wallet" DROP COLUMN "blockedCollateral";

-- Remover valores do enum TransactionType
-- (Prisma gera automaticamente via prisma migrate dev)
```

### Mudanças no schema Prisma

| Elemento | Ação |
|----------|------|
| `Wallet.cashBalance` | 🔴 REMOVIDO — `Decimal(18,2) @default(0)` |
| `Wallet.blockedCollateral` | 🔴 REMOVIDO — `Decimal(18,2) @default(0)` |
| `TransactionType.DEPOSIT` | 🔴 REMOVIDO do enum |
| `TransactionType.WITHDRAWAL` | 🔴 REMOVIDO do enum |
| `OptionLifecycle.settlementAmount` | 🟢 MANTIDO — registro histórico financeiro da operação |

**Valores que permanecem no enum `TransactionType`:** `BUY`, `SELL`, `DIVIDEND`, `SPLIT`, `SUBSCRIPTION`, `OPTION_EXERCISE`, `OPTION_ASSIGNMENT`, `OPTION_EXPIRY`, `EXPIRED`

---

## 3. Backend

### 3.1 Módulo `wallets/`

#### `schemas/wallet.schema.ts`

| Item | Ação |
|------|------|
| `CashOperationType` (enum Zod) | 🔴 REMOVIDO |
| `CashOperationInputSchema` + DTO | 🔴 REMOVIDO |
| `CreateWalletInputSchema.initialCashBalance` | 🔴 REMOVIDO do schema |
| `WalletSummaryResponseSchema.cashBalance` | 🔴 REMOVIDO |
| `WalletResponseSchema` | 🟡 ADAPTADO — adiciona `totalCostBasis`, `totalMarketValue`, `totalUnrealizedPL` |

#### `services/wallets.service.ts`

| Método | Ação | Detalhe |
|--------|------|---------|
| `create()` | 🟡 ADAPTADO | Remove criação de Transaction DEPOSIT e `cashBalance` do `wallet.create()` |
| `cashOperation()` | 🔴 REMOVIDO | Método exclusivo do caixa |
| `formatWalletSummary()` | 🟡 ADAPTADO | Remove `cashBalance` do objeto retornado |
| `getDashboard()` | 🟡 ADAPTADO | Reimplementado com 3 métricas; `totalValue = totalMarketValue` |

**`getDashboard()` — novo cálculo:**
```
totalCostBasis    = Σ(position.quantity × position.averagePrice)
totalMarketValue  = Σ(position.quantity × position.currentPrice)
totalUnrealizedPL = totalMarketValue − totalCostBasis
totalValue        = totalMarketValue   // retrocompatibilidade de nome
```

#### `services/trading.service.ts`

| Método | Ação |
|--------|------|
| `buy()` | Remove `wallet.updateMany` com `cashBalance { decrement }` e validação "Saldo insuficiente" |
| `sell()` | Remove `wallet.update` com `cashBalance { increment }` |
| `updateTransaction()` | Remove os blocos que ajustavam `cashBalance` no diff de preço/quantidade |
| `deleteTransaction()` | Remove os blocos de estorno de `cashBalance` ao deletar transação |

#### `controllers/wallets.controller.ts`

| Método | Ação |
|--------|------|
| `cashOperation()` | 🔴 REMOVIDO — endpoint `POST /wallets/:id/cash` deixa de existir (retorna 404) |

---

### 3.2 Módulo `derivatives/`

#### `services/derivatives.service.ts`

| Método | O que foi removido |
|--------|-------------------|
| `buyOption()` | Leitura de `cashBalance`/`blockedCollateral`, validação `availableCash < totalCost`, `wallet.updateMany` com decrement |
| `sellOption()` — PUT leg | Validação de margem, `wallet.update({ blockedCollateral: increment })`, `wallet.update({ cashBalance: increment })` |
| `sellOption()` — CALL leg | `wallet.update({ cashBalance: increment })` |
| `closeOptionPosition()` — short | Leitura de saldo, validação, `wallet.updateMany` com decrement, `wallet.update({ blockedCollateral: decrement })` |
| `closeOptionPosition()` — long | `wallet.update({ cashBalance: increment })` |

#### `services/option-lifecycle.service.ts`

| Método | O que foi removido |
|--------|-------------------|
| `exerciseOption()` — CALL | Leitura de saldo, validação, `wallet.updateMany`, `cashBalanceAfter` no retorno |
| `exerciseOption()` — PUT | `wallet.update({ cashBalance: increment })`, `cashBalanceAfter` no retorno |
| `handleAssignment()` — CALL | `wallet.update({ cashBalance: increment })` |
| `handleAssignment()` — PUT | Leitura de saldo, validação, `wallet.updateMany`, `wallet.update({ blockedCollateral: decrement })`, `cashBalanceAfter` e `collateralReleased` no retorno |
| `processExpiration()` | `wallet.update({ blockedCollateral: decrement })`, `collateralReleased` no retorno |

#### `services/strategy-executor.service.ts`

Remove toda a lógica de validação de margem (`availableCash`, `marginRequired`) e ajuste de `cashBalance`/`blockedCollateral`. O `netPremium` continua sendo calculado para o domain event `StrategyExecuted`.

#### `services/strategy-builder.service.ts`

Remove o cálculo de `marginRequired` e o campo do objeto retornado por `previewStrategy()`. Os demais campos do `riskProfile` (`maxLoss`, `maxGain`, `breakEvenPoints`, `netPremium`, `isDebitStrategy`) são mantidos.

#### Schemas de `derivatives/`

| Arquivo | Campos removidos |
|---------|-----------------|
| `schemas/lifecycle.schema.ts` | `cashBalanceAfter` de `ExerciseResultResponse`; `cashBalanceAfter` e `collateralReleased` de `AssignmentResultResponse`; `collateralReleased` de `ExpirationResultResponse` |
| `schemas/option-trade.schema.ts` | `collateralBlocked` de `OptionPositionResponse` |
| `schemas/strategy.schema.ts` | `marginRequired` de `StrategyRiskProfile` |

---

### 3.3 Módulo `activity/`

#### `services/activity.service.ts` — `getAdvisorMetrics()`

| | Antes | Depois |
|--|-------|--------|
| **Query** | `prisma.wallet.findMany({ select: { cashBalance: true } })` | `prisma.position.findMany({ where: { walletId: { in: walletIds } }, select: { quantity: true, averagePrice: true } })` |
| **Cálculo** | `Σ cashBalance` | `Σ (quantity × averagePrice)` |
| **Semântica de `totalWalletValue`** | Soma dos saldos em caixa | Custo total das posições abertas |
| **Nome do campo na API** | `totalWalletValue` | `totalWalletValue` (mantido — mudança de semântica apenas) |

---

### 3.4 Domain Events (`shared/domain-events/domain-events.types.ts`)

| Item | Ação |
|------|------|
| `WalletEvents.CASH_DEPOSITED` | 🔴 REMOVIDO |
| `WalletEvents.CASH_WITHDRAWN` | 🔴 REMOVIDO |
| `CashDepositedPayload` | 🔴 REMOVIDO |
| `CashWithdrawnPayload` | 🔴 REMOVIDO |
| `WalletCreatedPayload.initialCashBalance` | 🔴 REMOVIDO do payload |
| `OptionSoldPayload.collateralBlocked` | 🔴 REMOVIDO do payload |
| `OptionAssignedPayload.settlementAmount` | 🔴 REMOVIDO do payload (valor continua gravado em `OptionLifecycle.settlementAmount` no banco) |
| `OptionAssignedPayload.collateralReleased` | 🔴 REMOVIDO do payload |
| `OptionExpiredPayload.collateralReleased` | 🔴 REMOVIDO do payload |

---

### 3.5 Testes Backend (5 arquivos `.spec.ts`)

| Arquivo | Adaptações |
|---------|------------|
| `wallets/__tests__/wallets.service.spec.ts` | Remove `describe('cashOperation')` (4 testes); remove teste de criação com DEPOSIT; remove `cashBalance` de expects |
| `wallets/__tests__/wallets.controller.spec.ts` | Remove `describe('cashOperation')` (2 testes); remove `initialCashBalance` dos inputs |
| `proventos/__tests__/proventos.service.spec.ts` | Atualiza mocks de wallet (sem `cashBalance`/`blockedCollateral`) |
| `wallets/__tests__/performance.service.spec.ts` | Atualiza mocks de wallet para refletir novo schema |
| Testes de `derivatives/` | Removem `cashBalance`/`blockedCollateral` dos mocks de wallet; removem assertions de saldo/colateral dos resultados de lifecycle |

---

## 4. API — Endpoints Afetados

| Endpoint | Mudança |
|----------|---------|
| `POST /wallets/:id/cash` | 🔴 REMOVIDO — retorna 404 |
| `POST /wallets` | Remove `initialCashBalance` do request; remove `cashBalance` do response |
| `GET /wallets` | Remove `cashBalance` de cada `WalletSummaryResponse` |
| `GET /wallets/:id` | Remove `cashBalance`; adiciona `totalCostBasis`, `totalMarketValue`, `totalUnrealizedPL` |
| `POST /wallets/:id/trade/buy` | Remove validação "Saldo insuficiente" |
| `POST /wallets/:id/trade/sell` | Remove crédito de saldo |
| `PUT /wallets/:id/transactions/:txId` | Remove ajuste de `cashBalance` no diff |
| `DELETE /wallets/:id/transactions/:txId` | Remove estorno de `cashBalance` |
| `POST /wallets/:id/options/buy` | Remove validação de saldo |
| `POST /wallets/:id/options/sell` | Remove bloqueio de colateral e crédito de prêmio |
| `POST /wallets/:id/options/:id/close` | Remove ajuste de saldo e colateral |
| `POST /wallets/:id/options/:id/exercise` | Remove `cashBalanceAfter` do response |
| `POST /wallets/:id/options/:id/assignment` | Remove `cashBalanceAfter` e `collateralReleased` do response |
| `POST /wallets/:id/options/:id/expire` | Remove `collateralReleased` do response |
| `POST /wallets/:id/strategies` | Remove validação de margem e ajuste de saldo |
| `POST /wallets/:id/strategies/preview` | Remove `marginRequired` do `riskProfile` |
| `GET /activity/advisor/metrics` | `totalWalletValue` muda de semântica (caixa → custo de posições) |

---

## 5. Frontend

### 5.1 Tipos auto-gerados

**Regenerados via** `npm run generate:types` após o backend estar estável. O `api.d.ts` perde campos de caixa (`cashBalance`, `collateralBlocked`, `cashBalanceAfter`, `collateralReleased`, `marginRequired`) e ganha campos de patrimônio (`totalCostBasis`, `totalMarketValue`, `totalUnrealizedPL`). `DEPOSIT` e `WITHDRAWAL` saem do `TransactionType`; `EXPIRED` é adicionado.

### 5.2 Arquivos removidos (🔴)

| Arquivo | Justificativa |
|---------|---------------|
| `features/wallets/components/CashOperationModal.tsx` | Modal exclusivo de depósito/saque |
| `features/wallets/api/useCashOperation.ts` | Consumidor do endpoint removido |
| `features/wallets/hooks/useCashOperationForm.ts` | Estado do formulário de caixa |

### 5.3 Types (`features/wallets/types/index.ts`)

| Item | Ação |
|------|------|
| `CashOperationInput`, `CashOperationType`, `CashOperationFormData`, `cashOperationLabels` | 🔴 REMOVIDOS |
| `WalletFormData.initialCashBalance` | 🔴 REMOVIDO do campo |
| `transactionTypeLabels` | Remove entradas `DEPOSIT` e `WITHDRAWAL` |
| `transactionTypeColors` | Remove entradas `DEPOSIT` e `WITHDRAWAL` |

### 5.4 API Client (`features/wallets/api/wallets.api.ts`)

Remove método `cashOperation(walletId, data)`.

### 5.5 Hooks de UI

| Hook | Ação |
|------|------|
| `useNewWalletForm` | Remove estado `initialCashBalance`, formatação de moeda e inclusão no payload |
| `useTradeForm` | Remove parâmetro `currentBalance`, validação `total > currentBalance`, mensagem "Saldo insuficiente" |

### 5.6 Componentes adaptados (🟡)

| Componente | O que mudou |
|------------|-------------|
| `WalletCard.tsx` | Remove exibição de `cashBalance` como "Saldo em Caixa" |
| `WalletStatsCard.tsx` | Remove cards "Saldo em Caixa" e "Patrimônio Total" baseados em `cashBalance`; simplificado |
| `WalletsPage.tsx` | Remove cálculo de `totalAUM = Σ cashBalance` e card "Total AUM" |
| `WalletPage.tsx` | Remove botões "Depositar"/"Sacar", state `cashOperationType`, `showCashModal`, `<CashOperationModal>`, props `currentBalance` e `walletCashBalance` |
| `NewWalletModal.tsx` | Remove campo de input "Aporte Inicial" (`initialCashBalance`) |
| `UnifiedTradeModal.tsx` | Remove prop `currentBalance`, display de saldo atual/futuro, validação de saldo insuficiente |
| `TransactionTimeline.tsx` | Remove entradas `DEPOSIT` e `WITHDRAWAL` do mapa de ícones/labels/cores; adiciona `EXPIRED` |
| `AssignmentModal.tsx` | Remove display de `collateralBlocked` como "colateral que será liberado" |
| `ExpirationModal.tsx` | Remove display de `collateralBlocked` para posições short |
| `OptionTradeModal.tsx` | Remove prop `currentBalance`, cálculo de saldo pós-operação, display de saldo |
| `StrategyBuilderModal.tsx` | Remove display de `marginRequired` |
| `CloseOptionModal.tsx` | Remove prop `walletCashBalance`, bloco de aviso "Saldo insuficiente" |

### 5.7 Componentes não afetados (🟢)

`HomePageAdvisor` exibe `metrics.totalWalletValue` sem saber a semântica — muda de valor, não de código. Hooks de query (`useWallets`, `useWalletById`, `useBuyOption`, `useSellOption`, etc.) são passthrough — não precisam de alteração.

---

## 6. Arquivos Relevantes

### Backend

| Arquivo | Mudança |
|---------|---------|
| `backend/prisma/schema.prisma` | Remove `cashBalance`, `blockedCollateral`, `DEPOSIT`, `WITHDRAWAL` |
| `backend/prisma/migrations/20260512215155_remove_cash_flow/` | Migration de remoção |
| `backend/src/modules/wallets/services/wallets.service.ts` | `cashOperation` removido; `getDashboard` reimplementado com 3 métricas |
| `backend/src/modules/wallets/services/trading.service.ts` | Sem blocos de cashBalance em buy/sell/update/delete |
| `backend/src/modules/wallets/controllers/wallets.controller.ts` | Handler `cashOperation` removido |
| `backend/src/modules/wallets/schemas/wallet.schema.ts` | Schemas de caixa removidos; `WalletResponse` com novas métricas |
| `backend/src/modules/derivatives/services/derivatives.service.ts` | Sem validação/ajuste de caixa/colateral |
| `backend/src/modules/derivatives/services/option-lifecycle.service.ts` | Sem ajuste de caixa/colateral; retornos sem `cashBalanceAfter`/`collateralReleased` |
| `backend/src/modules/derivatives/services/strategy-executor.service.ts` | Sem validação de margem |
| `backend/src/modules/derivatives/services/strategy-builder.service.ts` | Sem `marginRequired` |
| `backend/src/modules/derivatives/schemas/lifecycle.schema.ts` | Campos de caixa removidos dos DTOs de response |
| `backend/src/modules/derivatives/schemas/option-trade.schema.ts` | `collateralBlocked` removido |
| `backend/src/modules/derivatives/schemas/strategy.schema.ts` | `marginRequired` removido |
| `backend/src/modules/activity/services/activity.service.ts` | `getAdvisorMetrics` usa posições em vez de `cashBalance` |
| `backend/src/shared/domain-events/domain-events.types.ts` | Payloads de caixa removidos |

### Frontend

| Arquivo | Mudança |
|---------|---------|
| `frontend/src/types/api.d.ts` | Regenerado — sem campos de caixa, com `totalCostBasis`/`totalMarketValue`/`totalUnrealizedPL` |
| `frontend/src/features/wallets/api/wallets.api.ts` | Remove `cashOperation()` |
| `frontend/src/features/wallets/api/useCashOperation.ts` | 🔴 DELETADO |
| `frontend/src/features/wallets/hooks/useCashOperationForm.ts` | 🔴 DELETADO |
| `frontend/src/features/wallets/components/CashOperationModal.tsx` | 🔴 DELETADO |
| `frontend/src/features/wallets/types/index.ts` | Remove types exclusivos de caixa |
| `frontend/src/features/wallets/hooks/useNewWalletForm.ts` | Remove `initialCashBalance` |
| `frontend/src/features/wallets/hooks/useTradeForm.ts` | Remove validação de saldo |
| `frontend/src/features/wallets/components/WalletPage.tsx` | Remove Depositar/Sacar, props de caixa |
| `frontend/src/features/wallets/components/WalletCard.tsx` | Remove display de `cashBalance` |
| `frontend/src/features/wallets/components/WalletStatsCard.tsx` | Simplificado sem caixa |
| `frontend/src/features/wallets/components/WalletsPage.tsx` | Remove card "Total AUM" |
| `frontend/src/features/wallets/components/NewWalletModal.tsx` | Remove campo "Aporte Inicial" |
| `frontend/src/features/wallets/components/TransactionTimeline.tsx` | Remove DEPOSIT/WITHDRAWAL, adiciona EXPIRED |
| `frontend/src/features/derivatives/` | Componentes de lifecycle/opções sem displays de caixa/colateral |

---

## 7. Fora do Escopo

- **TWR (Time-Weighted Return):** Rentabilidade temporal requer tabela `WalletSnapshot` populada por cron diário.
- **Dashboard do assessor com valor de mercado:** O `totalWalletValue` exibido na home do assessor é custo de posições (`Σ qty × averagePrice`), não valor de mercado em tempo real. Métricas agregadas com preço de mercado são feature futura.
- **Backfill de dados históricos de caixa:** As transações DEPOSIT/WITHDRAWAL e os valores de `cashBalance`/`blockedCollateral` foram deletados permanentemente — sem recuperação.
- **Validação de capital:** O sistema não impede mais registro de compras sem correspondência financeira. Comportamento intencional para o TCC.
