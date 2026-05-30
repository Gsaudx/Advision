# Option Contract Size — Single Source of Truth

## Visão Geral

Posições em opções no Advision sempre armazenaram dois números independentes — `quantity` (número de contratos) e `averagePrice` (prêmio por **ação**, não por contrato) — mas o **lote do contrato** (quantas ações cada contrato representa) ficava implícito como `100`, fixado em duas constantes hardcoded: `backend/src/modules/derivatives/constants.ts` e `frontend/src/features/derivatives/types/index.ts`.

Esse padrão funcionou enquanto a leitura passava só pela `DerivativesService` (que importa a constante). Quando o módulo `wallets` passou a renderizar opções junto com ações em `formatPosition`, em `WalletStatsCard`, no donut de concentração e no AUM consolidado, o multiplicador ficou de fora — e o sistema passou a **subvalorar opções em 100×**.

Esta entrega:

1. Promove `contractSize` a coluna de primeira classe em `OptionDetail` (`@default(100) @map("contract_size")`).
2. Captura o `contract_size` da OpLab e persiste no `optionDetail.create`.
3. Aplica o multiplicador em **todos** os caminhos de leitura do módulo `wallets`, no `PerformanceService` e no `ActivityService.getAdvisorMetrics`.
4. Documenta os caminhos de escrita que **ainda** dependem da constante hardcoded — gap consciente nesta versão.

Princípio guia (CLAUDE.md, regra 9): _"The SSOT should be in the following order: 1-database, 2-backend. If a data is present in the database, then it should be transportated all the way to the frontend."_

---

## 1. Problema Observado

### Sintoma

Compra registrada pela carteira:

| Campo                          | Valor                                      |
| ------------------------------ | ------------------------------------------ |
| Ticker                         | `PETRA240` (opção sobre PETR4)             |
| Quantity (contratos)           | 1                                          |
| AveragePrice (prêmio por ação) | R$ 46,97                                   |
| Lote (B3 padrão)               | 100                                        |
| **Total financeiro real**      | **1 × 100 × R$ 46,97 = R$ 4.697,00**       |

Na tela `WalletPage`, antes desta entrega:

- Coluna "Total" da posição: **R$ 46,97** (errado — 100× menor)
- Donut de concentração: opção pesando **~2 %** quando deveria pesar **~32 %** numa carteira de R$ 14.000
- "Lucro/Prejuízo Não Realizado" do `PerformancePanel`: subdimensionado pelo mesmo fator
- AUM consolidado em `ActivityService.getAdvisorMetrics`: ignorava completamente o valor de mercado das opções

### Causa Raiz

`WalletsService.formatPosition` calculava `totalCost = quantity × averagePrice`. Sem o multiplicador, a fórmula trata opção igual a ação. O mesmo padrão se repetia em:

| Local                                         | Cálculo defeituoso                        |
| --------------------------------------------- | ----------------------------------------- |
| `WalletsService.formatPosition`               | `totalCost = qty × price`                 |
| `WalletsService.findAll` (agregado em batch)  | `qty × price` para somar `totalValue`     |
| `WalletsService.getDashboard` (1ª passagem)   | `qty × price` para `totalPositionsValue`  |
| `PerformanceService.aggregate` (realized)     | `(sell − avg) × qty`                      |
| `PerformanceService.aggregate` (unrealized)   | `qty × (currentPrice − referencePrice)`   |
| `PerformanceService.aggregate` (invested)     | `qty × avg`                               |
| `ActivityService.getAdvisorMetrics`           | só somava `cashBalance`, ignorava posições |

A constante `CONTRACT_SIZE = 100` existia em `derivatives/constants.ts`, mas o módulo `wallets` nunca a importou — porque conceitualmente isso seria misturar regras de negócio entre módulos.

---

## 2. Princípio do SSOT

A resposta de domínio à pergunta "_o lote sempre será 100?_" é **não**: a B3 pode ajustar o lote após eventos corporativos (ex: grupamento, desmembramento). Portanto:

- O lote **não é uma constante de aplicação** — é um atributo do contrato específico.
- O dado vem da OpLab no campo `contract_size` da resposta de mercado de opções.
- A SSOT correta é o banco (`option_details.contract_size`), populado a partir da OpLab no momento em que o ativo é resolvido.

A constante `CONTRACT_SIZE` em `derivatives/constants.ts` permanece nesta entrega como **fallback de cálculo no caminho de escrita** (compra/venda no `DerivativesService` e nos modais do front). Isso é um gap conhecido — ver §7.

---

## 3. Modelo de Dados

### Schema (`backend/prisma/schema.prisma`)

```prisma
model OptionDetail {
  id                String       @id @default(uuid())
  assetId           String       @unique @map("asset_id")
  underlyingAssetId String       @map("underlying_asset_id")
  optionType        OptionType   @map("option_type")
  exerciseType      ExerciseType @map("exercise_type")
  strikePrice       Decimal      @db.Decimal(18, 2)
  initialStrike     Decimal?     @map("initial_strike") @db.Decimal(18, 2)
  expirationDate    DateTime     @db.Date
  contractSize      Int          @default(100) @map("contract_size")  // ← novo
  ...
}
```

### Migration (`20260510170817_add_contract_size_to_option_details`)

```sql
-- AlterTable
ALTER TABLE "option_details" ADD COLUMN     "contract_size" INTEGER NOT NULL DEFAULT 100;
```

**Por que `NOT NULL DEFAULT 100`?**

- Registros legados ficam corretos imediatamente: o padrão B3 é 100, então toda opção criada antes desta entrega assume o valor correto sem backfill manual.
- A coluna é obrigatória para que todas as leituras possam tratá-la como `number` (sem checar `null`).
- Opções com lote diferente (ex: pós-grupamento) precisam ser corrigidas manualmente após esta entrega — ou recriadas via novo trade (a OpLab passa a popular o campo automaticamente).

---

## 4. Fluxo de População (Write Path)

```
OpLab API
   │
   │ contract_size: 100
   ▼
OpLabMarketService.getOptionMetadataFromOpLab     ← cache path + API path
   │  retorna AssetMetadata { contractSize?: number }
   ▼
AssetResolverService.ensureAssetExists
   │  spread condicional: contractSize só vai pro create se metadata trouxe valor
   ▼
prisma.optionDetail.create(... contractSize: 100 ...)
```

### Detalhes técnicos

**`OpLabMarketService` (`providers/oplab-market.service.ts`)**:

- `interface OpLabOptionSeries` ganhou `contract_size?: number` (linha 55).
- `interface OpLabFlatOption` (cached) ganhou `contract_size?: number` (linha 107).
- `getOptionMetadataFromOpLab` agora propaga `contractSize: cachedOption.contract_size` (cache hit) ou `contractSize: option.contract_size` (cache miss).
- `getOptionSeries` agora copia `contract_size` ao achatar o response da OpLab tanto para CALL quanto para PUT (linhas 644 e 665).

**`AssetResolverService` (`services/asset-resolver.service.ts`)**:

```ts
optionDetail: {
  create: {
    underlyingAssetId,
    optionType: metadata.optionType ?? 'CALL',
    exerciseType: metadata.exerciseType ?? 'AMERICAN',
    strikePrice: metadata.strikePrice ?? 0,
    initialStrike: metadata.strikePrice ?? 0,
    expirationDate: metadata.expirationDate ?? new Date(),
    ...(metadata.contractSize !== undefined && {
      contractSize: metadata.contractSize,
    }),
  },
},
```

O spread condicional preserva o `@default(100)` quando a OpLab não retorna o campo (ex: ativos importados via brapi, contratos antigos sem `contract_size` no payload).

---

## 5. Caminho de Leitura (Read Path)

Toda computação que produz **valor financeiro** a partir de `quantity × price` agora aplica o multiplicador:

```
multiplier = position.asset.optionDetail?.contractSize ?? 1
```

### Mapa de aplicação

| Arquivo                                                                                          | Local                                          | Cálculo |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ------- |
| `backend/src/modules/wallets/services/wallets.service.ts:119`                                    | `formatPosition` → `totalCost`                 | `qty × avg × multiplier` |
| `backend/src/modules/wallets/services/wallets.service.ts:153`                                    | `formatPosition` → `referenceCost`             | `qty × refPrice × multiplier` |
| `backend/src/modules/wallets/services/wallets.service.ts:155`                                    | `formatPosition` → `currentValue`              | `qty × currentPrice × multiplier` |
| `backend/src/modules/wallets/services/wallets.service.ts:397`                                    | `findAll` → `totalPositionsValue` (batch)      | `qty × (price ou avg fallback) × multiplier` |
| `backend/src/modules/wallets/services/wallets.service.ts:460`                                    | `getDashboard` → `totalPositionsValue`         | `qty × (price ou avg fallback) × multiplier` |
| `backend/src/modules/wallets/services/performance.service.ts:254`                                | `multiplierOf` (helper compartilhado)          | `optionDetail?.contractSize ?? 1` |
| `backend/src/modules/wallets/services/performance.service.ts:284`                                | `aggregate` → realized (SELL)                  | `(price − avg) × qty × multiplier` |
| `backend/src/modules/wallets/services/performance.service.ts:293`                                | `aggregate` → realized (EXPIRED)               | `−avg × qty × multiplier` |
| `backend/src/modules/wallets/services/performance.service.ts:316`                                | `aggregate` → unrealized                       | `(currentValue − cost)` com `multiplier` em ambos |
| `backend/src/modules/wallets/services/performance.service.ts:319`                                | `aggregate` → invested                         | `qty × avg × multiplier` |
| `backend/src/modules/activity/services/activity.service.ts:266`                                  | `getAdvisorMetrics` → `totalPositionsValue`    | `qty × (price ou avg fallback) × multiplier` |

### Reflexo no schema da resposta (`wallet.schema.ts`)

`PositionResponse.optionDetail` ganhou o campo `contractSize: z.number()` (linha 122) — exposto até o frontend via OpenAPI/types geradas. O front pode ler `position.optionDetail.contractSize` se precisar (hoje só usa para exibir info; cálculos já vêm prontos do back).

---

## 6. Frontend

A geração de tipos (`npm run generate:types`) re-baixou o schema OpenAPI e regenerou `frontend/src/types/api.d.ts` (~6.7k linhas alteradas — esperado, é o ground truth da API). O type `Position` no domínio do front (`features/wallets/types/index.ts`) deriva do schema, então `position.optionDetail.contractSize` está disponível tipado.

Nenhum cálculo financeiro no front foi alterado nesta entrega — o front exibe o que o back envia. Os modais de derivativos (`OptionTradeModal`, `UnifiedTradeModal`, `CloseOptionModal`, `AssignmentModal`, `ExerciseOptionModal`) **continuam** importando `CONTRACT_SIZE` de `features/derivatives/types/index.ts`. Ver §7.

---

## 7. Caminho de Escrita — Gaps Conhecidos

O `DerivativesService` (e os modais de trade no front) ainda calculam o valor financeiro da compra/venda usando a constante hardcoded `CONTRACT_SIZE = 100`:

**Backend — `backend/src/modules/derivatives/services/derivatives.service.ts`**

```ts
import { CONTRACT_SIZE } from '../constants';
...
const totalCost = new Decimal(data.premium)
  .times(CONTRACT_SIZE)
  .times(data.quantity);
...
cashBalance: { decrement: totalCost.toNumber() }
```

Pontos afetados:

- `buyOption` (deduz caixa)
- `sellOption` (credita caixa)
- `closeOption` (custo do close)
- `assignOption` / `exerciseOption` (quantidade de ações resultantes)
- `formatPosition` em `DerivativesService` (cálculo de `totalCost` e `currentValue` para a listagem `/wallets/:id/options`)

**Frontend — modais de derivativos**

- `features/derivatives/options/components/OptionTradeModal.tsx`
- `features/derivatives/lifecycle/components/CloseOptionModal.tsx`
- `features/derivatives/lifecycle/components/AssignmentModal.tsx`
- `features/derivatives/lifecycle/components/ExerciseOptionModal.tsx`
- `features/wallets/components/UnifiedTradeModal.tsx`

### Por que aceitar o gap nesta entrega?

1. **Correção é imediatamente correta para B3 padrão (lote = 100).** Toda opção listada no B3 hoje usa `100` exceto após eventos corporativos raros, e mesmo nesses casos a coluna no banco tem o valor correto (vai propagar na próxima leitura).
2. **O bug observado pelo usuário estava no caminho de leitura** (display, concentração, performance, AUM). Esse caminho está agora alinhado.
3. **Caixa é sempre descontado pelo cálculo idêntico ao display da derivatives**, então não há divergência _dentro_ do módulo `derivatives`. A divergência aparece se o front consulta a mesma posição via `/wallets/:id` (que respeita o `contractSize` real) vs. `/wallets/:walletId/options` (que usa `100` hardcoded). Para opções com lote 100, valores batem.

### Quando o gap vira bug

Apenas para opções cujo lote real difere de 100 — ex: depois de um grupamento de ações 10-para-1 onde a B3 ajusta o lote. Nesse caso:

- A OpLab passa a retornar `contract_size != 100` → o banco grava o valor real → o módulo `wallets` calcula correto.
- O módulo `derivatives` continua usando `100` → caixa deduzido errado na compra, P&L errado na visão de derivativos.

### Próximo passo (fora do escopo)

Refatorar `DerivativesService` para resolver o `contractSize` da `OptionDetail` correspondente em cada operação. Mesma estratégia para os modais (campo já vem na resposta da API). Issue de follow-up sugerida.

---

## 8. Blast Radius

### Mudanças por camada

| Camada                | Arquivos                                                                                                                                                                                       | Risco                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Database**          | `prisma/schema.prisma`, migration `add_contract_size_to_option_details`                                                                                                                        | Baixo — ALTER TABLE com `DEFAULT 100`, idempotente, sem locks longos em produção                       |
| **Backend providers** | `wallets/providers/market-data.provider.ts`, `wallets/providers/oplab-market.service.ts`                                                                                                       | Baixo — campo opcional na interface, código existente não muda comportamento                          |
| **Backend resolver**  | `wallets/services/asset-resolver.service.ts`                                                                                                                                                   | Muito baixo — spread condicional preserva default                                                     |
| **Backend leitura**   | `wallets/services/wallets.service.ts`, `wallets/services/performance.service.ts`, `activity/services/activity.service.ts`                                                                      | **Médio** — muda valores numéricos retornados; cobertos por testes dedicados (`performance.service.spec.ts`) |
| **Backend schema**    | `wallets/schemas/wallet.schema.ts`                                                                                                                                                             | Baixo — campo novo, retrocompatível                                                                  |
| **Backend testes**    | `wallets/__tests__/performance.service.spec.ts` (3 testes novos sobre multiplier), `wallets/__tests__/wallets.controller.spec.ts`, `wallets/__tests__/wallets.service.spec.ts`, `activity/__tests__/activity.service.spec.ts` | Baixo                                                                                                |
| **Frontend tipos**    | `frontend/src/types/api.d.ts` (auto-gerado), `features/wallets/types/index.ts`                                                                                                                 | Baixo — apenas adições                                                                               |

### Cobertura de teste

`backend/src/modules/wallets/__tests__/performance.service.spec.ts` cobre:

- `EXPIRED` aplica multiplier (10 contratos × 100 × R$ 2,50 = −R$ 2.500)
- Open option aplica multiplier (1 contrato × 100 × (R$ 50 − R$ 46,97) = R$ 303 unrealized; R$ 4.697 invested; ~6,45 %)
- STOCK sem `optionDetail` cai no fallback `multiplier = 1`
- Stock convencional (P&L sobre running average, sem multiplier)

Suite completa: **492/492 testes verdes**.

### Endpoints que mudaram de comportamento _sem_ mudar de assinatura

| Endpoint                          | Antes                                                                          | Depois                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `GET /wallets`                    | `totalValue` = só caixa                                                        | `totalValue` = caixa + posições a mercado (com multiplier para opções)             |
| `GET /wallets/:id`                | `totalPositionsValue` ignorava lote                                            | Inclui lote; expõe `concentration` e `weightPercent`                               |
| `GET /wallets/:id/performance`    | _não existia_                                                                  | Novo                                                                                |
| `GET /activity/advisor/metrics`   | `totalWalletValue` = só caixa                                                  | Inclui posições a mercado com multiplier                                            |

---

## 9. Edge Cases

### 9.1 Opções legadas sem `contract_size` no payload da OpLab

Se a OpLab retornar a opção mas sem o campo `contract_size`, o spread condicional em `AssetResolverService` não inclui `contractSize` no `create` — o `@default(100)` do Prisma assume. Resultado correto para B3 padrão.

### 9.2 Resposta da OpLab muda lote em opção já existente

`AssetResolverService.ensureAssetExists` faz **upsert** no asset, mas a `create` do `optionDetail` só roda quando o asset é criado. Se um asset OPTION já existe no banco e a OpLab passa a retornar `contract_size` diferente, o valor antigo permanece. **Não é coberto nesta entrega**. Mitigação possível: update do `optionDetail` quando metadata diverge.

### 9.3 Posição com `priceAtLastDividend`

`formatPosition` aplica o multiplier em **ambos** os custos (`referenceCost = qty × refPrice × multiplier`) e no valor a mercado (`currentValue = qty × currentPrice × multiplier`). O P&L percentual sobre custo continua coerente.

### 9.4 Quote indisponível para a opção

`marketData.getBatchPrices` pode não retornar o ticker da opção (cache miss + erro OpLab). Nesse caso, o cálculo de `totalPositionsValue` cai no fallback `qty × averagePrice × multiplier`. Resultado: a posição mantém **pelo menos o valor investido** no AUM e na concentração — nunca some.

### 9.5 Race de upsert em `Asset`

`ensureAssetExists` usa `upsert` por `ticker` (unique). Duas chamadas concorrentes para o mesmo ticker:

- Vencedora cria o asset + optionDetail com o `contractSize` da metadata.
- Perdedora cai no path `update` (sem tocar em `optionDetail`).

Resultado consistente: a primeira `create` define o `contractSize`.

### 9.6 `recalculatePosition` (em `TradingService`) e o multiplier

`recalculatePosition` reconstrói `quantity` e `averagePrice` a partir das transações. Como `averagePrice` é por ação (não por contrato), **o multiplier não entra no cálculo** — está correto. O valor financeiro só aparece quando a posição é formatada para resposta (via `formatPosition`).

---

## 10. Migração e Rollback

### Forward

```bash
cd backend
npx prisma migrate dev
# aplica add_contract_size_to_option_details
```

Migration é segura em produção:

- `ALTER TABLE ... ADD COLUMN ... DEFAULT 100` no PostgreSQL 11+ é instantâneo (não reescreve a tabela; default é metadata).
- Sem locks longos, sem riscos para chaves estrangeiras.

### Rollback

```sql
ALTER TABLE option_details DROP COLUMN contract_size;
```

Reverter a migration é seguro — a coluna foi criada com `NOT NULL DEFAULT 100`, então valores antigos estavam alinhados com o comportamento legado. Após o drop, o código novo precisaria ser revertido (caso contrário, leitura quebra).

Caminho de reversão completo (em ordem):

1. `git revert` do commit `feat(wallets): add performance, concentration and option contract size SSOT`.
2. `npx prisma migrate resolve --rolled-back add_contract_size_to_option_details` + manual `DROP COLUMN`.
3. Restart do backend.

---

## 11. Não está no escopo

- **Backfill do `DerivativesService`** para usar `optionDetail.contractSize` em vez da constante.
- **Refatoração dos modais de derivativos no front** para consumir `position.optionDetail.contractSize`.
- **Detecção automática de mudança de lote** após corporate action (hoje só a primeira criação grava o valor).
- **Recálculo retroativo do `cashBalance`** para opções compradas/vendidas com lote ≠ 100 (gap só relevante após M2 acima).

---

## 12. Arquivos Relevantes

### Backend

| Arquivo                                                                                          | Mudança                                                                                                                |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `backend/prisma/schema.prisma`                                                                   | `OptionDetail.contractSize Int @default(100) @map("contract_size")`                                                    |
| `backend/prisma/migrations/20260510170817_add_contract_size_to_option_details/migration.sql`     | **Nova migration** — `ALTER TABLE option_details ADD COLUMN contract_size INTEGER NOT NULL DEFAULT 100`                |
| `backend/src/modules/wallets/providers/market-data.provider.ts`                                  | `AssetMetadata.contractSize?: number`                                                                                  |
| `backend/src/modules/wallets/providers/oplab-market.service.ts`                                  | `contract_size` em `OpLabOptionSeries` e `OpLabFlatOption`; propagado em `getOptionMetadataFromOpLab` e `getOptionSeries` |
| `backend/src/modules/wallets/services/asset-resolver.service.ts`                                 | Persiste `contractSize` no `optionDetail.create` quando metadata fornece                                               |
| `backend/src/modules/wallets/services/wallets.service.ts`                                        | `formatPosition`, `findAll`, `getDashboard` aplicam multiplier                                                         |
| `backend/src/modules/wallets/services/performance.service.ts`                                    | Helper `multiplierOf`; multiplier em realized/unrealized/invested                                                      |
| `backend/src/modules/activity/services/activity.service.ts`                                      | `getAdvisorMetrics` agrega posições a mercado com multiplier                                                           |
| `backend/src/modules/wallets/schemas/wallet.schema.ts`                                           | `PositionResponse.optionDetail.contractSize: number`                                                                   |
| `backend/src/modules/wallets/__tests__/performance.service.spec.ts`                              | **Novo** — 3 testes dedicados ao multiplier (EXPIRED, open option, stock fallback)                                     |

### Frontend

| Arquivo                                | Mudança                                                                |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `frontend/src/types/api.d.ts`          | Regenerado via `npm run generate:types` — expõe `contractSize` na API   |
| `frontend/src/features/wallets/types/` | Tipos derivam do schema OpenAPI; nenhuma alteração manual              |

### Gaps documentados (intacto, mas marcados)

| Arquivo                                                                                          | Status                                                                |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `backend/src/modules/derivatives/constants.ts`                                                   | `CONTRACT_SIZE = 100` ainda em uso pelo `DerivativesService`           |
| `backend/src/modules/derivatives/services/derivatives.service.ts`                                | Importa `CONTRACT_SIZE`; usado em buy/sell/close/assign/exercise       |
| `frontend/src/features/derivatives/types/index.ts`                                               | `CONTRACT_SIZE = 100` ainda em uso pelos modais de derivativos        |
| `frontend/src/features/wallets/components/UnifiedTradeModal.tsx`                                 | Importa `CONTRACT_SIZE` para cálculo de total na UI de compra         |

---

## 13. Relação com Outros Módulos

| Módulo                                                  | Relação                                                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [PERFORMANCE.md](./PERFORMANCE.md)                      | `PerformanceService` é o consumidor primário do multiplier; performance % seria 100× errada sem essa correção                                          |
| [PROVENTOS.md](./PROVENTOS.md)                          | Sentinel grava `priceAtLastDividend` por ação — `formatPosition` aplica o multiplier também sobre esse preço de referência                            |
| Módulo `derivatives` (sem PRD ainda)                     | Continua usando `CONTRACT_SIZE = 100` no caminho de escrita — gap conhecido (§7)                                                                       |
