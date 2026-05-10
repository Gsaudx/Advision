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
