# Performance & Concentração de Carteira

## Visão Geral

O módulo de performance complementa o `wallets` core e responde por três perguntas que o assessor faz a cada abertura de carteira:

1. **Quanto a carteira lucrou ou perdeu?** (lucro/prejuízo consolidado)
2. **Quanto isso representa em % sobre o que foi investido?** (rentabilidade)
3. **Em que cada cliente está exposto?** (concentração por ativo, tipo e setor)

A lógica vive dentro do módulo `wallets` (`services/performance.service.ts`) e expõe um endpoint dedicado `GET /wallets/:id/performance`. O dashboard normal (`GET /wallets/:id`) também passa a devolver agregados leves (totalValue, totalInvested, totalPnl, concentration) para evitar requisições adicionais quando o front só precisa do resumo.

---

## 1. Convenções de Domínio

| Convenção         | Valor                                               | Justificativa                                                                   |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| **L/P principal** | `realizado + não-realizado + proventos`             | Padrão das corretoras BR (XP, BTG); número único, fácil de entender             |
| **Base do %**     | `Σ position.totalCost` (custo das posições abertas) | Mantém coerência com `position.profitLossPercent` já usado por posição          |
| **Concentração**  | sobre posições investidas; caixa fora               | Reflete diversificação entre ativos escolhidos; caixa é informado separadamente |
| **`/wallets`**    | sempre retorna agregados                            | Resolve bugs de "Total sob Gestão" mostrando só caixa; lista enriquecida sempre |

> Limitação consciente: rentabilidade % degrada para `0` quando todas as posições foram fechadas (denominador zero). A decisão de manter `Σ totalCost` como base foi tomada conscientemente para alinhar com a convenção interna; TWR (time-weighted return) requer snapshots históricos e está fora do escopo atual.

---

## 2. Modelo de Cálculo

### Lucro/Prejuízo Realizado

Replay das transações da carteira mantendo um _running average_ por ativo. A cada `BUY`, o average é recalculado:

```
newAvg = (existingQty × existingAvg + buyQty × buyPrice) / (existingQty + buyQty)
```

A cada `SELL`, o lucro/prejuízo realizado é calculado contra o average vigente naquele momento:

```
realized += (sellPrice - currentAvg) × sellQty
```

A cada `EXPIRED` (opção que virou pó), todo o prêmio pago vira perda:

```
realized += -currentAvg × expiredQty
```

A quantity é decrementada normalmente. Se ela chegar a zero ou negativa, o running state do ativo é resetado.

### Lucro/Prejuízo Não Realizado

Para cada posição aberta:

```
referencePrice = position.priceAtLastDividend ?? position.averagePrice
referenceCost  = position.quantity × referencePrice
currentValue   = position.quantity × currentMarketPrice
unrealized    += currentValue - referenceCost
```

**Por que `priceAtLastDividend`?** Quando a B3 paga um provento, o preço da ação cai no `exDate` por exatamente o valor do dividendo. Usar o preço pós-dividendo como base evita que o L/P "perca" a queda artificial — o módulo Sentinel grava esse preço a cada provento detectado.

### Proventos Recebidos

Lidos diretamente de `WalletDividendPayment` (populado pelo módulo Sentinel). Soma `totalReceived` de todas as linhas da carteira.

### Total e Rentabilidade %

```
total           = realized + unrealized + dividends
totalInvested   = Σ position.totalCost (apenas posições abertas)
totalPercent    = totalInvested > 0 ? (total / totalInvested) × 100 : 0
```

---

## 3. Concentração

Sobre o conjunto de posições investidas (caixa excluído):

| Breakdown    | Chave de agrupamento                  | Uso                                                                 |
| ------------ | ------------------------------------- | ------------------------------------------------------------------- |
| **byAsset**  | `position.ticker`                     | Top N + "Outros" no donut da `WalletPage`; lista detalhada no modal |
| **byType**   | `STOCK` ou `OPTION`                   | Cards "Ações vs Opções" no modal de detalhes                        |
| **bySector** | `Asset.sector` (fallback "Sem setor") | Barras horizontais por setor no modal                               |

O peso de cada posição é `currentValue / totalPositionsValue`, calculado uma vez no `getDashboard` e devolvido em `position.weightPercent`.

> **Setor pode estar vazio:** o backend não popula `Asset.sector` automaticamente hoje (Brapi nem sempre retorna). Posições sem setor caem em "Sem setor". Backfill seria um item separado.

---

## 4. Arquitetura

### Módulo

```
src/modules/wallets/
├── services/
│   ├── performance.service.ts    ← novo: replay + agregação
│   └── wallets.service.ts        ← agregados leves no findAll/getDashboard
├── controllers/
│   └── wallets.controller.ts     ← novo endpoint GET :id/performance
└── schemas/
    └── wallet.schema.ts          ← +weightPercent, +concentration, +WalletPerformanceResponse
```

### `PerformanceService` — responsabilidades

| Método                             | Quando usar                                       | O que retorna                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `computePerformance(walletId)`     | Endpoint dedicado de performance (visão completa) | Realized, unrealized, dividends, total, breakdown por ativo. Lê proventos do agregado completo (`ProventosCalculationService.getWalletProventos`) |
| `computeTotals(walletId, options)` | Lista de carteiras e dashboard (visão leve)       | Apenas totais; lê dividends direto de `walletDividendPayment.aggregate` (sem ensureProcessed para evitar overhead)                                |

A diferença é importante: `computeTotals` aceita `openPositions` e `prices` pré-carregados, então o `findAll` faz **uma única chamada** a `getBatchPrices` para todos os tickers de todas as wallets e reusa o resultado.

### Fluxo de uma listagem de carteiras (`GET /wallets`)

```
1. prisma.wallet.findMany — todas as carteiras acessíveis
2. prisma.position.findMany — todas as posições abertas dessas carteiras (1 query)
3. marketData.getBatchPrices — preços de todos os tickers únicos (1 chamada)
4. Para cada wallet em paralelo:
     PerformanceService.computeTotals(walletId, { openPositions, prices })
5. Mapeia: cada wallet ganha totalValue, totalInvested, totalPnl, totalPnlPercent
```

Cache da camada de market data (60s TTL) absorve abertas repetidas. Para um assessor com 30 clientes ≈ 50 carteiras ≈ 200 tickers únicos, isso é uma chamada batch única.

---

## 5. API — Endpoints

| Método | Rota                       | Resposta                                                                                                                            |
| ------ | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/wallets`                 | Lista enriquecida: cada item com `cashBalance`, `totalPositionsValue`, `totalValue`, `totalInvested`, `totalPnl`, `totalPnlPercent` |
| `GET`  | `/wallets/:id`             | Dashboard com positions (cada uma com `weightPercent`), totais e `concentration { byAsset, byType, bySector }`                      |
| `GET`  | `/wallets/:id/performance` | Visão completa: `realized`, `unrealized`, `dividends`, `total`, `totalInvested`, `totalPercent`, `byAsset[]`                        |

### Schemas

```typescript
// PositionResponse adiciona:
weightPercent?: number    // currentValue / totalPositionsValue × 100
sector?: string | null    // do Asset.sector

// WalletSummaryResponse adiciona:
totalPositionsValue: number  // Σ position.currentValue (preços a mercado)
totalValue: number           // cashBalance + totalPositionsValue
totalInvested: number        // Σ position.totalCost (custo investido)
totalPnl: number             // computeTotals.total
totalPnlPercent: number      // computeTotals.totalPercent

// WalletResponse extends Summary + positions[] adiciona:
concentration: {
  byAsset: ConcentrationItem[]
  byType: ConcentrationItem[]
  bySector: ConcentrationItem[]
}

// ConcentrationItem
{ key: string, label: string, value: number, percent: number }

// WalletPerformanceResponse
{
  walletId, realized, unrealized, dividends, total,
  totalInvested, totalPercent,
  byAsset: [{ assetId, ticker, name, type, realized, unrealized, dividends, total }]
}
```

---

## 6. Frontend

### Componentes

| Arquivo                                              | Papel                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `features/wallets/components/PerformancePanel.tsx`   | 4 mini-cards no header da `WalletPage`: Realizado, Não realizado, Proventos, **Total** (destacado, com %)           |
| `features/wallets/components/ConcentrationPanel.tsx` | Donut + lista (top 5 + Outros) na coluna esquerda; modal "Detalhes" com breakdown por tipo, setor e tabela completa |
| `features/wallets/components/WalletStatsCard.tsx`    | Stats da `WalletsPage`: Total de Carteiras, Saldo em Caixa, Lucro/Prejuízo, Patrimônio Total                        |
| `features/wallets/components/WalletCard.tsx`         | Card de carteira com Patrimônio + dois mini-cards (R$ e %)                                                          |

### Hook

`features/wallets/api/useWalletPerformance.ts` — `useQuery` com `refetchInterval: 60000` (mesmo padrão do `useWalletById`).

### Invalidação no SSE da Sentinela

Quando a sentinela detecta novos dividendos, o `useEffect` da `WalletPage` invalida também `['wallet', walletId, 'performance']` para refletir os proventos imediatamente.

---

## 7. Activity Service

`ActivityService.getAdvisorMetrics` agora calcula `totalWalletValue` corretamente — soma de `cashBalance` mais o valor de mercado das posições abertas (mesma lógica do `findAll`). O módulo `ActivityModule` importa `WalletsModule` para injetar `MARKET_DATA_PROVIDER`.

---

## 8. Edge Cases

### Posição totalmente fechada

Quando todas as posições da carteira foram vendidas, `totalInvested = 0` e `totalPercent = 0` (impossível dividir). O assessor ainda vê o realizado e os proventos no Total — só perde a referência percentual. **Aceito conscientemente** dada a escolha de base (decisão de domínio).

### Opção exercida ou atribuída

`OPTION_EXERCISE` e `OPTION_ASSIGNMENT` são tratadas pelo TradingService nas suas próprias rotinas (cria/extingue posições no underlying). O `PerformanceService` só lê `BUY`/`SELL`/`EXPIRED`, então o efeito desses lifecycle events aparece via:

- `BUY` ou `SELL` no underlying gerada pela TradingService
- `SELL` no contrato (close) ou `EXPIRED` (vencimento sem valor)

### Race com cotação indisponível

Se `getBatchPrices` não retornar o ticker, o `unrealized` daquela posição assume `currentValue = qty × averagePrice` (fallback para preço médio), garantindo que o agregado nunca quebra. A coluna `currentPrice` no front fica como `'-'`.

### Concurrent buys e running average

O replay é determinístico — `orderBy: [executedAt asc, createdAt asc]`. Empates de timestamp são resolvidos pela ordem de criação. Não há corrida porque o cálculo é puro sobre o snapshot de transações lido.

---

## 9. Não está no escopo

- **TWR / curva de rentabilidade temporal**: requer nova tabela `WalletSnapshot` (date, totalValue, cashFlow) populada por cron diário.
- **Backfill de `Asset.sector`**: a Brapi nem sempre retorna setor; agrupamento "Sem setor" cobre o gap.
- **Comparação com benchmark (CDI, IBOV)**: depende de TWR + integração com fonte de cotação histórica do índice.
- **L/P realizado por janela temporal** (mês/ano): hoje só temos o total acumulado.

---

## 9-A. ConcentrationPanel — Visão Contextual por Ativo ou por Opção

> **Commit de referência:** 19dcacc — refatoração de 423 → 733 linhas no componente.

### Contexto

O `ConcentrationPanel` foi refatorado para adaptar seu comportamento à aba ativa da `WalletPage` (Ativos ou Opções). Anteriormente exibia apenas a concentração de ações via prop `byAsset` computada no backend. Agora:

- **Aba "Ativos"**: concentração de ações (stocks) — donut + top 5 por ativo
- **Aba "Opções"**: concentração de opções — donut + top 5 por opção

### Mudança na Interface de Props

| Propriedade antiga | Situação   | Nova propriedade                                                                    |
| ------------------ | ---------- | ----------------------------------------------------------------------------------- |
| `byAsset`          | **Removida** | Calculada localmente a partir de `positions` (stocks) e `optionPositions`          |
| `byType`           | Mantida    | Mantida como prop opcional                                                          |
| `bySector`         | Mantida    | Mantida como prop opcional                                                          |
| —                  | **Nova**   | `view?: 'assets' \| 'options'` — controla qual visualização está ativa             |
| —                  | **Nova**   | `optionPositions?: OptionPosition[]` — posições de opções para concentração         |

Interface anterior:
```typescript
interface ConcentrationPanelProps {
  byAsset: ConcentrationItem[];
  byType?: ConcentrationItem[];
  bySector?: ConcentrationItem[];
  positions: Position[];
  performance?: WalletPerformance | null;
  currency: string;
  totalPositionsValue: number;
}
```

Interface nova:
```typescript
interface ConcentrationPanelProps {
  byType?: ConcentrationItem[];
  bySector?: ConcentrationItem[];
  positions: Position[];
  optionPositions?: OptionPosition[];
  performance?: WalletPerformance | null;
  currency: string;
  totalPositionsValue: number;
  view?: 'assets' | 'options';
}
```

### Função `buildConcentration()`

Nova função auxiliar que calcula percentual de concentração a partir de uma lista de itens e um total:

```typescript
function buildConcentration(
  items: { key: string; label: string; value: number }[],
  total: number,
): ConcentrationItem[] {
  if (total <= 0) return [];
  return items.map((item) => ({
    key: item.key,
    label: item.label,
    value: item.value,
    percent: (item.value / total) * 100,
  }));
}
```

### Cálculo por Tipo de Visão (`useMemo`)

**Modo Ativos (stocks):**
```typescript
const stockItems = useMemo(() => {
  const stocks = positions.filter((p) => p.type === 'STOCK');
  const total = stocks.reduce((sum, p) => sum + (p.currentValue ?? p.totalCost), 0);
  return buildConcentration(
    stocks.map((p) => ({ key: p.ticker, label: p.ticker, value: p.currentValue ?? p.totalCost })),
    total,
  );
}, [positions]);
```

**Modo Opções:**
```typescript
const optionItems = useMemo(() => {
  const total = optionPositions.reduce((sum, p) => sum + (p.currentValue ?? p.totalCost), 0);
  return buildConcentration(
    optionPositions.map((p) => ({ key: p.ticker, label: p.ticker, value: p.currentValue ?? p.totalCost })),
    total,
  );
}, [optionPositions]);
```

**Seleção dinâmica:**
```typescript
const activeItems = view === 'options' ? optionItems : stockItems;
```

### Chamada na WalletPage

```typescript
<ConcentrationPanel
  byType={wallet.concentration.byType}
  bySector={wallet.concentration.bySector}
  positions={wallet.positions}
  optionPositions={optionPositionsData?.positions ?? []}
  performance={performance}
  currency={wallet.currency}
  totalPositionsValue={wallet.totalPositionsValue}
  view={subTab === 'options' ? 'options' : 'assets'}
/>
```

> `byAsset` foi removido da chamada; a `WalletPage` passa `view` determinado por `subTab`.

### Modal de Detalhes Unificado

Um único `ConcentrationDetailsModal` renderiza seções condicionalmente conforme o conteúdo disponível:

| Seção                   | Condição de exibição              | Visível em           |
| ----------------------- | --------------------------------- | -------------------- |
| "Por tipo"              | `byType.length > 0`               | Ambas as vistas      |
| "Por setor"             | `bySector.length > 0`             | Ambas as vistas      |
| "Por ativo"             | `sortedStockAssets.length > 0`    | Apenas Ativos        |
| "Opções por ativo base" | `optionsByBase.length > 0`        | Apenas Opções        |
| "Por opção"             | `sortedOptions.length > 0`        | Apenas Opções        |

**Tabela "Por ativo" (ações):**

| Coluna  | Conteúdo                                                     |
| ------- | ------------------------------------------------------------ |
| Ativo   | Ticker + nome em sub-linha                                   |
| Qtd     | Quantidade de ações                                          |
| Valor   | `currentValue` ou fallback para `totalCost`                  |
| L/P     | Lucro/prejuízo total do ativo (de `performance.byAsset`)     |
| %       | Concentração sobre total de ações                            |

**Tabela "Opções por ativo base" (agrupamento por `underlyingTicker`):**

| Coluna      | Conteúdo                                               |
| ----------- | ------------------------------------------------------ |
| Ativo base  | Ticker do underlying (ex: PETR4)                       |
| Opções      | Contagem de contratos sobre esse underlying            |
| Qtd ações   | Soma das `quantity` de todos os contratos (exposição)  |
| Valor       | Soma do valor atual dos contratos                      |
| L/P         | Soma do P&L dos contratos sobre esse underlying        |
| %           | Concentração sobre total de opções                     |

**Tabela "Por opção" (individual):**

| Coluna  | Conteúdo                                                          |
| ------- | ----------------------------------------------------------------- |
| Opção   | Ticker do contrato (ex: PETRG25)                                  |
| Tipo    | Badge "CALL" (verde) ou "PUT" (vermelho)                          |
| Strike  | Preço de exercício                                                |
| Qtd     | Quantidade de contratos                                           |
| Valor   | Valor atual da posição                                            |
| L/P     | Lucro/prejuízo da posição                                         |
| %       | Concentração sobre total de opções                                |

> Sem coluna "Direção": o badge de tipo (CALL/PUT) já implica a direção; economiza espaço na tabela.

### Decisões Arquiteturais

| Decisão | Razão |
| ------- | ----- |
| Cálculo local em vez de backend | Backend retorna `byAsset` misturando ações e opções; calcular localmente dá clareza, separação e evita novo endpoint |
| Modal unificado com seções condicionais | Evita duplicação de backdrop/header/animações; um único `showDetails` boolean; "Por tipo" e "Por setor" aparecem em ambas as vistas |
| `underlyingTicker` como chave de agrupamento | Reflete composição lógica (exposição por ativo base), distinta do ticker do contrato |
| Sem coluna Direção em "Por opção" | Badge CALL/PUT já diferencia; posições curtas de varejo são menos comuns; pode ser adicionado depois se necessário |

### Arquivos Afetados

| Arquivo | Mudanças |
| ------- | -------- |
| `frontend/src/features/wallets/components/ConcentrationPanel.tsx` | Remoção de `byAsset` prop; adição de `view` e `optionPositions`; nova `buildConcentration()`; cálculo local via `useMemo`; labels dinâmicos; modal com suporte a opções |
| `frontend/src/features/wallets/pages/WalletPage.tsx` | Removido `byAsset={wallet.concentration.byAsset}`; adicionados `optionPositions` e `view` |

### Gaps e Limitações Conhecidos

- **Backend não computa concentração de opções**: tudo calculado no frontend; mudanças em `OptionPosition` exigem ajuste aqui.
- **"Por tipo" e "Por setor" podem estar vazios**: seções simplesmente não renderizam; sem validação adicional.
- **Performance em carteiras grandes**: `useMemo` recalcula a cada mudança de `view` ou dados; sem paginação ou virtualização.
- **`underlyingTicker` ausente**: opção sem esse campo não agrupa corretamente em "Opções por ativo base".
- **Modal sem paginação**: tabela "Por opção" é scrollável; sem paginação para carteiras com 100+ opções.

---

## 10. Arquivos Relevantes

### Backend

| Arquivo                                                 | Mudança                                                                                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/modules/wallets/services/performance.service.ts`   | **Novo** — `computePerformance` e `computeTotals`                                                                                                     |
| `src/modules/wallets/services/wallets.service.ts`       | `formatPosition` retorna `weightPercent`; `formatWalletSummary` aceita agregados; `findAll` enriquece em batch; `getDashboard` agrega + concentration |
| `src/modules/wallets/controllers/wallets.controller.ts` | Novo endpoint `GET :id/performance`                                                                                                                   |
| `src/modules/wallets/schemas/wallet.schema.ts`          | +`weightPercent`, +`totalInvested/totalPnl/totalPnlPercent`, +`ConcentrationItem`, +`WalletConcentration`, +`WalletPerformanceResponseSchema`         |
| `src/modules/wallets/wallets.module.ts`                 | Registra/exporta `PerformanceService`                                                                                                                 |
| `src/modules/activity/services/activity.service.ts`     | `getAdvisorMetrics` usa preços de mercado para `totalWalletValue`                                                                                     |
| `src/modules/activity/activity.module.ts`               | Importa `WalletsModule`                                                                                                                               |

### Frontend

| Arquivo                                              | Mudança                                                                                                                                  |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `features/wallets/api/useWalletPerformance.ts`       | **Novo** — hook do endpoint                                                                                                              |
| `features/wallets/api/wallets.api.ts`                | `getPerformance`                                                                                                                         |
| `features/wallets/components/PerformancePanel.tsx`   | **Novo** — 4 mini-cards                                                                                                                  |
| `features/wallets/components/ConcentrationPanel.tsx` | **Novo** — donut + modal detalhado                                                                                                       |
| `features/wallets/components/WalletStatsCard.tsx`    | Métricas reais (sem mock "Valor Investido = 0")                                                                                          |
| `features/wallets/components/WalletCard.tsx`         | Removidos mocks (risco, sparkline, 30D); 2 mini-cards reais                                                                              |
| `features/wallets/pages/WalletsPage.tsx`             | "Visão Consolidada" com totais reais; sem cards mockados                                                                                 |
| `features/wallets/pages/WalletPage.tsx`              | Header com Patrimônio + breakdown caixa/investido; PerformancePanel após o header; ConcentrationPanel substitui Asset Allocation mockado |
| `features/wallets/types/index.ts`                    | +`WalletPerformance`, +`PerformanceByAsset`, +`ConcentrationItem`; `transactionTypeLabels`/`Colors` cobrem `EXPIRED`                     |
