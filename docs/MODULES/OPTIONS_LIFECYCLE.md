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

## 4. Exercício All-or-Nothing e Data de Exercício

### Motivação

O exercício parcial de contratos foi removido do sistema. A lógica de opções na B3 trata o lote como unidade mínima de liquidação — exercer uma fração dos contratos de uma mesma série criaria inconsistência entre a posição registrada e o evento real de mercado.

Adicionalmente, o sistema passou a aceitar uma **data de exercício informada pelo usuário**, permitindo registrar exercícios ocorridos em datas anteriores à do lançamento no sistema, sem perder a rastreabilidade temporal.

---

### 4.1 All-or-Nothing

**Comportamento anterior:** o modal de exercício exibia um campo de quantidade, permitindo exercer N de M contratos.

**Comportamento atual:** ao confirmar o exercício, todos os contratos da posição são exercidos de uma vez.

**Backend (`option-lifecycle.service.ts`):**

```typescript
// Antes:
const quantityToExercise = data.quantity ?? currentQty;
if (quantityToExercise > currentQty) { throw ... }

// Depois:
const quantityToExercise = currentQty; // All-or-Nothing
```

O campo `quantity` foi removido do `ExerciseOptionInputSchema`. O DTO não aceita mais quantidade parcial.

Como consequência direta, o exercício sempre resulta na deleção da posição da opção (quantity restante = 0), nunca em atualização parcial.

---

### 4.2 Data de Exercício

**Comportamento anterior:** `executedAt` da transação e `occurredAt` do lifecycle eram sempre `new Date()` no momento da requisição.

**Comportamento atual:** o usuário informa a data do exercício no modal. Ela é usada em ambos os registros.

**Regras de validação:**

| Camada | Regra |
|--------|-------|
| Frontend | Campo `type="date"` com `max={today}` — navegador bloqueia datas futuras |
| Frontend | Validação JS: `new Date(exercisedAt) > new Date()` → erro |
| Backend (Zod) | `.refine(val => new Date(val) <= new Date(), ...)` → rejeita futuro |

**Backend (`option-lifecycle.service.ts`):**

```typescript
const exercisedAt = data.exercisedAt ? new Date(data.exercisedAt) : new Date();

// Transação:
executedAt: exercisedAt

// OptionLifecycle:
occurredAt: exercisedAt
```

O campo `exercisedAt` é opcional no DTO — se ausente, o sistema usa `new Date()` (comportamento padrão).

---

## 5. Histórico de Opções Encerradas

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

## 6. Arquitetura

### Backend

```
src/modules/derivatives/
├── services/
│   └── option-lifecycle.service.ts
│       ├── exerciseOption()     ← All-or-Nothing + exercisedAt aplicado em executedAt/occurredAt
│       └── getOptionHistory()   ← retorna eventos terminais com dados do ativo
├── controllers/
│   └── lifecycle.controller.ts
│       └── GET options/history
└── schemas/
    └── lifecycle.schema.ts
        ├── ExerciseOptionInputSchema  ← removido quantity; adicionado exercisedAt?
        ├── ClosedOptionHistoryItemSchema
        ├── ClosedOptionHistoryResponseSchema
        └── ClosedOptionHistoryApiResponseDto
```

### Frontend

```
src/features/derivatives/
├── lifecycle/
│   └── components/
│       └── ExerciseOptionModal.tsx  ← campo quantity removido; campo data do exercício adicionado
├── options/
│   ├── api/
│   │   ├── derivatives.api.ts     ← +getOptionHistory()
│   │   ├── useOptionHistory.ts    ← hook React Query
│   │   └── index.ts
│   └── components/
│       ├── ClosedOptionHistoryList.tsx
│       └── index.ts
└── types/
    └── index.ts                   ← +ClosedOptionHistoryItem, +ClosedOptionHistory

src/features/wallets/pages/
└── WalletPage.tsx
    └── aba "Opções" → seção "Histórico de Encerradas"
```

---

## 7. Fluxo Completo — CALL Exercise (estado atual)

```
1. Usuário clica "Exercer" na OptionPositionCard
2. ExerciseOptionModal:
   - Exibe resumo com todos os contratos da posição (All-or-Nothing)
   - Usuário informa a data do exercício (padrão: hoje; máximo: hoje)
   - POST /wallets/:id/options/:positionId/exercise { exercisedAt, notes, idempotencyKey }
3. exerciseOption():
   a. quantityToExercise = currentQty (todos os contratos)
   b. Calcula callAcquisitionCost = strikePrice + position.averagePrice
   c. Cria/atualiza posição em PETR4 com averagePrice = callAcquisitionCost
   d. Cria transação OPTION_EXERCISE com executedAt = exercisedAt
   e. Cria OptionLifecycle com event = EXERCISED e occurredAt = exercisedAt
   f. Deleta a posição da opção (quantity restante = 0)
4. Frontend invalida queries → posição PETR4 aparece em "Ações" com custo correto
5. GET /options/history retorna o evento EXERCISED → aparece em "Histórico de Encerradas"
```

---

## 8. Decisões de Design

### Por que não permitir exercício parcial?

Exercício parcial implica que uma série de opções com o mesmo ticker seria quebrada em dois lotes distintos, cada um com histórico de lifecycle separado. Isso complica a rastreabilidade sem benefício prático no contexto do sistema — o advisor opera lotes inteiros. A regra All-or-Nothing é mais simples e mais fiel ao comportamento da B3.

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

## 9. Arquivos Modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `backend/src/modules/derivatives/services/option-lifecycle.service.ts` | Modificado | Fix custo médio CALL; All-or-Nothing; exercisedAt em executedAt/occurredAt; `getOptionHistory()` |
| `backend/src/modules/derivatives/schemas/lifecycle.schema.ts` | Modificado | `ExerciseOptionInputSchema`: removido `quantity`, adicionado `exercisedAt?`; +3 schemas de histórico |
| `backend/src/modules/derivatives/controllers/lifecycle.controller.ts` | Modificado | +rota `GET options/history` |
| `backend/src/modules/derivatives/__tests__/option-lifecycle.service.spec.ts` | Modificado | Teste parcial adaptado para All-or-Nothing; teste de "quantidade excede" removido |
| `frontend/src/types/api.d.ts` | Modificado | `ExerciseOptionInputDto`: removido `quantity`, adicionado `exercisedAt?` |
| `frontend/src/features/derivatives/lifecycle/components/ExerciseOptionModal.tsx` | Modificado | Campo de quantidade removido; campo "Data do exercicio" adicionado |
| `frontend/src/features/derivatives/types/index.ts` | Modificado | +`ClosedOptionHistoryItem`, +`ClosedOptionHistory` |
| `frontend/src/features/derivatives/options/api/derivatives.api.ts` | Modificado | +`getOptionHistory()` |
| `frontend/src/features/derivatives/options/api/useOptionHistory.ts` | Novo | Hook React Query |
| `frontend/src/features/derivatives/options/api/index.ts` | Modificado | Re-export do hook |
| `frontend/src/features/derivatives/options/components/ClosedOptionHistoryList.tsx` | Novo | Componente de listagem |
| `frontend/src/features/derivatives/options/components/index.ts` | Modificado | Re-export do componente |
| `frontend/src/features/wallets/pages/WalletPage.tsx` | Modificado | Seção "Histórico de Encerradas" na aba Opções |

---

## 10. Fora do Escopo

- **Custo médio em PUT exercise**: ao vender ações via PUT, o prêmio pago poderia em tese reduzir o preço efetivo de venda. Sem rastreamento de caixa, não há forma de capturar esse ajuste no patrimônio de forma consistente.
- **Custo médio retroativo**: posições exercidas antes desta correção já foram deletadas com `averagePrice = strikePrice`. Não há backfill.
- **TWR (time-weighted return) de opções**: exigiria snapshots históricos, fora do escopo.

---

## 11. Edição e Exclusão de Opções (Correção de Lançamentos)

### Motivação

Usuários que cometiam erros ao registrar uma compra de opção (quantidade errada, prêmio incorreto, data equivocada) não tinham forma de corrigir a entrada — apenas podiam "fechar" a posição via evento de ciclo de vida, deixando rastros permanentes no histórico patrimonial.

A solução adota uma separação explícita entre dois conceitos:

- **Correção (edit/delete):** modifica ou remove a posição e sua transação de origem **antes de qualquer evento de ciclo de vida**. Não gera rastro em `OptionLifecycle`.
- **Encerramento (close/exercise/assignment/expiration):** registra um evento de ciclo de vida que **fica no histórico permanentemente**.

---

### 11.1 Campo `originTransactionId` — Por Que Existe

Antes desta mudança, `buyOption()` criava uma transação de BUY sem vínculo explícito à posição gerada. Para editar ou deletar a posição de forma atômica era necessário encontrar a transação correspondente sem ambiguidade.

O campo `originTransactionId` foi adicionado à tabela `positions`:

```prisma
model Position {
  // ...
  originTransactionId   String?   @unique          // FK única para a transação de origem

  originTransaction   Transaction?  @relation("PositionOriginTx",
                        fields: [originTransactionId],
                        references: [id],
                        onDelete: SetNull)
  // ...
}

model Transaction {
  // ...
  originPosition  Position?  @relation("PositionOriginTx") // relação reversa
}
```

Propriedades do campo:
- É `@unique` — garante relação 1-para-1 entre posição e transação de origem
- É `SetNull` no `onDelete` — se a posição for deletada via cascata, a FK na transaction não quebra
- Em `buyOption()`, a ordem de criação foi invertida: **Transaction é criada primeiro**, seu `id` é capturado e armazenado em `originTransactionId` da Position

Cascata de exclusão ao deletar uma posição de opção:

```
Position.delete()
  → WalletDividendPayment (Cascade)
  → OptionLifecycle.positionId (SetNull)
  → Transaction de origem (deletada manualmente no código)
```

---

### 11.2 Endpoint PATCH — Edição de Opção

```
PATCH /wallets/:walletId/options/:positionId
```

Atualiza quantidade, prêmio e data de uma posição de opção **não-encerrada** de forma atômica.

**Validações:**

| Validação | Condição | Erro HTTP |
|-----------|----------|-----------|
| Acesso | usuário tem acesso à carteira | 404 |
| Existência | posição existe com `walletId` | 404 |
| Tipo | `asset.type === 'OPTION'` | 400 |
| Estado | `optionLifecycle.count === 0` | 409 |
| Vinculação | `position.originTransactionId !== null` | 400 |
| Input | `quantity > 0`, `premium > 0`, `date` ISO válida | 422 (Zod) |

**Operação atômica (transação Prisma):**

```typescript
// 1. UPDATE positions: quantity, averagePrice
// 2. UPDATE transactions: quantity, price, totalValue, executedAt
// 3. LOG auditoria com snapshotBefore e snapshotAfter
```

**Schema Zod:**

```typescript
export const UpdateOptionInputSchema = z.object({
  quantity: z.number().positive().int(),
  premium:  z.number().positive(),
  date:     z.string().datetime({ message: 'Data inválida (formato ISO esperado)' }),
});
```

**Resposta (200 OK):**

```json
{
  "success": true,
  "data": {
    "positionId": "...",
    "transactionId": "...",
    "ticker": "VALE3C260626",
    "quantity": 5,
    "premium": 2.50,
    "totalValue": 1250.00,
    "status": "EXECUTED"
  }
}
```

**Erro quando há ciclo de vida (409 Conflict):**

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Posicao com eventos de ciclo de vida nao pode ser editada"
}
```

---

### 11.3 Endpoint DELETE — Exclusão de Opção

```
DELETE /wallets/:walletId/options/:positionId
```

Remove a posição e sua transação de origem sem gerar evento de `OptionLifecycle`. Retorna `204 No Content`.

**Validações:** idênticas ao PATCH, exceto a checagem de `originTransactionId` (exclusão funciona mesmo sem vínculo explícito).

**Operação atômica:**

```typescript
// 1. DELETE positions (cascata em WalletDividendPayment; SetNull em OptionLifecycle)
// 2. DELETE transactions (onde id = originTransactionId)
// 3. LOG auditoria com snapshotBefore, action: 'DELETE'
```

**Guarda de acesso (frontend):** os botões de editar/deletar só aparecem no `OptionPositionCard` quando `config.canTrade === true`:

```typescript
onEdit={config.canTrade ? handleEditOption : undefined}
onDelete={config.canTrade ? handleDeleteOption : undefined}
```

---

### 11.4 Fluxo de Edição

```
Usuário clica no ícone lápis (Pencil) no OptionPositionCard
  ↓
EditOptionModal renderiza com valores pré-preenchidos (quantity, premium, data)
  ↓
PATCH /wallets/:walletId/options/:positionId
  ↓
updateOption():
  1. Valida posição e tipo
  2. Conta OptionLifecycle → deve ser 0
  3. Recalcula totalValue = premium × 100 × quantity
  4. Transação atômica: UPDATE position + UPDATE transaction + AuditLog
  ↓
QueryClient invalida: 'option-positions', 'transactions'
  ↓
Frontend refetch → modal fecha
```

---

### 11.5 Fluxo de Exclusão

```
Usuário clica no ícone lixeira (Trash2) no OptionPositionCard
  ↓
Diálogo de confirmação com ticker, tipo, quantidade
  ↓
DELETE /wallets/:walletId/options/:positionId
  ↓
deleteOption():
  1. Valida posição e tipo
  2. Conta OptionLifecycle → deve ser 0
  3. Transação atômica: DELETE position + DELETE transaction + AuditLog
  ↓
QueryClient invalida: 'option-positions', 'transactions'
  ↓
Frontend refetch → diálogo fecha
```

---

### 11.6 Auditoria

Cada operação registra em AuditLog:

```typescript
{
  tableName: 'positions',
  recordId: positionId,
  action: 'UPDATE' | 'DELETE',
  actorId: user.id,
  actorRole: user.role,
  snapshotBefore: { quantity, averagePrice, ... },
  snapshotAfter: { quantity, averagePrice } | undefined,
  context: { trade: 'EDIT_OPTION' | 'DELETE_OPTION', ticker: string },
}
```

---

### 11.7 Arquivos Afetados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `backend/prisma/schema.prisma` | Modificado | `originTransactionId` em `Position`; relação reversa `originPosition` em `Transaction` |
| `backend/src/modules/derivatives/services/derivatives.service.ts` | Modificado | Modificação de `buyOption()`; novos métodos `updateOption()` e `deleteOption()` |
| `backend/src/modules/derivatives/controllers/derivatives.controller.ts` | Modificado | Novos endpoints `PATCH /:positionId` e `DELETE /:positionId` |
| `backend/src/modules/derivatives/schemas/option-trade.schema.ts` | Modificado | Novo `UpdateOptionInputSchema` e `UpdateOptionInputDto` |
| `frontend/src/features/derivatives/options/api/derivatives.api.ts` | Modificado | Novos métodos `updateOption()` e `deleteOption()` |
| `frontend/src/features/derivatives/options/api/useUpdateOption.ts` | Novo | Hook React Query para edição |
| `frontend/src/features/derivatives/options/api/useDeleteOption.ts` | Novo | Hook React Query para exclusão |
| `frontend/src/features/derivatives/options/components/EditOptionModal.tsx` | Novo | Modal de edição com pré-preenchimento e validação |
| `frontend/src/features/derivatives/options/components/OptionPositionCard.tsx` | Modificado | Props `onEdit` e `onDelete`; ícones Pencil e Trash2 |
| `frontend/src/features/wallets/pages/WalletPage.tsx` | Modificado | State, handlers, modal de edição e diálogo de confirmação |
| `backend/src/modules/derivatives/__tests__/strategy-executor.service.spec.ts` | Modificado | Mock `position.findFirst` adicionado |

---

### 11.8 Limitações Conhecidas

- **Sem histórico de edições na UI:** as alterações ficam apenas no AuditLog (acessível só por admins). Não há página de histórico de correções.
- **Sem validação cruzada de data:** editar `date` não revalida contra outras transações da carteira.
- **Cascata em `WalletDividendPayment`:** ao deletar uma posição de opção com pagamentos de dividendo associados (raro), esses registros são removidos em cascata.

---

## 12. Campo `openedAt` e Dias Operados no Card

### Motivação

O advisor precisa de visibilidade rápida sobre a **duração das operações**. Informações como "operado há 5 dias" são sinais relevantes para avaliação de risco e rentabilidade no período. O campo `createdAt` já existe no banco sem custo adicional, tornando a implementação trivial.

---

### 12.1 Backend — Campo `openedAt` na Resposta

O campo foi adicionado ao `OptionPositionResponseSchema`:

```typescript
export const OptionPositionResponseSchema = z.object({
  // ... campos existentes
  isShort: z.boolean(),
  openedAt: z.string().datetime().optional(),  // ← NOVO
  optionDetail: OptionDetailResponseSchema,
});
```

No service (`derivatives.service.ts`), o campo é populado com o timestamp de criação da posição:

```typescript
const result: OptionPositionResponse = {
  // ...
  openedAt: position.createdAt.toISOString(),
};
```

**Propriedades:**
- Tipo: string ISO 8601 (UTC)
- Opcional (`.optional()`) — retrocompatibilidade com posições existentes sem `openedAt` em memória
- Fonte: `position.createdAt` do Prisma — auditado automaticamente, sem nova coluna no banco

---

### 12.2 Frontend — Cálculo e Exibição

**Cálculo de dias operados (`OptionPositionCard.tsx`):**

```typescript
// dias desde a abertura da posição no sistema
const daysOpened =
  position.openedAt !== undefined
    ? Math.floor(
        (currentTime - new Date(position.openedAt).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;
```

- `Math.floor()` — conservador: não arredonda para cima dia incompleto ("operado há 0 dias" no dia de abertura é correto)
- `currentTime` — prop numérica (`ms desde epoch`) reutilizada para calcular também o `daysUntilExpiry` já existente

**Renderização no footer do card:**

```typescript
{daysOpened !== null && (
  <span className="text-[10px] text-on-surface-variant font-medium">
    Operado há {daysOpened} dia{daysOpened !== 1 ? 's' : ''}
  </span>
)}
```

- Pluralização correta em português: "0 dias", "1 dia", "2 dias"
- Renderização condicional — não aparece se `openedAt` não estiver disponível (posições legadas)
- Localização: footer do card, abaixo da barra de vencimento (expiry bar)

---

### 12.3 Relação com Outros Campos Temporais

O `openedAt` complementa os demais marcadores temporais do ciclo de vida:

| Campo | Significado | Origem |
|-------|-------------|--------|
| `openedAt` | Entrada: quando a posição foi criada | `position.createdAt` |
| `exercisedAt` / `occurredAt` | Saída: data do evento terminal | Informada pelo usuário ou `new Date()` |
| `daysUntilExpiry` | Dias até o vencimento | Calculado dinamicamente |
| `daysOpened` | Dias desde abertura | Calculado dinamicamente |

Juntos, oferecem visibilidade completa do ciclo de vida temporal de uma posição.

---

### 12.4 Arquivos Afetados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `backend/src/modules/derivatives/schemas/option-trade.schema.ts` | Modificado | `openedAt?: z.string().datetime()` adicionado ao `OptionPositionResponseSchema` |
| `backend/src/modules/derivatives/services/derivatives.service.ts` | Modificado | `openedAt: position.createdAt.toISOString()` no mapeamento de resposta |
| `frontend/src/types/api.d.ts` | Modificado | `openedAt?: string` no DTO gerado (OpenAPI) |
| `frontend/src/features/derivatives/options/components/OptionPositionCard.tsx` | Modificado | Cálculo de `daysOpened` e renderização condicional no footer |

---

### 12.5 Limitações Conhecidas

- **Precisão de fuso horário:** diferenças de fuso entre servidor e cliente são normalizadas automaticamente via ISO 8601 (UTC). Discrepâncias de minutos não afetam `Math.floor()`.
- **Posições legadas:** `openedAt = undefined` em posições criadas antes desta feature — o texto "Operado há N dias" simplesmente não aparece; não é erro.
- **`% de lucro no período`:** não implementado neste item. Requereria cálculo de `(currentValue - totalCost) / totalCost * 100` e campo adicional no schema se cacheado no backend.
