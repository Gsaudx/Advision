# TCC Investimentos - SaaS B2B para Assessores

Plataforma de gestão de portfólio e otimização de investimentos.
Projeto de TCC + Iniciação Científica (Algoritmo da Mochila).

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| **Backend** | NestJS + TypeScript | 11.x |
| **ORM** | Prisma (Driver Adapters) | 7.2.x |
| **Frontend** | React + Vite + TypeScript | 19.x / 7.x |
| **UI** | TailwindCSS + Lucide Icons | 3.x |
| **Data Fetching** | TanStack Query | 5.x |
| **Banco** | PostgreSQL | 16 |
| **Infra** | AWS (EC2/RDS/S3/CloudFront) | - |
| **Proxy** | Caddy (SSL automático) | 2.x |

## Arquitetura e Padrões

### Backend: Monolito Modular (NestJS)
Não usamos arquitetura de camadas tradicional (Controller/Service/Repo) na raiz.
Agrupamos por **Domínio de Negócio**.

- **Módulos:** Cada pasta em `modules/` é um domínio isolado (ex: optimization, wallet, assets).
- **Estrutura Interna:** Módulos maiores usam subpastas (`controllers/`, `services/`, `dto/`, `__tests__/`).
- **Shared:** Serviços compartilhados (Prisma, etc.) ficam em `shared/` com `@Global()`.
- **Path Alias:** Usamos `@/` para imports absolutos (ex: `@/shared/prisma`).
- **Comunicação:** Módulos podem importar uns aos outros via `imports: []` no Module.
- **Banco de Dados:** Prisma ORM 7.x com Driver Adapters (PostgreSQL).

### Frontend: Feature-Based (React)
Não aglomeramos componentes em uma pasta gigante.
Usamos **Colocation**: No caso do nosso projeto, o código vive perto de onde é usado.

- **Features:** Cada pasta em `features/` contém tudo que uma funcionalidade precisa (api, componentes, hooks).
- **Shared:** Apenas componentes genéricos (UI Kit) ficam em `components/ui`.
- **Path Alias:** Usamos `@/` para imports absolutos (ex: `@/lib/axios`, `@/components/ui`).

## Estrutura de Pastas

### Backend (`/backend/src`)

#### Módulo Simples
**Módulo simples** (ex: `health`): Estrutura plana com controllers/, services/, dto/
```
src/
├── common/                               # Código reutilizável em toda aplicação
│   ├── decorators/                       #   Decorators customizados
│   ├── dto/                              #   DTOs base (ApiResponse, ApiError)
│   ├── filters/                          #   Tratamento de exceções
│   ├── guards/                           #   Controle de acesso
│   └── utils/                            #   Funções utilitárias
├── config/                               # Configurações de ambiente
├── generated/                            # Prisma Client (auto-gerado)
├── modules/           
│   └── {feature}/                        # Cada domínio de negócio
│       ├── controllers/                  #   Endpoints da API
│       ├── services/                     #   Lógica de negócio
│       ├── dto/                          #   Formato de dados entrada/saída
│       ├── enums/                        #   Enums do domínio
│       ├── __tests__/                    #   Testes unitários
│       ├── {feature}.module.ts
│       └── index.ts                      #   Barrel exports
├── shared/                               # Serviços globais compartilhados
│   ├── prisma/                           #   Conexão com banco de dados
│   └── shared.module.ts                  #   Módulo @Global()
├── app.module.ts                         # Módulo raiz (importa SharedModule e feature modules)
└── main.ts                               # Bootstrap: CORS, Filters, Pipes, Swagger
```

#### Módulo Complexo
**Módulo complexo** (ex: `wallet`): Agrupa sub-funcionalidades em pastas internas.

```
modules/wallet/
├── core/                           # CRUD da carteira
│   ├── controllers/
│   │   └── wallet.controller.ts    # /wallets
│   ├── services/
│   │   └── wallet.service.ts
│   └── dto/
│       └── wallet.dto.ts
├── positions/                      # Sub-funcionalidade: posições
│   ├── controllers/
│   │   └── positions.controller.ts # /wallets/:id/positions
│   ├── services/
│   │   └── positions.service.ts
│   └── dto/
│       └── position.dto.ts
├── transactions/                   # Sub-funcionalidade: transações
│   ├── controllers/
│   │   └── transactions.controller.ts
│   ├── services/
│   │   └── transactions.service.ts
│   └── dto/
│       └── transaction.dto.ts
├── enums/                          # Enums compartilhados do módulo
├── __tests__/
├── wallet.module.ts                # Registra TODOS os controllers/services
└── index.ts
```

```typescript
// wallet.module.ts - registra todas as sub-funcionalidades
@Module({
  controllers: [
    WalletController,       // core/
    PositionsController,    // positions/
    TransactionsController, // transactions/
  ],
  providers: [
    WalletService,
    PositionsService,
    TransactionsService,
  ],
})
export class WalletModule {}
```

##### `modules/` — Domínios de Negócio

Cada pasta representa uma **funcionalidade isolada** do sistema. Um módulo contém tudo que precisa para funcionar.

| Subpasta | Responsabilidade | Quando usar |
|----------|------------------|-------------|
| **controllers/** | Recebe requisições HTTP, valida entrada, chama o service e retorna resposta. | Sempre que expor um endpoint (`GET /wallets`, `POST /clients`). |
| **services/** | Contém a lógica de negócio. Não sabe nada de HTTP. | Cálculos, validações de regra de negócio, orquestração de dados. |
| **dto/** | Define o "contrato" de dados, o que entra e o que sai da API. | Validação automática com `class-validator`, documentação Swagger. |
| **enums/** | Enums TypeScript específicos do domínio. Garante type-safety entre DTO, Service e Swagger. | Sempre que tiver valores fixos (`status`, `tipo`, etc.). |
| **__tests__/** | Testes unitários do módulo. Ficam próximos do código que testam. | Testar services isoladamente com mocks. |

#### Detalhamento das Pastas

##### `common/` — Código Compartilhado

Contém funcionalidades que **são compartilhadas** entre múltiplos módulos. Diferente de `shared/` (que tem serviços injetáveis, tipo o Prisma), aqui ficam utilitários puros.

| Subpasta | O que é | Exemplo |
|----------|---------|-----------------|
| **decorators/** | Anotações customizadas para métodos/classes. Extraem dados ou adicionam metadados. | `@CurrentUser()` — extrai o usuário logado do token JWT e injeta no controller. Evita repetir `req.user` em todo lugar. |
| **dto/** | DTOs base reutilizáveis em toda aplicação. Padronizam formato de respostas. | `ApiResponseDto<T>`: wrapper de sucesso. `ApiErrorResponseDto`: formato padrão de erros. |
| **filters/** | Interceptam exceções e formatam a resposta de erro. Garantem que todos os erros sigam o mesmo padrão. | `HttpExceptionFilter` — captura erros e retorna `{ statusCode, message, timestamp }` padronizado. |
| **guards/** | Bloqueiam ou liberam acesso a rotas. Executam **antes** do controller. | `JwtAuthGuard` — verifica se o token é válido. `RolesGuard` — verifica se o usuário tem permissão (ex: só admin pode deletar). |
| **utils/** | Funções puras auxiliares, sem dependência do NestJS. | `formatCpf()`, `calculateAveragePrice()`, `slugify()` |

```typescript
// Exemplo: common/decorators/current-user.decorator.ts
// Uso: @CurrentUser() user: Advisor (no controller)
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Extraído do JWT pelo guard
  },
);

// Exemplo: common/guards/roles.guard.ts
// Uso: @Roles('admin') no controller
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

##### `config/` — Configurações de Ambiente

Centraliza variáveis de ambiente e configurações tipadas. Evita `process.env` espalhado pelo código.

```typescript
// config/database.config.ts
export const databaseConfig = {
  url: process.env.DATABASE_URL,
  logging: process.env.NODE_ENV === 'development',
};
```

**Espelhamento Frontend ↔ Backend:**

| Frontend | Backend |
|----------|---------|
| `features/wallet/core/api/` | `modules/wallet/core/controllers/` |
| `features/wallet/positions/api/` | `modules/wallet/positions/controllers/` |
| `features/wallet/transactions/api/` | `modules/wallet/transactions/controllers/` |

##### `shared/` — Serviços Globais

Serviços que **todos os módulos** precisam acessar. Marcado com `@Global()` para não precisar importar em cada módulo.

```typescript
// shared/shared.module.ts
@Global() // Disponível em toda aplicação automaticamente
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class SharedModule {}
```

**Exemplo: Módulo Health**
```
modules/health/
├── controllers/
│   ├── health.controller.ts   # @Controller('health')
│   └── index.ts
├── services/
│   ├── health.service.ts      # Lógica de verificação
│   └── index.ts
├── dto/
│   ├── health-response.dto.ts
│   └── index.ts
├── enums/
│   ├── health-status.enum.ts  # HealthStatus, DatabaseStatus
│   └── index.ts
├── __tests__/
│   └── health.service.spec.ts
├── health.module.ts
└── index.ts
```

#### Padrão de Respostas da API

A API usa wrappers padronizados para garantir consistência nas respostas. Um `HttpExceptionFilter` global (registrado no `main.ts`) intercepta todas as exceções e formata automaticamente.

##### Fluxo de Requisição

```
Request → Controller → Service → Controller → Response
                ↓           ↓          ↓
           (valida)    (processa)  (ApiResponseDto.success())
                                        ↓
           Se erro → throw HttpException → HttpExceptionFilter → ApiErrorResponseDto
```

##### Separação de Responsabilidades

| Camada | Responsabilidade | Conhece HTTP? |
|--------|------------------|---------------|
| **Service** | Lógica de negócio. Retorna dados puros ou lança exceção. | ❌ Não |
| **Controller** | Recebe request, chama service, envolve resposta com `ApiResponseDto`. | ✅ Sim |
| **HttpExceptionFilter** | Captura exceções e formata como `ApiErrorResponseDto`. | ✅ Sim |

```typescript
// Service - retorna dados puros
async check(): Promise<HealthResponseDto> {
  await this.prisma.$queryRaw`SELECT 1`;
  return { status: HealthStatus.OK, database: DatabaseStatus.CONNECTED, ... };
}

// Controller - envolve com wrapper
async check(): Promise<ApiResponseDto<HealthResponseDto>> {
  try {
    const data = await this.healthService.check();
    return ApiResponseDto.success(data);  // ← Wrapper aqui
  } catch (error) {
    throw new ServiceUnavailableException(message);  // ← Filter trata
  }
}
```

##### Resposta de Sucesso

```typescript
// common/dto/api-response.dto.ts
{
  "success": true,
  "data": { ... },        // Dados retornados
  "message": "Opcional"   // Mensagem descritiva
}
```

##### Resposta de Erro

```typescript
// common/dto/api-error-response.dto.ts
{
  "success": false,
  "statusCode": 400,
  "message": "Dados inválidos",
  "errors": ["email deve ser um email válido"],  // Opcional (validação)
  "timestamp": "2026-01-06T15:30:00.000Z",
  "path": "/api/clients"
}
```

##### Enums para Type-Safety

Para evitar strings hardcoded e garantir consistência entre DTO, Service, testes e Swagger:

```typescript
// modules/health/enums/health-status.enum.ts
export enum HealthStatus {
  OK = 'ok',
  ERROR = 'error',
}

// Uso no Service
return { status: HealthStatus.OK, ... };

// Uso no DTO (Swagger mostra os valores corretos)
@ApiProperty({ enum: HealthStatus, example: HealthStatus.OK })
status: HealthStatus;

// Uso no Teste
expect(result.status).toBe(HealthStatus.OK);
```

### Frontend (`/frontend/src`)
```
src/
├── assets/                        # Imagens, ícones estáticos
├── components/
│   ├── ui/                        #   Componentes base (Button, Input, Card)
│   └── layout/                    #   Estruturas (Sidebar, Header)
├── features/
│   └── {feature}/                 # Cada funcionalidade do sistema
│       ├── api/                   #   Hooks de data fetching (TanStack Query)
│       │   └── use{Feature}.ts
│       ├── components/            #   Componentes da feature
│       │   └── {Component}.tsx
│       ├── hooks/                 #   Hooks de lógica de UI
│       ├── types/                 #   Tipagens da feature
│       │   └── index.ts
│       └── index.tsx              #   Página principal (export)
├── hooks/                         # Hooks globais (useDebounce, useLocalStorage)
├── lib/                           # axios, react-query, utils
└── pages/                         # Rotas
```

##### Features Simples vs Features com Sub-funcionalidades

**Feature simples** (ex: `health-check`): Estrutura plana com api/, components/, types/.

**Feature complexa** (ex: `wallet`): Agrupa sub-funcionalidades em pastas internas.

```
features/wallet/
├── core/                          # CRUD da carteira
│   ├── api/
│   │   └── useWallet.ts           # useGetWallet, useCreateWallet, etc.
│   ├── components/
│   │   └── WalletCard.tsx
│   └── types/
│       └── index.ts
├── positions/                     # Sub-funcionalidade: posições
│   ├── api/
│   │   └── usePositions.ts
│   ├── components/
│   │   └── PositionsList.tsx
│   └── types/
│       └── index.ts
├── transactions/                  # Sub-funcionalidade: transações
│   ├── api/
│   │   └── useTransactions.ts
│   ├── components/
│   │   └── TransactionsTable.tsx
│   └── types/
│       └── index.ts
├── hooks/                         # Hooks compartilhados da feature
├── types/                         # Types compartilhados da feature
└── index.tsx                      # Página principal (exporta tudo)
```

**Diferença do Backend:** No React não precisa "registrar" nada. Basta criar as pastas e importar onde usar:

```tsx
// pages/WalletPage.tsx
import { useWallet } from '@/features/wallet/core/api/useWallet';
import { usePositions } from '@/features/wallet/positions/api/usePositions';
import { PositionsList } from '@/features/wallet/positions/components/PositionsList';

export function WalletPage() {
  const { data: wallet } = useWallet(walletId);
  const { data: positions } = usePositions(walletId);
  
  return <PositionsList positions={positions} />;
}
```

**Exemplo: Feature Health-Check (simples)**
```
features/health-check/
├── api/
│   └── useHealthCheck.ts      # Hook de data fetching
├── components/
│   ├── HeroSection.tsx
│   ├── StatusSection.tsx
│   └── TechStackSection.tsx
├── types/
│   └── index.ts               # HealthResponse interface
└── index.tsx                  # Página exportada
```

### Hooks no React: `api/` vs `hooks/`

**Custom Hooks** são funções que reutilizam lógica entre componentes. No projeto, separamos em duas pastas:

| Pasta | Propósito | Quando usar | Exemplo |
|-------|-----------|-------------|---------|
| **api/** | Data fetching | Comunicação com backend (GET, POST, etc.) | `useGetWallets()`, `useCreateClient()` |
| **hooks/** | Lógica de UI | Estado local, filtros, modais, debounce | `useTableFilters()`, `useDebounce()` |

**Onde colocar?**
- `features/{feature}/api/` → Hook específico da feature
- `features/{feature}/hooks/` → Hook específico da feature  
- `src/hooks/` → Hook reutilizado em múltiplas features

**Exemplo:**

```tsx
// features/wallet/api/useGetWallets.ts
// → Busca carteiras do servidor (é basicamente um hook de busca de dados simples, por isso ficaria em api/)
export function useGetWallets(clientId: string) {
  return useQuery({
    queryKey: ['wallets', clientId],
    queryFn: () => api.get(`/clients/${clientId}/wallets`),
  });
}

// features/wallet/hooks/useWalletFilters.ts
// → Gerencia filtros locais (NÃO vai ao servidor). Mais complexo, é um hook de lógica de UI/estado, por isso fica em hook/
export function useWalletFilters() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'balance'>('name');
  return { search, setSearch, sortBy, setSortBy };
}

// src/hooks/useDebounce.ts
// → Reutilizado em várias features, por isso fica fora da pasta {feature}/. Fica em hook/ por ter a mesma ideia do exemplo acima
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

## Modelo de Dados (Prisma Schema)

### Enums

```prisma
enum RiskProfile {
  CONSERVATIVE    // Perfil conservador
  MODERATE        // Perfil moderado
  AGGRESSIVE      // Perfil agressivo
}

enum AssetType {
  STOCK           // Ação (PETR4, VALE3)
  OPTION          // Opção (PETRA1, VALEB2)
}

enum OptionType {
  CALL            // Opção de compra
  PUT             // Opção de venda
}

enum ExerciseType {
  AMERICAN        // Pode exercer a qualquer momento
  EUROPEAN        // Só exerce no vencimento
}

enum TransactionType {
  BUY             // Compra de ativo
  SELL            // Venda de ativo
  DIVIDEND        // Recebimento de dividendo
  SPLIT           // Desdobramento de ações
  SUBSCRIPTION    // Bonificação/Subscrição
  DEPOSIT         // Aporte de dinheiro na carteira
  WITHDRAWAL      // Saque de dinheiro da carteira
}

enum OptimizationAlgorithm {
  KNAPSACK        // Algoritmo da Mochila Inteira
}

enum OptimizationStatus {
  GENERATED       // Sugestão gerada pelo algoritmo
  ACCEPTED        // Aceita pelo assessor (executada)
  REJECTED        // Rejeitada pelo assessor
}
```

### Estrutura das Tabelas

#### Núcleo do Negócio

```prisma
model Advisor {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  cpfCnpj      String?
  phone        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  clients      Client[]
}

model Client {
  id          String      @id @default(uuid())
  advisorId   String
  name        String
  email       String?
  cpf         String
  phone       String?
  riskProfile RiskProfile @default(MODERATE)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  wallets     Wallet[]
}

model Wallet {
  id          String  @id @default(uuid())
  clientId    String
  name        String
  description String?
  cashBalance Decimal @default(0) @db.Decimal(18, 2)  // Saldo em caixa disponível
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### Ativos e Derivativos

```prisma
model Asset {
  id        String    @id @default(uuid())
  ticker    String    @unique   // Ex: PETR4, VALE3, PETRA1
  name      String               // Ex: "Petrobras PN"
  type      AssetType            // STOCK ou OPTION
  sector    String?              // Ex: "Energia", "Mineração"
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model OptionDetail {
  id                String       @id @default(uuid())
  assetId           String       @unique
  underlyingAssetId String       // FK para o ativo objeto (ex: PETR4 é objeto de PETRA1)
  optionType        OptionType   // CALL ou PUT
  exerciseType      ExerciseType // AMERICAN ou EUROPEAN
  strikePrice       Decimal      @db.Decimal(18, 2)  // Preço de exercício
  expirationDate    DateTime     @db.Date            // Data de vencimento
}
```

#### Posições e Movimentações

```prisma
model Position {
  id           String  @id @default(uuid())
  walletId     String
  assetId      String
  quantity     Decimal @db.Decimal(18, 8)  // Quantidade de ativos
  averagePrice Decimal @db.Decimal(18, 2)  // Preço médio de AQUISIÇÃO (não confundir com preço de mercado)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([walletId, assetId])  // Uma posição por ativo por carteira
}

model Transaction {
  id         String          @id @default(uuid())
  walletId   String
  assetId    String?         // Null para DEPOSIT/WITHDRAWAL
  type       TransactionType
  quantity   Decimal?        @db.Decimal(18, 8)
  price      Decimal?        @db.Decimal(18, 2)
  totalValue Decimal         @db.Decimal(18, 2)
  executedAt DateTime
  notes      String?
  createdAt  DateTime        @default(now())
}
```

#### Otimização (Iniciação Científica)

```prisma
model OptimizationRun {
  id              String                @id @default(uuid())
  walletId        String
  algorithm       OptimizationAlgorithm
  inputParameters Json                  // Parâmetros de entrada do algoritmo
  outputResult    Json                  // Resultado/sugestão gerada
  status          OptimizationStatus    @default(GENERATED)
  acceptedAt      DateTime?
  createdAt       DateTime              @default(now())
}

model RebalanceLog {
  id                String   @id @default(uuid())
  walletId          String
  optimizationRunId String
  snapshotBefore    Json     // Estado da carteira ANTES do rebalanceamento
  snapshotAfter     Json     // Estado da carteira DEPOIS do rebalanceamento
  executedAt        DateTime @default(now())
}
```

### Descrição das Tabelas

#### Núcleo do Negócio

| Tabela | Propósito |
|--------|-----------|
| **Advisor** | Assessor de investimentos (usuário do sistema). É o **tenant principal** do modelo multi-tenant — cada assessor só vê seus próprios clientes. |
| **Client** | Cliente do assessor. Contém CPF, perfil de risco e dados de contato. Um assessor pode ter N clientes. |
| **Wallet** | Carteira de investimentos. Cada cliente pode ter múltiplas carteiras (ex: "Aposentadoria", "Curto Prazo"). O campo `cashBalance` representa o saldo em caixa disponível para investir. |

#### Ativos e Derivativos

| Tabela | Propósito |
|--------|-----------|
| **Asset** | Ativo financeiro negociável. Pode ser **ação** ou **opção**. O campo `type` diferencia. |
| **OptionDetail** | Detalhes de opções (relação 1:1 com Asset). Armazena: ativo objeto, tipo (CALL/PUT), estilo de exercício, strike e vencimento. Essencial para calcular **Moneyness** (ITM/OTM). |

#### Posições e Movimentações

| Tabela | Propósito |
|--------|-----------|
| **Position** | Posição atual de um ativo em uma carteira. Armazena quantidade e **preço médio de aquisição**. Única por par `[walletId, assetId]`. |
| **Transaction** | Histórico de movimentações (append-only). Inclui: compras, vendas, dividendos, splits, depósitos e saques. |

> **⚠️ Importante: Preço Médio vs Preço de Mercado**
>
> O campo `Position.averagePrice` é o **preço médio de compra** (quanto o cliente pagou), não o preço atual de mercado.
>
> | Conceito | Origem | Uso |
> |----------|--------|-----|
> | **Preço Médio** | Calculado das transações | IR, lucro/prejuízo realizado |
> | **Preço de Mercado** | API externa (B3, Yahoo) | Valor atual da carteira |
>
> **Exemplo:** Cliente comprou 100 PETR4 a R$30 e mais 50 a R$36.
> - Preço médio (banco): R$32,00 (custo de aquisição)
> - Preço mercado (API): R$38,00 (cotação atual)
> - Lucro não realizado: R$6,00/ação (+18,75%)

#### Otimização (Iniciação Científica)

| Tabela | Propósito |
|--------|-----------|
| **OptimizationRun** | Execução do algoritmo da Mochila Inteira. Armazena parâmetros de entrada, resultado sugerido e status (gerado/aceito/rejeitado). |
| **RebalanceLog** | Registro de rebalanceamentos efetivados. Guarda snapshot antes/depois da carteira para auditoria e análise histórica. |

### Diagrama de Relacionamentos

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Advisor   │──1:N──│   Client    │──1:N──│   Wallet    │
└─────────────┘       └─────────────┘       └─────────────┘
                                                   │
                      ┌────────────────────────────┼────────────────────────────┐
                      │                            │                            │
                      ▼                            ▼                            ▼
               ┌─────────────┐            ┌───────────────┐           ┌─────────────────┐
               │  Position   │            │  Transaction  │           │ OptimizationRun │
               └─────────────┘            └───────────────┘           └─────────────────┘
                      │                            │                            │
                      ▼                            ▼                            ▼
               ┌─────────────┐            ┌───────────────┐           ┌─────────────────┐
               │    Asset    │────────────│ OptionDetail  │           │  RebalanceLog   │
               └─────────────┘            └───────────────┘           └─────────────────┘
```

## Como Rodar Localmente

### Pré-requisitos
- Node.js 20+
- Docker e Docker Compose

### 1. Clone e configure variáveis de ambiente

```bash
git clone https://github.com/seu-usuario/tcc-investimentos.git
cd tcc-investimentos


# Crie o .env no backend (para Prisma CLI e NestJS)
cp backend/.env.example backend/.env
```

### 2. Suba o banco de dados

```bash
docker-compose up -d
```

### 3. Configure o Backend

```bash
cd backend
npm install
npx prisma generate    # Gera o Prisma Client
npx prisma migrate dev # Aplica migrations
npm run start:dev      # http://localhost:3000
```

### 4. Configure o Frontend

```bash
cd frontend
npm install
npm run generate:types # Gera tipos do backend via OpenAPI
npm run dev            # http://localhost:5173
```

### Geração de Tipos (OpenAPI)

O frontend gera tipos automaticamente a partir do Swagger do backend:

```bash
cd frontend
npm run generate:types  # Requer backend rodando em localhost:3000
```

Isso cria `src/types/api.d.ts` com todos os DTOs do backend.

**Fluxo de trabalho:**
1. Alterar DTO no backend (ex: adicionar campo)
2. Rodar `npm run generate:types` no frontend
3. Commitar `api.d.ts` junto com as mudanças do backend
4. CI/CD usa o arquivo commitado (não precisa regenerar)

```typescript
// Uso no frontend
import type { components } from '@/types/api';

type HealthResponseDto = components['schemas']['HealthResponseDto'];
// status: "ok" | "error"  ← Gerado automaticamente do enum do backend
```

### Endpoints Disponíveis

| Endpoint | URL | Descrição |
|----------|-----|-----------|
| Backend API | http://localhost:3000 | API REST principal |
| Swagger | http://localhost:3000/api | Documentação interativa |
| Health Check | http://localhost:3000/health | Status da API e banco |

## CI/CD (GitHub Actions)

O pipeline está em `.github/workflows/deploy.yml`:

1. **Backend:** Build Docker → Push DockerHub → Deploy EC2 → Migrate DB
2. **Frontend:** Build Vite → Upload S3 → Invalidate CloudFront

### Secrets Necessárias no GitHub (já estão configuradas no repositório do TCC, listadas abaixo somente para documentação)

| Secret | Descrição |
|--------|-----------|
| `DOCKERHUB_USERNAME` | Usuário Docker Hub |
| `DOCKERHUB_TOKEN` | Token de acesso Docker Hub |
| `EC2_HOST` | IP público da EC2 |
| `EC2_USER` | Usuário SSH (ec2-user) |
| `EC2_SSH_KEY` | Chave privada .pem |
| `DATABASE_URL` | Connection string RDS (produção) |
| `CORS_ORIGIN` | URL do CloudFront |
| `VITE_API_URL` | URL da API para o frontend |
| `AWS_S3_BUCKET` | Nome do bucket S3 |
| `AWS_ACCESS_KEY_ID` | Credencial AWS |
| `AWS_SECRET_ACCESS_KEY` | Credencial AWS |
| `CLOUDFRONT_DISTRIBUTION_ID` | ID da distribuição CloudFront |
| `DEPLOY_ENABLED` | Indica se o CI/CD precisa fazer a etapa de deploy na EC2 ou não (não fazer se a AWS não estiver configurada) |

## Arquitetura de Produção

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ CloudFront  │────▶│     S3      │     │   Route53   │
│   (CDN)     │     │  (Frontend) │     │  (DNS)      │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Caddy     │────▶│   Backend   │
│  (Browser)  │     │ (SSL/Proxy) │     │  (NestJS)   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │     RDS     │
                                        │ (PostgreSQL)│
                                        └─────────────┘
```

## Regras de desenvolvimento

1. **Zero Over-engineering**
2. **Tipagem Estrita:** Sem `any`. Interfaces do Front espelham DTOs do Back.
3. **Commits:** Siga Conventional Commits (`feat`, `fix`, `chore`).