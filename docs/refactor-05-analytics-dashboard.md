# Refactor UI — Parte 5: Nova Feature Analytics + Reformulação dos Dashboards

> Documento gerado em 2026-04-13.
> Cobre GAP 4 (reformulação dos dashboards) e GAP 5 (nova feature Análises e Gráficos).

---

## 1. O que o STITCH define

### 1.1 Dashboard Principal (tela mapeada → `HomePageAdvisor` + `HomePageClient`)

A tela "Dashboard Principal" do STITCH tem a seguinte estrutura:

#### Header da página
- Status indicator: "Global Markets Open" (badge verde)
- Botão "Add New Entry" (= "Novo Aporte" ou ação rápida)
- Barra de busca + notificações no header

#### KPI Cards — 4 cards horizontais
| Label | Dado | Ícone |
|---|---|---|
| Assets Under Management | R$ 142.840.500,00 | trending_up |
| Crescimento Mensal | +4.2% | uptrend arrow |
| Novos Aportes | R$ 2.4M | payments |
| Clientes Ativos | 184 | groups |

**Nota de mapeamento:** Esses dados precisam de endpoints novos ou derivados dos existentes. Ver §3.

#### Seção de Clientes Recentes
- 3 avatares de clientes com indicador "+12 este mês"
- Link "Ver todos" → `ClientsPage`

#### Feed "Atividades Recentes"
- Itens tipados: Novo Aporte, Novo Lead, Relatório Trimestral
- Timestamp relativo (há 2 horas, ontem...)
- Link "Ver tudo"
- **Mapeamento:** Existe hoje como `RecentActivity` + `useAdvisorActivity`. Reformular visual.

#### Seção "Alertas Críticos" — 3 blocos de alerta
| Alert | Ação |
|---|---|
| Rebalanceamento N Clientes — limite de volatilidade excedido | Botão "Executar Ordens" |
| Novo Fundo Exclusivo disponível | Botão "Ver Prospecto" |
| Compliance vence em X dias — KYC pendente | Botão "Notificar Clientes" |
- **Mapeamento:** Existe hoje como `UpcomingDueDates`. Reformular visual e expandir para alertas genéricos.

---

### 1.2 Tela "Análises e Gráficos" (nova feature)

A tela de Analytics do STITCH tem a seguinte estrutura:

#### Seletor de período
- Botões de filtro: YTD / Max / Custom Range (com calendar picker)
- Posicionado no topo da área de conteúdo

#### Card 1 — Patrimônio Consolidado
- **Título:** "Evolução histórica ajustada por aportes"
- **Valor principal:** R$ 14.850.200,00 (total)
- **Indicador:** +12.4% vs ano anterior (com ícone trending_up)
- **Gráfico:** Line chart com série temporal Jan→Nov
  - X-axis: meses
  - Y-axis: valor em R$
  - Área sob a curva com gradiente `adv-accent` (emerald)

#### Card 2 — Alocação de Ativos
- **Título:** "Distribuição por classe"
- **Badge:** "100% Diversificado"
- **Gráfico:** Donut/Pie chart com 4 categorias:
  - Ações (Equities): 45%
  - Renda Fixa (Fixed Income): 25%
  - FIIs / Imóveis (Real Estate): 15%
  - Caixa (Cash): 15%
- Legenda com cores por categoria

#### Card 3 — Performance Relativa
- **Título:** "Comparativo de rentabilidade contra índices de mercado"
- **Gráfico:** Line chart dual-série (Portfolio vs Benchmark)
- **Métricas abaixo do gráfico:**
  - vs IBOVESPA: Alpha +4.2% → Carteira 18.4% / IBOV 14.2%
  - vs CDI (100%): Alpha +6.8% → Carteira 19.2% / CDI 12.4%

#### KPI Cards — 3 cards na linha inferior
| Métrica | Valor | Descrição |
|---|---|---|
| Sharpe Ratio | 1.84 | "Risco ajustado superior à média do mercado privado de 1.2" |
| Volatilidade (12m) | 8.2% | "Perfil de baixa volatilidade" |
| Total de Dividendos | R$ 412.000 | +15% YoY |

---

## 2. Plano de Implementação — Dashboard Reformulado

### 2.1 `HomePageAdvisor` — o que muda

**Manter (reformular visualmente):**
- `StatCard` grid → adaptar para os 4 novos KPIs
- `RecentActivity` feed → reformular visual
- `ActivityHistoryModal` → reformular visual

**Remover / substituir:**
- `QuickActions` widget → substituir pela seção "Alertas Críticos"
- `UpcomingDueDates` → absorver por "Alertas Críticos" ou manter como sub-seção

**Adicionar:**
- Seção "Clientes Recentes" com avatares + counter "+N este mês"
- Seção "Alertas Críticos" com 3 tipos de alerta + botões de ação

**Novos componentes necessários:**
```
features/home/components/advisor/
├── AlertCard.tsx              # card de alerta com ação (novo)
├── CriticalAlertsSection.tsx  # seção de alertas críticos (novo)
├── RecentClientAvatars.tsx    # avatares de clientes recentes (novo)
└── MarketStatusBadge.tsx      # badge "Global Markets Open" (novo)
```

### 2.2 `HomePageClient` — o que muda

O cliente vê uma versão simplificada do dashboard. Usando o "Dashboard Principal" como base:
- KPIs: Patrimônio Total, Rentabilidade YTD, Dividendos Recebidos, Aportes no Mês
- Gráfico simplificado de evolução patrimonial (mini line chart)
- Últimas transações da carteira principal
- Botão de acesso rápido à carteira

---

## 3. Referência de Backend (para implementação futura)

> ℹ️ **Decisão de produto (2026-04-13):** A tela Analytics será implementada neste refactor com **dados mockados** como shell visual. O backend será planejado separadamente. Esta seção serve de referência para essa futura implementação.

### 3.1 Dados deriváveis do schema atual (sem integração externa)

| Dado | Fonte no DB |
|---|---|
| Evolução patrimonial | `Transaction` (executedAt, totalValue) + `Wallet.cashBalance` |
| Alocação por classe | `Position` + `Asset.type` + `Wallet.cashBalance` |
| Total de dividendos | `Transaction` WHERE type=DIVIDEND |
| Valor total sob gestão | `Wallet` JOIN `Client` JOIN Advisor |
| Clientes ativos | `Client` WHERE inviteStatus=ACCEPTED |

### 3.2 Dados que requerem integração externa (fora do escopo)

| Dado STITCH | Motivo |
|---|---|
| Performance vs IBOVESPA/CDI | Requer histórico de preços externos (B3/BCB) |
| Sharpe Ratio | Requer preços diários históricos |
| Volatilidade 12m | Requer preços diários históricos |

### 3.3 Migração dos mocks para real (quando o backend for implementado)

1. Criar módulo `backend/src/modules/analytics/` com DTOs Zod
2. Rodar `npm run generate:types` no frontend
3. Em `features/analytics/types/index.ts`: trocar interfaces manuais por tipos de `api.d.ts`
4. Em `analytics.api.ts`: trocar dados mockados por chamadas axios reais
5. Hooks não mudam de assinatura — apenas a `queryFn` interna

---

## 4. Estrutura da Feature Frontend Analytics

### 3.1 Já existe no backend
| Dado | Hook | Endpoint |
|---|---|---|
| Métricas do assessor (clientCount, totalWalletValue, etc.) | `useAdvisorMetrics` | `GET /home/advisor/metrics` |
| Atividade recente | `useAdvisorActivity` | `GET /home/advisor/activity` |
| Vencimentos próximos | `useAdvisorExpirations` | `GET /home/advisor/expirations` |
| Posições da carteira | `useWalletById` | `GET /wallets/:id` |
| Transações | `useTransactions` | `GET /wallets/:id/transactions` |
| Proventos | `useWalletProventos` | `GET /proventos/wallet/:id` |

### 3.2 Faltam no backend (novos endpoints)
| Dado necessário | Onde usar | Prioridade |
|---|---|---|
| Evolução patrimonial histórica (série temporal) | Analytics — Card 1 (line chart) | P0 |
| Alocação por classe de ativo (%) | Analytics — Card 2 (donut chart) | P0 |
| Performance vs benchmarks (IBOV, CDI) | Analytics — Card 3 (dual line chart) | P1 |
| Sharpe Ratio calculado | Analytics — KPI cards | P1 |
| Volatilidade de 12 meses | Analytics — KPI cards | P1 |
| Total de dividendos recebidos | Analytics — KPI cards | P0 |
| Clientes recentes com avatar/inicial | Dashboard — seção clientes | P1 |
| Alertas dinâmicos (rebalanceamento, compliance) | Dashboard — seção alertas | P2 |

> ⚠️ **Nota importante:** Os dados de Performance Relativa (vs IBOV/CDI), Sharpe Ratio e Volatilidade requerem integração com dados de mercado externos ou cálculo interno baseado nas transações. Isso é escopo de backend que precisa ser discutido separadamente. Para o planejamento visual, utilizaremos dados mockados inicialmente.

---

## 4. Estrutura da Feature Frontend Analytics

### 4.1 Localização no projeto

Segue o padrão de feature simples (ARCHITECTURE.md):

```
src/features/analytics/
├── api/
│   ├── analytics.api.ts            # objeto analyticsApi com funções axios
│   ├── useAdvisorOverview.ts       # hook TanStack Query
│   ├── usePortfolioEvolution.ts    # hook TanStack Query
│   ├── useAssetAllocation.ts       # hook TanStack Query
│   ├── useDividendsSummary.ts      # hook TanStack Query
│   └── index.ts
├── components/
│   ├── PortfolioEvolutionChart.tsx
│   ├── AssetAllocationChart.tsx
│   ├── PeriodSelector.tsx
│   └── index.ts
├── pages/
│   └── AnalyticsPage.tsx
├── types/
│   └── index.ts                    # tipos derivados de api.d.ts
└── index.ts                        # barrel: export { AnalyticsPage }
```

### 4.2 Tipos locais (temporários até o backend existir)

```typescript
// features/analytics/types/index.ts
// Tipos manuais — serão substituídos por components['schemas'] quando o backend for implementado

export type PeriodFilter = 'YTD' | 'MAX';

export interface PortfolioDataPoint {
  month: string;   // "Jan", "Fev", ...
  value: number;
}

export interface PortfolioEvolution {
  series:       PortfolioDataPoint[];
  totalValue:   number;
  growthYoYPct: number;
}

export interface AllocationItem {
  label:      string;
  value:      number;
  percentage: number;
  color:      string;
}

export interface AssetAllocation {
  items:      AllocationItem[];
  totalValue: number;
}

export interface DividendsSummary {
  totalAmount:  number;
  yoyGrowthPct: number | null;
}
```

### 4.3 Dados mockados — centralizados em um único arquivo

```typescript
// features/analytics/api/analytics.mock.ts
// TODO: Remover quando backend for implementado. Ver refactor-05 §3 para guia de migração.

import type { PortfolioEvolution, AssetAllocation, DividendsSummary } from '../types';

export const MOCK_PORTFOLIO_EVOLUTION: PortfolioEvolution = {
  totalValue: 14_850_200,
  growthYoYPct: 12.4,
  series: [
    { month: 'Jan', value: 11_200_000 },
    { month: 'Fev', value: 11_800_000 },
    { month: 'Mar', value: 12_100_000 },
    { month: 'Abr', value: 11_900_000 },
    { month: 'Mai', value: 12_500_000 },
    { month: 'Jun', value: 13_200_000 },
    { month: 'Jul', value: 13_800_000 },
    { month: 'Ago', value: 14_100_000 },
    { month: 'Set', value: 13_900_000 },
    { month: 'Out', value: 14_500_000 },
    { month: 'Nov', value: 14_850_200 },
  ],
};

export const MOCK_ASSET_ALLOCATION: AssetAllocation = {
  totalValue: 14_850_200,
  items: [
    { label: 'Ações',      value: 6_682_590, percentage: 45, color: '#000f22' },
    { label: 'Renda Fixa', value: 3_712_550, percentage: 25, color: '#009e6d' },
    { label: 'FIIs',       value: 2_227_530, percentage: 15, color: '#4edea3' },
    { label: 'Caixa',      value: 2_227_530, percentage: 15, color: '#505f76' },
  ],
};

export const MOCK_DIVIDENDS: DividendsSummary = {
  totalAmount: 412_000,
  yoyGrowthPct: 15,
};
```

### 4.4 Hooks — assinatura estável para migração futura

```typescript
// features/analytics/api/usePortfolioEvolution.ts
import { useQuery } from '@tanstack/react-query';
import { MOCK_PORTFOLIO_EVOLUTION } from './analytics.mock';
import type { PeriodFilter } from '../types';

export function usePortfolioEvolution(period: PeriodFilter) {
  return useQuery({
    queryKey: ['analytics', 'portfolio-evolution', period],
    // TODO: substituir por chamada real quando backend existir
    // queryFn: () => analyticsApi.getPortfolioEvolution(period),
    queryFn: async () => MOCK_PORTFOLIO_EVOLUTION,
  });
}

// Mesma estrutura para useAssetAllocation e useDividendsSummary
```

A assinatura do hook **não muda** na migração real — apenas a `queryFn` é trocada.

### 4.3 Rota nova

Entra no grupo de roles `['ADVISOR', 'ADMIN']` **já existente** no `routes/index.tsx`:

```tsx
// routes/index.tsx
import { AnalyticsPage } from '@/features/analytics';

<Route element={<ProtectedLayout allowedRoles={['ADVISOR', 'ADMIN']} />}>
  <Route path="/advisor/home" element={<HomePageAdvisor />} />
  <Route path="/clients" element={<ClientsPage />} />
  <Route path="/analytics" element={<AnalyticsPage />} />  {/* NOVO */}
</Route>
```

### 4.4 Navegação — Sidebar

```tsx
// Sidebar.tsx — adicionar ao advisorNavItems:
{ name: 'Analytics', href: '/analytics', icon: BarChart2 }
```

### 4.5 Barrel export obrigatório

```typescript
// features/analytics/index.ts
export { AnalyticsPage } from './pages/AnalyticsPage';
export * from './types';
```

---

## 5. Especificação dos Componentes Analytics

### 5.1 `PeriodSelector.tsx`
```tsx
// Props: value: 'YTD' | 'MAX' | 'CUSTOM', onChange, customRange?: {from, to}
// Visual: botões pill group (YTD | Max | Custom Range)
// Custom Range: abre um date range picker simples
```

### 5.2 `PortfolioEvolutionChart.tsx`
```tsx
// Usa: recharts LineChart + AreaChart (área sob a curva)
// Dados: Array<{ month: string, value: number }>
// Cor da linha: adv-accent (#009e6d)
// Área: gradiente vertical adv-accent (0.15 opacity → transparent)
// Tooltip customizado com formatCurrency
// X-axis: meses abreviados (Jan, Fev, Mar...)
// Y-axis: formatCurrency compacto (R$ 10M, R$ 12M)
```

### 5.3 `AssetAllocationChart.tsx`
```tsx
// Usa: recharts PieChart (modo donut — innerRadius=60)
// Dados: Array<{ name: string, value: number, color: string }>
// Paleta de cores: adv-primary, adv-accent, secondary, tertiary-fixed-dim
// Legenda lateral com percentuais
// Badge "Diversificado" calculado (>3 classes = high)
```

### 5.4 `PerformanceChart.tsx`
```tsx
// Usa: recharts LineChart com 2 séries
// Série 1: "Carteira" — cor adv-accent
// Série 2: "Benchmark" — cor adv-outline
// Métricas de alpha abaixo do gráfico:
//   vs IBOVESPA: alpha%, portfolio%, benchmark%
//   vs CDI: idem
```

### 5.5 `RiskMetricCard.tsx`
```tsx
// Props: label, value, description, icon
// Visual: Card.tsx base + headline value + body description
// Sem trend arrow (valores absolutos)
```

### 5.6 `AnalyticsPage.tsx` — estrutura da página
```tsx
// Layout:
// 1. Header de página: título "Análises e Gráficos" + PeriodSelector (direita)
// 2. Row: PortfolioEvolutionChart (2/3) | AssetAllocationChart (1/3)
// 3. Row: PerformanceChart (full width)
// 4. Row: RiskMetricCard × 3 (Sharpe | Volatilidade | Dividendos)
```

---

## 6. Ordem de Implementação (Backend-first obrigatório)

O princípio SSOT do projeto exige que o backend seja criado antes do frontend. Sem os endpoints, não há como gerar `api.d.ts` com os tipos corretos.

**Sequência obrigatória:**

```
1. Criar módulo backend analytics (§3.1)
2. Implementar endpoints (§3.2)
3. Rodar npm run generate:types no frontend
4. Criar types/index.ts com tipos derivados de api.d.ts
5. Criar analytics.api.ts + hooks
6. Criar componentes e página
```

**Durante o desenvolvimento, antes dos endpoints existirem:**

A `AnalyticsPage` pode ser criada com estrutura e layout corretos, usando os estados de loading/empty nativos do TanStack Query:

```tsx
// AnalyticsPage.tsx — antes dos endpoints existirem
export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-headline text-2xl font-bold text-adv-text">
        Análises e Gráficos
      </h1>
      <div className="bg-adv-s0 rounded-xl p-12 text-center">
        <BarChart2 className="w-12 h-12 text-adv-outline mx-auto mb-4" />
        <p className="text-adv-text-2">
          Em desenvolvimento. Os dados aparecerão aqui em breve.
        </p>
      </div>
    </div>
  );
}
```

Assim a rota existe, o item do sidebar funciona, e o layout é inserido sem violar SSOT.

---

## 7. Impacto no Roadmap

A adição desta feature expande o roadmap da seguinte forma:

| Etapa original | Atualização |
|---|---|
| Etapa 5 — Dashboard Advisor | Reformulado com base no "Dashboard Principal" STITCH. Adicionar AlertCard, CriticalAlertsSection, RecentClientAvatars. |
| Etapa 8 — Features menores | Adicionar HomePageClient reformulado (visão simplificada do dashboard STITCH) |
| **Nova — Etapa 7.5** | **Feature Analytics** entre Carteiras (7) e Features Menores (8) |
| Etapa 9 — Polish | Incluir verificação dos gráficos recharts no tema light |

### Pré-requisitos para implementar Analytics
1. Etapas 1-3 do roadmap concluídas (tokens + componentes base + shell)
2. `Card.tsx` disponível
3. `PeriodSelector` criado como componente standalone
4. Decisão sobre mock vs endpoint real (recomendado: iniciar com mock)

### Pendências de asset
- [ ] Tela de Login/Register no STITCH (GAP 3) — aguardando criação pelo usuário
