# Ciclo de Vida de Opções — Patrimônio, Exercício e Histórico

## Visão Geral

Este documento descreve as regras de negócio e a implementação do ciclo de vida de posições em opções, com foco em dois aspectos críticos para a integridade do patrimônio líquido:

1. **Custo de aquisição correto no exercício de CALL** — o prêmio pago pela opção deve compor o preço médio das ações adquiridas.
2. **Histórico de opções encerradas** — posições exercidas, atribuídas, expiradas e fechadas devem permanecer visíveis no ContentPanel após seu encerramento.

---

## 1. Modelo de Patrimônio Líquido

O sistema **não rastreia caixa**. O patrimônio líquido é calculado exclusivamente como a soma do valor de mercado das posições abertas:

```
totalValue = Σ (position.quantity × currentMarketPrice × multiplier)
```

Essa decisão arquitetural tem consequências diretas sobre como o exercício de opções deve ser tratado.

---

## 2. Problema Identificado — Bug de Custo Médio no CALL Exercise

### Comportamento anterior (incorreto)

Ao exercer uma CALL, o sistema criava a posição em ações usando apenas o `strikePrice` como `averagePrice`:

```
averagePrice = strikePrice
```

Isso omitia o prêmio pago pela opção do custo de aquisição, inflando artificialmente o P&L da posição em ações.

**Exemplo concreto:**

| Item | Valor |
|------|-------|
| Prêmio pago pela CALL | R$ 2,00/ação |
| Strike da CALL | R$ 25,00 |
| Preço de mercado (PETR4) | R$ 30,00 |
| Custo real do investidor | R$ 27,00/ação (R$ 25 + R$ 2) |

Com o bug, o sistema exibia:
- `P&L = (30 - 25) × 100 = R$ 500` — **errado**

Com a correção:
- `P&L = (30 - 27) × 100 = R$ 300` — **correto**

Os R$ 200 de prêmio deixam de "desaparecer" e ficam incorporados no custo das ações.

### Correção implementada

Em `option-lifecycle.service.ts` → `exerciseOption()`:

```typescript
// position.averagePrice = prêmio por ação (mesma unidade que strikePrice)
const premiumPerShare = Number(position.averagePrice);
const callAcquisitionCost = strikePrice + premiumPerShare;

// Criação de nova posição:
averagePrice: callAcquisitionCost

// Acúmulo em posição existente (média ponderada):
const newAvg =
  (existingQty * existingAvg + underlyingQuantity * callAcquisitionCost) / totalQty;
```

A transação `OPTION_EXERCISE` continua registrando o `price = strikePrice` (valor financeiro real pago à contraparte), que é o dado correto para histórico de operações e compliance.

---

## 3. Comportamento do PUT Exercise — Limitação Arquitetural Consciente

Ao exercer um PUT (vender ações ao strike):

- A posição em ações é reduzida ou deletada — **comportamento correto**.
- O "recebimento" do strike (cash in) não é creditado em nenhuma conta — **limitação por design**.
- Isso é **consistente** com todo SELL de ativo no sistema: ao vender qualquer posição, os recursos saem do escopo "patrimônio investido" e transitam para caixa disponível, que não é rastreado.

**Argumento:** O escopo do patrimônio líquido é "o que está atualmente investido em posições". Ao liquidar um ativo (PUT exercise, SELL normal), o recurso é desinvestido. O saldo de caixa é externo ao portfólio e de responsabilidade da corretora.

Não há fix para essa limitação sem a adição de um modelo de caixa, que está **fora do escopo** do sistema atual.

---

## 4. Histórico de Opções Encerradas

### Problema anterior

Ao encerrar uma posição em opções (exercer, atribuir, expirar ou fechar), o sistema deletava fisicamente a linha na tabela `positions`. Isso tornava a posição **invisível** no ContentPanel — o usuário não conseguia ver o que havia acontecido com suas opções encerradas.

### Solução implementada

#### Backend — Endpoint de histórico

`GET /wallets/:walletId/options/history`

Consulta a tabela `optionLifecycle` filtrando pelos eventos terminais:

| Evento | Significado |
|--------|-------------|
| `EXERCISED` | CALL exercida — ações adquiridas ao strike |
| `ASSIGNED` | PUT short atribuída — ações entregues/recebidas |
| `EXPIRED_ITM` | Vencida dentro do dinheiro |
| `EXPIRED_OTM` | Vencida fora do dinheiro (virou pó) |
| `CLOSED` | Fechada via buy-to-close ou sell-to-close |

#### Recuperação de dados por tipo de evento

Como a posição é deletada ao ser encerrada (e o `positionId` torna-se `null` por `SetNull` cascade no Prisma), as informações da opção são recuperadas via `resultingTransaction`:

| Evento | `resultingTransaction.assetId` | Dados disponíveis |
|--------|-------------------------------|-------------------|
| `EXPIRED_*` / `CLOSED` | Ativo da opção | Ticker, tipo (CALL/PUT), strike, vencimento |
| `EXERCISED` / `ASSIGNED` | Ativo subjacente (ex: PETR4) | Ticker do subjacente, strike (do lifecycle) |

#### Campo `realizedNetPremium`

Para eventos `CLOSED`, acumula o resultado líquido de prêmio:
- **SELL to close** (fechamento de long): `+ totalValue` (recebeu prêmio)
- **BUY to close** (fechamento de short): `- totalValue` (pagou para fechar)

#### Frontend — Seção "Histórico de Encerradas"

Exibida na aba **Opções** da `WalletPage`, abaixo das posições abertas, quando há pelo menos 1 registro no histórico.

Cada linha exibe:
- Badge de evento (Exercida, Atribuída, Expirou OTM, etc.) com ícone e cor semântica
- Ticker (da opção ou do subjacente, conforme o evento)
- Tipo, strike e quantidade de contratos
- Valor de liquidação (quando disponível)
- Data do encerramento

---

## 5. Arquitetura

### Backend

```
src/modules/derivatives/
├── services/
│   └── option-lifecycle.service.ts
│       ├── exerciseOption()     ← fix: callAcquisitionCost = strike + premium
│       └── getOptionHistory()   ← novo: retorna eventos terminais com dados do ativo
├── controllers/
│   └── lifecycle.controller.ts
│       └── GET options/history  ← novo endpoint
└── schemas/
    └── lifecycle.schema.ts
        ├── ClosedOptionHistoryItemSchema   ← novo
        ├── ClosedOptionHistoryResponseSchema ← novo
        └── ClosedOptionHistoryApiResponseDto ← novo
```

### Frontend

```
src/features/derivatives/
├── options/
│   ├── api/
│   │   ├── derivatives.api.ts     ← +getOptionHistory()
│   │   ├── useOptionHistory.ts    ← novo hook
│   │   └── index.ts               ← re-export
│   └── components/
│       ├── ClosedOptionHistoryList.tsx  ← novo componente
│       └── index.ts                    ← re-export
└── types/
    └── index.ts                   ← +ClosedOptionHistoryItem, +ClosedOptionHistory

src/features/wallets/pages/
└── WalletPage.tsx
    └── aba "Opções" → seção "Histórico de Encerradas" (usa useOptionHistory + ClosedOptionHistoryList)
```

---

## 6. Fluxo Completo — CALL Exercise (após correção)

```
1. Usuário clica "Exercer" na OptionPositionCard
2. ExerciseOptionModal → POST /wallets/:id/options/:positionId/exercise
3. exerciseOption():
   a. Calcula callAcquisitionCost = strikePrice + position.averagePrice
   b. Cria/atualiza posição em PETR4 com averagePrice = callAcquisitionCost
   c. Cria transação OPTION_EXERCISE (price = strikePrice, para registro contábil)
   d. Cria OptionLifecycle com event = EXERCISED
   e. Deleta a posição da opção
4. Frontend invalida queries → posição PETR4 aparece em "Ações" com custo correto
5. GET /options/history retorna o evento EXERCISED → aparece em "Histórico de Encerradas"
```

---

## 7. Decisões de Design

### Por que não soft-delete nas posições?

A alternativa seria adicionar um campo `status` na tabela `positions` e não deletar fisicamente. Essa abordagem foi descartada porque:
- Exigiria migração de banco e alteração em todas as queries que assumem "posição existe = posição ativa"
- O `optionLifecycle` já é o SSOT de eventos terminais — replicar o estado na posição seria redundância

### Por que o prêmio não entra na transação `OPTION_EXERCISE`?

A transação registra o fato financeiro: "pagou X ao strike pela entrega das ações". Isso é o que aparece no extrato e é relevante para auditoria/compliance. O custo total (strike + prêmio) é uma informação de gestão, representada corretamente no `averagePrice` da posição resultante.

### Escopo do `realizedNetPremium`

Inclui apenas eventos `CLOSED` (buy/sell to close) — não inclui EXERCISED ou EXPIRED. Isso é intencional:
- **EXERCISED**: o prêmio migra para o custo da posição em ações (não é resultado realizado de opção)
- **EXPIRED_OTM long**: o prêmio foi totalmente perdido, mas isso já reflete no patrimônio via desaparecimento da posição
- **EXPIRED_OTM short**: o prêmio foi totalmente ganho, capturado na performance geral

---

## 8. Arquivos Modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `backend/src/modules/derivatives/services/option-lifecycle.service.ts` | Modificado | Fix CALL exercise + método `getOptionHistory()` |
| `backend/src/modules/derivatives/schemas/lifecycle.schema.ts` | Modificado | +3 schemas de histórico |
| `backend/src/modules/derivatives/controllers/lifecycle.controller.ts` | Modificado | +rota `GET options/history` |
| `frontend/src/types/api.d.ts` | Gerado | Re-gerado via `npm run generate:types` |
| `frontend/src/features/derivatives/types/index.ts` | Modificado | +`ClosedOptionHistoryItem`, +`ClosedOptionHistory` |
| `frontend/src/features/derivatives/options/api/derivatives.api.ts` | Modificado | +`getOptionHistory()` |
| `frontend/src/features/derivatives/options/api/useOptionHistory.ts` | Novo | Hook React Query |
| `frontend/src/features/derivatives/options/api/index.ts` | Modificado | Re-export do hook |
| `frontend/src/features/derivatives/options/components/ClosedOptionHistoryList.tsx` | Novo | Componente de listagem |
| `frontend/src/features/derivatives/options/components/index.ts` | Modificado | Re-export do componente |
| `frontend/src/features/wallets/pages/WalletPage.tsx` | Modificado | Seção "Histórico de Encerradas" na aba Opções |

---

## 9. Fora do Escopo

- **Custo médio em PUT exercise**: ao vender ações via PUT, o prêmio pago poderia em tese reduzir o preço efetivo de venda. Sem rastreamento de caixa, não há forma de capturar esse ajuste no patrimônio de forma consistente.
- **Custo médio retroativo**: posições exercidas antes desta correção já foram deletadas com `averagePrice = strikePrice`. Não há backfill.
- **TWR (time-weighted return) de opções**: exigiria snapshots históricos, fora do escopo.
