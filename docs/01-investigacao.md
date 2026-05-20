# FASE 1 — Investigação do Codebase

> **Status:** ENTREGUE
> **Data:** 2026-05-18
> **Inputs lidos:** `PROGRESS.md` + codebase do projeto Advision
> **Output:** este arquivo preenchido

---

## 1. Estrutura de pastas relevante

```
backend/src/
├── modules/
│   ├── activity/                      # Log de atividades do advisor
│   ├── assets/                        # Módulo vazio — assets criados via AssetResolverService
│   ├── auth/                          # JWT, guards, decorators
│   ├── clients/                       # CRUD de clientes, sistema de convite
│   ├── derivatives/                   # Operações estruturadas com opções
│   ├── health/                        # Health check da API
│   ├── notifications/                 # [NOTIF] geração e listagem de alertas de vencimento
│   │   └── services/notifications.service.ts
│   ├── optimization/                  # Algoritmo Knapsack
│   ├── proventos/                     # Dividendos via Brapi
│   ├── sentinel/                      # [SENTINEL] detecção de proventos via OpLab
│   └── wallets/                       # Módulo central — carteiras, posições, trading, performance
│       ├── controllers/wallets.controller.ts
│       ├── providers/
│       │   ├── market-data.provider.ts    # Interface abstrata + MARKET_CACHE_TTL_MS = 60s
│       │   ├── brapi-market.service.ts    # Cotações de ações via Brapi
│       │   ├── oplab-market.service.ts    # Cotações de opções + histórico via OpLab
│       │   ├── composite-market.service.ts  # Roteador stocks→Brapi / options→OpLab
│       │   └── yahoo-market.service.ts    # Busca de ativos (não cotações)
│       ├── schemas/wallet.schema.ts       # Zod schemas e DTOs
│       └── services/
│           ├── asset-resolver.service.ts  # ÚNICO ponto de criação de Asset
│           ├── performance.service.ts     # Cálculo de P&L por carteira
│           ├── trading.service.ts         # BUY/SELL/EXPIRE — chama AssetResolverService
│           ├── wallet-access.service.ts   # Verificação de acesso
│           ├── wallets.service.ts         # CRUD de carteiras + listagem com totais
│           └── audit.service.ts           # Auditoria de ações
├── shared/
│   ├── prisma/prisma.service.ts           # PrismaService (@Global)
│   ├── domain-events/                     # Eventos de domínio
│   └── shared.module.ts                   # @Global: PrismaService, DomainEventsService
└── app.module.ts                          # Registro de todos os módulos

frontend/src/
├── components/
│   ├── layout/
│   │   ├── ProtectedLayout.tsx    # Wrapper de auth + Header + Sidebar
│   │   ├── Sidebar.tsx            # Menu de navegação colapsável
│   │   ├── Header.tsx             # Cabeçalho com search e user menu
│   │   └── ModalBase.tsx
│   └── ui/                        # Design system: LoadingSpinner, ButtonSubmit, Input, etc.
├── features/
│   ├── auth/                      # AuthProvider, useAuth hook
│   ├── home/                      # Dashboard do advisor e client
│   │   ├── api/useAdvisorExpirations.ts   # Hook do card de vencimentos
│   │   └── components/advisor/UpcomingDueDates.tsx  # Card de vencimentos no dashboard
│   ├── notifications/             # [NOTIF] página de configurações
│   ├── wallets/                   # Carteiras, posições, trading
│   │   ├── api/wallets.api.ts     # Funções de chamada à API
│   │   ├── api/use*.ts            # Hooks React Query
│   │   └── types/index.ts         # Tipos TypeScript da feature
│   └── proventos/                 # Proventos via Brapi
├── lib/
│   ├── axios.ts                   # Instância axios com baseURL + withCredentials
│   └── react-query.ts             # QueryClient com staleTime: 5 min global
├── routes/index.tsx               # Roteamento React Router v6
└── types/
    ├── api-response.ts            # ApiResponse<T> genérico
    └── api.d.ts                   # Tipos gerados pelo Swagger

backend/prisma/
└── schema.prisma                  # Fonte de verdade do banco
```

---

## 2. Padrões identificados

| Aspecto | Padrão |
|---------|--------|
| ORM | Prisma 7.x com Driver Adapters (`moduleFormat: "cjs"`, output `src/generated/prisma`) |
| HTTP Client (backend — OpLab) | `fetch` nativo com header `Access-Token` |
| HTTP Client (frontend) | axios (`lib/axios.ts`) com `withCredentials: true` |
| State Management | TanStack React Query (`@tanstack/react-query`), `staleTime: 5min` global |
| Validação de DTOs | Zod 4 + `nestjs-zod` |
| Migrations | `npx prisma migrate dev --name <nome>` |
| Auth | JWT em HttpOnly cookies; guards `JwtAuthGuard`, `RolesGuard`; decorators `@Roles()`, `@CurrentUser()` |
| Naming no banco | Tabelas: snake_case via `@@map()`. Campos: camelCase no Prisma, Prisma converte automaticamente para snake_case no BD. Campos com mapeamento explícito: `@map("...")` quando necessário (ex: campos do Sentinel). |
| Imports Prisma | `@/generated/prisma/client` (tipos) e `@/generated/prisma/enums` (enums) |
| Path alias (backend) | `@/` → `src/` |
| Path alias (frontend) | `@/` → `src/` |
| Padrão de resposta API | `{ success: true, data: {...}, message?: string }` |
| Hooks frontend | `useQuery` / `useMutation` do React Query — um hook por endpoint |
| Tipos compartilhados | Gerados via Swagger: `npm run generate:types` (requer backend rodando) |

---

## 3. Modelo de dados — confirmação dos campos esperados

### Position (`schema.prisma:246-268`)

| Campo | Tipo Prisma | Nullability | Linha |
|-------|-------------|-------------|-------|
| `id` | `String @id @default(uuid())` | NOT NULL | 247 |
| `walletId` | `String` | NOT NULL | 248 |
| `assetId` | `String` | NOT NULL | 249 |
| `quantity` | `Decimal @db.Decimal(18, 8)` | NOT NULL | 250 |
| `averagePrice` | `Decimal @db.Decimal(18, 2)` | NOT NULL | 251 |
| `collateralBlocked` | `Decimal? @db.Decimal(18, 2)` | NULLABLE | 252 |
| `dividendsProcessedAt` | `DateTime?` | NULLABLE | 253 |
| `lastDividendDate` | `DateTime?` | NULLABLE | 254 |
| `priceAtLastDividend` | `Decimal? @db.Decimal(18, 2)` | NULLABLE | 255 |

**`@@unique([walletId, assetId])`** — não pode existir o mesmo ativo duas vezes na mesma carteira.

### Asset (`schema.prisma:208-225`)

| Campo | Tipo Prisma | Nullability | Linha |
|-------|-------------|-------------|-------|
| `id` | `String @id @default(uuid())` | NOT NULL | 209 |
| `ticker` | `String @unique` | NOT NULL | 210 |
| `name` | `String` | NOT NULL | 211 |
| `type` | `AssetType` enum (STOCK \| OPTION) | NOT NULL | 212 |
| `sector` | `String?` | **NULLABLE — JÁ EXISTE** | 213 |
| `market` | `String @default("B3")` | NOT NULL | 214 |

**⚠️ ACHADO CRÍTICO: `Asset.sector` já existe no schema.** A tabela `asset_sectors` planejada no PROGRESS.md é desnecessária — o campo já está em `assets`. Ver Seção 8 para o impacto no W11 e na estratégia de população.

### OptionDetail (`schema.prisma:227-243`) — para W05

| Campo relevante | Tipo Prisma | Linha |
|-----------------|-------------|-------|
| `assetId` | `String @unique` | 229 |
| `underlyingAssetId` | `String` | 230 |
| `optionType` | `OptionType` (CALL \| PUT) | 231 |
| `exerciseType` | `ExerciseType` (AMERICAN \| EUROPEAN) | 232 |
| `strikePrice` | `Decimal @db.Decimal(18, 2)` | 233 |
| `expirationDate` | `DateTime @db.Date` | 235 |
| `contractSize` | `Int @default(100)` | 236 |

**Para W05:** data de vencimento está em `optionDetail.expirationDate`.

### Transaction (`schema.prisma:291-314`)

| Campo | Tipo Prisma | Nullability | Linha |
|-------|-------------|-------------|-------|
| `id` | `String @id` | NOT NULL | 292 |
| `walletId` | `String` | NOT NULL | 293 |
| `assetId` | `String?` | NULLABLE | 294 |
| `type` | `TransactionType` enum | NOT NULL | 295 |
| `quantity` | `Decimal? @db.Decimal(18, 8)` | NULLABLE | 296 |
| `price` | `Decimal? @db.Decimal(18, 2)` | NULLABLE | 297 |
| `totalValue` | `Decimal @db.Decimal(18, 2)` | NOT NULL | 298 |
| `executedAt` | `DateTime` | NOT NULL | 299 |

`TransactionType` enum: BUY, SELL, EXPIRED, DIVIDEND, SPLIT, SUBSCRIPTION, OPTION_EXERCISE, OPTION_ASSIGNMENT, OPTION_EXPIRY.

**Para W07:** `lastTransactionAt` não existe — calcular via `MAX(executedAt) GROUP BY walletId`.

### Wallet → Client → User (path para advisorId)

`Wallet` **não tem `advisorId` diretamente**.

Path de acesso: `wallet.clientId → client.advisorId → user.id (ADVISOR)`

```prisma
Wallet { clientId: String }
Client { id, advisorId: String, wallets: Wallet[] }
User   { id, role: UserRole }
```

Para filtrar carteiras de um assessor: `wallet.client.advisorId = advisorId`.

### Notification (`schema.prisma:553-572`) — para W07 e W13

| Campo | Tipo Prisma | Linha |
|-------|-------------|-------|
| `id` | `String @id` | 554 |
| `advisorId` | `String` | 555 |
| `type` | `NotificationType` (só OPTION_EXPIRY) | 556 |
| `relatedEntityId` | `String` (positionId) | 557 |
| `severity` | `NotificationSeverity` (INFO \| WARNING \| CRITICAL) | 558 |
| `message` | `String` | 559 |
| `isRead` | `Boolean @default(false)` | 560 |
| `readAt` | `DateTime?` | 561 |
| `walletId` | `String?` | 562 |
| `createdAt` | `DateTime @default(now())` | 563 |

**Ausência de `clientId` em Notification.** Não há vínculo direto com o cliente. Para W13 (notificações críticas por cliente), será necessário: `notification.walletId → wallet.clientId`.

**Campo `isRead`** (Prisma camelCase) → coluna `is_read` no banco (automático pelo Prisma).

`@@unique([advisorId, type, relatedEntityId])` — uma notificação por posição por assessor.

`@@index([advisorId, isRead])` e `@@index([advisorId, createdAt])` — índices compostos já existentes, queries de W07 e W13 são eficientes sem índice adicional.

**Comportamento do upsert (confirmado em `notifications.service.ts`):**
- **Sempre atualiza:** `severity`, `message`, `updatedAt` (automático)
- **Atualiza condicionalmente:** `isRead: false`, `readAt: null` — apenas se a severidade escalou
- **Nunca altera:** `createdAt`, `advisorId`, `type`, `relatedEntityId`, `walletId`

**Impacto em W07:** O padrão upsert é correto para o Analytics. Query `isRead = false AND severity IN (CRITICAL, WARNING)` retorna o estado atual de cada alerta por posição. A constraint não limita W07 — é o design intencional do serviço.

### WalletDividendPayment (`schema.prisma:270-289`) — para W08

| Campo | Tipo Prisma | Linha |
|-------|-------------|-------|
| `id` | `String @id` | 271 |
| `walletId` | `String` | 272 |
| `positionId` | `String` | 273 |
| `ticker` | `String @db.VarChar(20)` | 274 |
| `dividendType` | `String? @db.VarChar(30)` | 275 |
| `exDividendDate` | `DateTime @db.Date` | 276 |
| `paymentDate` | `DateTime? @db.Date` | 277 |
| `valuePerShare` | `Decimal @db.Decimal(18, 8)` | 278 |
| `quantityAtDate` | `Decimal @db.Decimal(18, 8)` | 279 |
| `totalReceived` | `Decimal @db.Decimal(18, 2)` | 280 |

Sem FK direta para `assets`. Para nome do ativo: `positionId → position.assetId → asset.name`.

`@@map("wallet_dividend_payments")` — tabela em snake_case no BD.
`@@unique([walletId, ticker, exDividendDate])` — sem duplicatas por carteira/ticker/data.

---

## 4. PerformanceService — interface atual

**Arquivo:** `backend/src/modules/wallets/services/performance.service.ts`

### Métodos públicos

```typescript
// Retorno completo com breakdown por ativo
async computePerformance(walletId: string): Promise<WalletPerformanceResponse>

// Retorno simplificado sem breakdown (mais leve, sem proventos detalhados)
async computeTotals(
  walletId: string,
  options?: {
    openPositions?: PositionWithAsset[];
    prices?: Record<string, number>;
  }
): Promise<{
  realized: number;
  unrealized: number;
  dividends: number;
  total: number;
  totalInvested: number;
  totalPercent: number;
}>
```

### Tipo de retorno de `computePerformance`

```typescript
// WalletPerformanceResponse (schema.prisma→wallet.schema.ts:176-188)
{
  walletId: string;
  realized: number;
  unrealized: number;
  dividends: number;
  total: number;
  totalInvested: number;
  totalPercent: number;
  byAsset: Array<{
    assetId: string;
    ticker: string;
    name: string;
    type: 'STOCK' | 'OPTION';
    realized: number;
    unrealized: number;
    dividends: number;
    total: number;
  }>;
}
```

### Limitações críticas para o Analytics

| Limitação | Impacto |
|-----------|---------|
| Sem filtro de período (`from`, `to`) | W01 e W02 não podem usar PerformanceService diretamente para séries históricas |
| Sem suporte a multi-wallet | Aggregação consolidada (book do assessor) precisa de iteração externa |
| `aggregate()` é `private` | Não pode ser reutilizada fora do service |
| Resultado é "estado atual" | Para série temporal (W01), precisamos de lógica nova |

**Conclusão:** `computeTotals()` será reutilizado no Analytics para performance snapshot atual (W10, W13). Para W01 e W02 (evolução temporal), o Analytics precisará de sua própria lógica de replay limitado ao período selecionado.

---

## 5. CompositeMarketService — interface atual

**Arquivo:** `backend/src/modules/wallets/providers/composite-market.service.ts`

### Método principal para Analytics

```typescript
async getBatchPrices(tickers: string[]): Promise<Record<string, number>>
```

- Separa stocks (→ Brapi) e options (→ OpLab) automaticamente pelo formato do ticker (regex B3)
- Retorna preços ausentes sem lançar erro — ticker ausente no retorno = preço não disponível
- Sem cache próprio no Composite — cache está nos providers individuais

### Cache dos providers

| Provider | Cache TTL |
|----------|-----------|
| OpLab | 60s (`MARKET_CACHE_TTL_MS = 60 * 1000` em `market-data.provider.ts`) |
| Brapi | Tem cache próprio interno |

### Token de injeção

`'MARKET_DATA_PROVIDER'` — já exportado por `WalletsModule`. Analytics precisará importar `WalletsModule` para ter acesso.

### Método adicional relevante (OpLabMarketService)

```typescript
// Preço histórico de fechamento de um ticker em uma data específica
async getHistoricalClose(ticker: string, date: Date): Promise<number | null>
// Usa: GET /v3/market/historical/{symbol}/1d?from={date}&to={date}
// Tenta até 3 dias anteriores se não houver pregão naquela data
```

Útil para W02 (IBOV histórico) — o `OpLabMarketService` já sabe como chamar o endpoint de histórico da OpLab.

**✅ Confirmado em 2026-05-19:** `GET /v3/market/historical/IBOV/1d` retorna dados válidos para o índice IBOV (campo `close` por timestamp). W02 pode usar `getHistoricalClose('IBOV', date)` diretamente sem nova integração.

---

## 6. Layout principal e roteamento

**Arquivo de rotas:** `frontend/src/routes/index.tsx`

### Sistema de roteamento

- React Router v6 (`BrowserRouter` + `Routes` + `Route`)
- `ProtectedLayout` como layout route — monta Header + Sidebar persistentes entre navegações

### Rotas existentes para ADVISOR

```tsx
<Route element={<ProtectedLayout allowedRoles={['ADVISOR', 'ADMIN']} />}>
  <Route path="/advisor/home" element={<HomePageAdvisor />} />
  <Route path="/clients" element={<ClientsPage />} />
  <Route path="/advisor/settings" element={<NotificationSettingsPage />} /> {/* [NOTIF] */}
</Route>
```

### Como adicionar rota de Analytics

```tsx
// Em routes/index.tsx — dentro do bloco ADVISOR já existente:
<Route path="/analytics" element={<AnalyticsPage />} /> {/* [ANALYTICS] */}
```

### Como adicionar item no menu (Sidebar)

**Arquivo:** `frontend/src/components/layout/Sidebar.tsx`

```typescript
// advisorNavItems já existente — adicionar:
const advisorNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/advisor/home', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Carteiras', href: '/wallets', icon: Wallet },
  { name: 'Proventos', href: '/proventos', icon: TrendingUp },
  // [ANALYTICS] adicionar aqui:
  { name: 'Análises', href: '/analytics', icon: BarChart2 },
];
```

Ícone sugerido: `BarChart2` do lucide-react (já é dependência do projeto).

### Contexto de usuário

`useAuth()` disponível globalmente via `features/auth/`. Acessa `user.id` (= advisorId) e `user.role`.

---

## 7. Padrão de chamadas API no frontend

### Cliente HTTP

```typescript
// lib/axios.ts
import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true, // cookies HttpOnly
});
```

### Padrão de hooks (exemplo da feature wallets)

```typescript
// features/wallets/api/useWalletPerformance.ts
export function useWalletPerformance(walletId: string) {
  return useQuery({
    queryKey: ['wallet', walletId, 'performance'],
    queryFn: () => walletsApi.getPerformance(walletId),
    enabled: !!walletId,
  });
}
```

### Estrutura de uma feature de API

```
features/analytics/
├── api/
│   ├── analytics.api.ts           # Funções axios
│   ├── useAnalyticsConsolidated.ts  # Hooks React Query
│   └── index.ts
├── types/
│   └── index.ts                   # Tipos da feature
├── components/
│   ├── widgets/                   # 9 widgets
│   └── ...
└── pages/
    └── AnalyticsPage.tsx
```

### Tipos compartilhados

- Definidos em `features/{feature}/types/index.ts`
- Padrão: interfaces TypeScript espelhando os DTOs do backend (ou geradas via Swagger)
- `ApiResponse<T>` wrapper em `types/api-response.ts`

---

## 8. Lugar para criar o gatilho de população do setor

**⚠️ ACHADO CRÍTICO — Mudança de decisão:**

A tabela `asset_sectors` **NÃO é necessária**. O campo `Asset.sector` já existe no schema (linha 213) e já é populado pelo `AssetResolverService.ensureAssetExists()`.

### Fluxo atual de criação de asset

**Arquivo:** `backend/src/modules/wallets/services/asset-resolver.service.ts`

```typescript
async ensureAssetExists(ticker: string): Promise<Asset> {
  // 1. Verifica se existe → retorna se sim
  // 2. Busca metadata via OpLab/Brapi (inclui sector)
  // 3. Upsert no banco com: ticker, name, type, sector, market
}
```

Linha 59 (opção): `sector: metadata.sector`
Linha 89 (ação): `sector: metadata.sector`

**Quem chama `ensureAssetExists`:** `TradingService` via BUY/SELL. Único ponto de entrada.

### Estado atual do campo `sector`

- Assets criados **após** esta implementação: `sector` está preenchido (se OpLab retornou o dado)
- Assets criados **antes**: `sector = null` (campo existia? ou era uma migração recente?)
- Para saber: verificar `sector IS NULL` via query SQL após subir o banco

### O que muda para W11 (Exposição Setorial)

| Item | Planejado | Real |
|------|-----------|------|
| Tabela de setores | `asset_sectors` nova | Coluna `sector` em `assets` existente |
| Gatilho de população | Criar em `AssetResolverService` | Já existe — não precisa mexer |
| Script de reidratação | Endpoint admin | Ainda necessário para `sector IS NULL` existentes |
| Endpoint de setor | `GET /v3/market/instruments/{ticker}` | Já chamado — via `getMetadata()` → `instrument.sector` |

**Impacto no planejamento:** Não precisamos criar nem migrar `asset_sectors`. Apenas:
1. Script de reidratação para assets com `sector = null`
2. W11 faz `JOIN` em `assets.sector` diretamente (sem tabela extra)

---

## 9. Convenções da tabela `wallet_dividend_payments`

**Arquivo:** `schema.prisma:270-289`

### Mapeamento de colunas

| Campo Prisma | Coluna BD (inferida) | Tipo BD |
|--------------|----------------------|---------|
| `walletId` | `wallet_id` | UUID |
| `positionId` | `position_id` | UUID |
| `ticker` | `ticker` | VARCHAR(20) |
| `dividendType` | `dividend_type` | VARCHAR(30), NULLABLE |
| `exDividendDate` | `ex_dividend_date` | DATE |
| `paymentDate` | `payment_date` | DATE, NULLABLE |
| `valuePerShare` | `value_per_share` | DECIMAL(18,8) |
| `quantityAtDate` | `quantity_at_date` | DECIMAL(18,8) |
| `totalReceived` | `total_received` | DECIMAL(18,2) |

Prisma converte automaticamente camelCase → snake_case no banco de dados. Não há `@map()` explícito nos campos, mas o Prisma aplica a convenção.

### Como queries Prisma referenciam

```typescript
// Usar sempre o nome Prisma (camelCase)
prisma.walletDividendPayment.findMany({
  where: { walletId: '...' },
  orderBy: { exDividendDate: 'desc' },
  select: { ticker: true, totalReceived: true, exDividendDate: true },
})
```

### FK para assets

**Não existe FK direta entre `wallet_dividend_payments` e `assets`.**

`ticker` é `String @db.VarChar(20)` — string solta sem relação.

Para nome do ativo:
```typescript
// Navegar via: positionId → position.assetId → asset
prisma.walletDividendPayment.findMany({
  include: {
    position: { include: { asset: true } }
  }
})
```

---

## 10. Estado das features dependentes

### Feature de Notificações

- **Status:** Implementada e funcional
- **Confirmação:** `NotificationsModule` importado em `app.module.ts` e `wallets.module.ts`
- **Service:** `notifications.service.ts` — gera notificações por posições de opções, faz upsert
- **Geração:** Disparada por gatilhos nos controllers (fire-and-forget), com stale check de 24h
- **Consumo pelo Analytics (W07):** Consultar `notifications WHERE advisorId = ? AND isRead = false AND severity IN ('CRITICAL', 'WARNING') AND type = 'OPTION_EXPIRY'`
- **Consumo pelo Analytics (W13):** `COUNT(*) WHERE advisorId = ? AND isRead = false AND severity = 'CRITICAL'` + join via `walletId → wallet.clientId`

### Feature Sentinela

- **Status:** Implementada e funcional
- **Confirmação:** `SentinelModule` importado em `app.module.ts` e `wallets.module.ts`
- **Tabela relevante:** `wallet_dividend_payments` — populada pela Sentinela quando detecta queda de strike (evento de provento)
- **Consumo pelo Analytics (W08):** Apenas leitura de `wallet_dividend_payments`

### Card de vencimentos no dashboard

- **Status:** Funcional e deve permanecer intacto
- **Componente:** `frontend/src/features/home/components/advisor/UpcomingDueDates.tsx`
- **Hook:** `frontend/src/features/home/api/useAdvisorExpirations.ts`
- **Endpoint:** `activityApi.getAdvisorExpirations(daysAhead)` — diferente dos dados do Analytics
- **Relação com Analytics:** Analytics (W05) é dado análogo mas com foco em valor financeiro agrupado por janela de tempo. O card de dashboard continua independente.

---

## 11. Riscos e observações

### R01 — PerformanceService sem histórico temporal

`computePerformance()` e `computeTotals()` calculam o estado *atual*, não uma série temporal.

**Impacto nos widgets:**
- **W01 (Evolução patrimonial):** Precisa de série histórica de valor do portfólio. `PerformanceService` não oferece. Analytics precisará de abordagem alternativa:
  - Opção A: Replay de transações dia-a-dia dentro do período (caro em memória para períodos longos)
  - Opção B: Usar apenas os dados de `transactions` para calcular valor em datas-chave (pontos da série)
  - Opção C: Snapshot semanal/mensal a partir das transações (agregar por período)
  - **✅ Decisão tomada em 2026-05-19:** W01 e W02 com série temporal vão para backlog (v2). Na Fase 4, o Analytics usará `computeTotals()` para snapshot atual apenas.

- **W02 (Rentabilidade vs IBOV):** Mesma limitação de série temporal. **✅ Decisão tomada em 2026-05-19:** junto com W01, vai para backlog. IBOV via OpLab confirmado funcional para quando for retomado.

### R02 — `Asset.sector` pode ser null para ativos antigos

`sector` em `assets` pode ser `NULL` para:
- Ativos criados antes do campo existir no schema
- Ativos onde a OpLab retornou `sector = null` ou `undefined`

**Impacto no W11:** Exibir como "Não classificado" (já planejado).

**Mitigação:** Script de reidratação via endpoint admin `POST /analytics/sectors/reseed` — itera sobre `assets WHERE sector IS NULL`, chama `getMetadata()` para cada um, atualiza `sector`.

**✅ Verificado em 2026-05-19:** 8 assets com `sector IS NULL` no banco atual. Volume pequeno — script de reidratação é baixa prioridade. W11 exibe "Não classificado" para esses casos sem bloquear a feature.

### R03 — `Wallet` não tem `advisorId` diretamente

Para filtrar carteiras por assessor, é necessário JOIN em `clients`:

```typescript
prisma.wallet.findMany({
  where: {
    client: { advisorId: advisorId }
  }
})
```

Adicionar `include: { client: true }` aumenta o custo de cada query. Alternativa: subconsulta com `walletIds` derivados dos clientes do assessor.

**✅ Confirmado em 2026-05-19:** `Client` possui `@@index([advisorId])` no schema. O JOIN está indexado — R03 não é risco de performance relevante.

### R04 — `Notification` não tem `clientId`

W13 requer contar notificações críticas por cliente. Caminho: `notification.walletId → wallet.clientId`.

Mas `walletId` em `Notification` é `String?` (nullable). Notificações mais antigas podem não ter `walletId`. Estratégia: filtrar `walletId IS NOT NULL` ou aceitar count parcial.

### R05 — Prisma 7.x Driver Adapters

Schema usa:
```
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}
```

Imports devem usar `@/generated/prisma/client` (não `@prisma/client`). Enums: `@/generated/prisma/enums`.

### R06 — Cache de cotações (60s vs 5min do Analytics)

O cache interno dos providers de mercado tem TTL de 60s. O cache do Analytics terá TTL de 5min por `advisorId`. Não há conflito — são camadas independentes.

### R07 — OpLab usa `fetch` nativo (não NestJS HttpModule)

O `OpLabMarketService` usa `fetch` nativo e já está exportado via `WalletsModule`. O `AnalyticsModule` importará `WalletsModule` para ter acesso ao `CompositeMarketService` e ao `OpLabMarketService` diretamente.

### R08 — React Query staleTime global = 5 min

O `queryClient` já tem `staleTime: 5min` globalmente. As queries do Analytics se beneficiam disso automaticamente. O cache no backend (Estratégia A, TTL 5min por `advisorId`) é adicional ao cache do React Query no frontend.

### R09 — Módulo `assets` está vazio

`AssetsModule` existe mas não exporta nada. `AssetResolverService` está em `WalletsModule`. Não há serviço `AssetService` independente — tudo passa por `AssetResolverService`.

---

## Sumário de impactos no plano original

| Item do PROGRESS.md | Realidade encontrada | Impacto |
|---------------------|---------------------|---------|
| Tabela nova `asset_sectors` | Campo `Asset.sector` já existe | Eliminar migration; W11 usa `assets.sector` diretamente |
| Gatilho em `AssetService.create()` | Não existe `AssetService`; único ponto é `AssetResolverService.ensureAssetExists()` | Gatilho já existe; só falta script de reidratação |
| `PerformanceService.aggregate()` reutilizável | Método é `private` | Analytics usa `computeTotals()` para snapshot atual; histórico precisa de lógica própria |
| `Wallet.advisorId` | Não existe; acesso via `wallet.client.advisorId` | Todas as queries precisam de JOIN em `clients` |
| `Notification.clientId` | Não existe; acesso via `walletId → wallet.clientId` | W13 usa path indireto; `walletId` é nullable |

---

*Fase 1 entregue em 2026-05-18. Aguardando aprovação para avançar à Fase 2.*
