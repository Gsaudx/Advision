# TCC Investimentos - SaaS B2B para Assessores

Plataforma de gestão de portfólio e otimização de investimentos.
Projeto de TCC + Iniciação Científica (Algoritmo da Mochila).

## Stack Tecnológica

| Camada            | Tecnologia                  | Versão     |
| ----------------- | --------------------------- | ---------- |
| **Backend**       | NestJS + TypeScript         | 11.x       |
| **Validação**     | Zod + nestjs-zod            | 4.x / 5.x  |
| **ORM**           | Prisma (Driver Adapters)    | 7.2.x      |
| **Frontend**      | React + Vite + TypeScript   | 19.x / 7.x |
| **UI**            | TailwindCSS + Lucide Icons  | 3.x        |
| **Data Fetching** | TanStack Query              | 5.x        |
| **Banco**         | PostgreSQL                  | 16         |
| **Infra**         | AWS (EC2/RDS/S3/CloudFront) | -          |
| **Proxy**         | Caddy (SSL automático)      | 2.x        |

## Arquitetura e Padrões

### Backend: Monolito Modular (NestJS)

Não usamos arquitetura de camadas tradicional (Controller/Service/Repo) na raiz.
Agrupamos por **Domínio de Negócio**.

- **Módulos:** Cada pasta em `modules/` é um domínio isolado (ex: optimization, wallet, assets).
- **Estrutura Interna:** Módulos maiores usam subpastas (`controllers/`, `services/`, `schemas/`, `__tests__/`).
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

**Módulo simples** (ex: `health`): Estrutura plana com controllers/, services/, schemas/

```
src/
├── common/                               # Código reutilizável em toda aplicação
│   ├── decorators/                       #   Decorators customizados
│   ├── schemas/                          #   Schemas Zod base (ApiResponse, ApiError)
│   ├── filters/                          #   Tratamento de exceções
│   ├── guards/                           #   Controle de acesso
│   └── utils/                            #   Funções utilitárias
├── config/                               # Configurações de ambiente
├── generated/                            # Prisma Client (auto-gerado)
├── modules/
│   └── {feature}/                        # Cada domínio de negócio
│       ├── controllers/                  #   Endpoints da API
│       ├── services/                     #   Lógica de negócio
│       ├── schemas/                      #   Schemas Zod (validação + tipos + DTOs)
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
│   └── schemas/
│       └── wallet.schema.ts
├── positions/                      # Sub-funcionalidade: posições
│   ├── controllers/
│   │   └── positions.controller.ts # /wallets/:id/positions
│   ├── services/
│   │   └── positions.service.ts
│   └── schemas/
│       └── position.schema.ts
├── transactions/                   # Sub-funcionalidade: transações
│   ├── controllers/
│   │   └── transactions.controller.ts
│   ├── services/
│   │   └── transactions.service.ts
│   └── schemas/
│       └── transaction.schema.ts
├── enums/                          # Enums compartilhados do módulo
├── __tests__/
├── wallet.module.ts                # Registra TODOS os controllers/services
└── index.ts
```

```typescript
// wallet.module.ts - registra todas as sub-funcionalidades
@Module({
  controllers: [
    WalletController, // core/
    PositionsController, // positions/
    TransactionsController, // transactions/
  ],
  providers: [WalletService, PositionsService, TransactionsService],
})
export class WalletModule {}
```

##### `modules/` — Domínios de Negócio

Cada pasta representa uma **funcionalidade isolada** do sistema. Um módulo contém tudo que precisa para funcionar.

| Subpasta           | Responsabilidade                                                                                 | Quando usar                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| **controllers/**   | Recebe requisições HTTP, valida entrada, chama o service e retorna resposta.                     | Sempre que expor um endpoint (`GET /wallets`, `POST /clients`).     |
| **services/**      | Contém a lógica de negócio. Não sabe nada de HTTP.                                               | Cálculos, validações de regra de negócio, orquestração de dados.    |
| **schemas/**       | Define schemas Zod para validação e tipagem. Gera DTOs (via `createZodDto`) e tipos (`z.infer`). | Validação de entrada, definição de contratos, documentação Swagger. |
| **enums/**         | Enums TypeScript específicos do domínio. Garante type-safety entre Schema, Service e Swagger.    | Sempre que tiver valores fixos (`status`, `tipo`, etc.).            |
| **\_\_tests\_\_/** | Testes unitários do módulo. Ficam próximos do código que testam.                                 | Testar services isoladamente com mocks.                             |

#### Detalhamento das Pastas

##### `common/` — Código Compartilhado

Contém funcionalidades que **são compartilhadas** entre múltiplos módulos. Diferente de `shared/` (que tem serviços injetáveis, tipo o Prisma), aqui ficam utilitários puros.

| Subpasta        | O que é                                                                                               | Exemplo                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **decorators/** | Anotações customizadas para métodos/classes. Extraem dados ou adicionam metadados.                    | `@CurrentUser()` — extrai o usuário logado do token JWT e injeta no controller. Evita repetir `req.user` em todo lugar.        |
| **schemas/**    | Schemas Zod base reutilizáveis. Definem validação, DTOs e tipos para respostas padronizadas.          | `ApiResponseSchema`: wrapper de sucesso. `ApiErrorResponseSchema`: formato padrão de erros.                                    |
| **filters/**    | Interceptam exceções e formatam a resposta de erro. Garantem que todos os erros sigam o mesmo padrão. | `HttpExceptionFilter` — captura erros (incluindo `ZodValidationException`) e retorna resposta padronizada.                     |
| **guards/**     | Bloqueiam ou liberam acesso a rotas. Executam **antes** do controller.                                | `JwtAuthGuard` — verifica se o token é válido. `RolesGuard` — verifica se o usuário tem permissão (ex: só admin pode deletar). |
| **utils/**      | Funções puras auxiliares, sem dependência do NestJS.                                                  | `formatCpf()`, `calculateAveragePrice()`, `slugify()`                                                                          |

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
    const requiredRoles = this.reflector.get<string[]>(
      "roles",
      context.getHandler(),
    );
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
  logging: process.env.NODE_ENV === "development",
};
```

**Espelhamento Frontend ↔ Backend:**

| Frontend                            | Backend                                    |
| ----------------------------------- | ------------------------------------------ |
| `features/wallet/core/api/`         | `modules/wallet/core/controllers/`         |
| `features/wallet/positions/api/`    | `modules/wallet/positions/controllers/`    |
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
├── schemas/                   # Schemas Zod + DTOs + tipos
│   ├── health-response.schema.ts
│   ├── health-api-response.schema.ts
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

| Camada                  | Responsabilidade                                                      | Conhece HTTP? |
| ----------------------- | --------------------------------------------------------------------- | ------------- |
| **Service**             | Lógica de negócio. Retorna dados puros ou lança exceção.              | ❌ Não        |
| **Controller**          | Recebe request, chama service, envolve resposta com `ApiResponseDto`. | ✅ Sim        |
| **HttpExceptionFilter** | Captura exceções e formata como `ApiErrorResponseDto`.                | ✅ Sim        |

```typescript
// Service - retorna dados puros (usa tipo inferido do Zod)
async check(): Promise<HealthResponse> {
  await this.prisma.$queryRaw`SELECT 1`;
  return { status: HealthStatus.OK, database: DatabaseStatus.CONNECTED, ... };
}

// Controller - envolve com wrapper
async check(): Promise<ApiResponse<HealthResponse>> {
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
// common/schemas/api-response.schema.ts
{
  "success": true,
  "data": { ... },        // Dados retornados
  "message": "Opcional"   // Mensagem descritiva
}
```

##### Resposta de Erro

```typescript
// common/schemas/api-error-response.schema.ts
{
  "success": false,
  "statusCode": 400,
  "message": "Dados inválidos",
  "errors": ["email: Invalid email"],  // Erros Zod formatados
  "timestamp": "2026-01-06T15:30:00.000Z",
  "path": "/api/clients"
}
```

##### Enums para Type-Safety

Para evitar strings hardcoded e garantir consistência entre Schema, Service, testes e Swagger:

```typescript
// modules/health/enums/health-status.enum.ts
export enum HealthStatus {
  OK = 'ok',
  ERROR = 'error',
}

// Uso no Schema Zod
export const HealthResponseSchema = z.object({
  status: z.nativeEnum(HealthStatus).describe('Status geral da aplicacao'),
  // ...
});

// Uso no Service
return { status: HealthStatus.OK, ... };

// Uso no Teste
expect(result.status).toBe(HealthStatus.OK);
```

##### Schema vs DTO vs Type

No projeto usamos três conceitos relacionados mas distintos:

| Conceito   | O que é                         | Propósito                                  | Comportamento em Runtime |
| ---------- | ------------------------------- | ------------------------------------------ | ------------------------ |
| **Schema** | Regras de validação Zod         | Definir estrutura + validar dados          | Valida dados de verdade  |
| **DTO**    | Classe NestJS                   | Documentação Swagger + tipagem controllers | Apenas container de tipo |
| **Type**   | Tipo TypeScript (via `z.infer`) | Type-safety no código                      | Removido na compilação   |

**Fluxo de definição:**

```typescript
// 1. SCHEMA - Fonte da verdade (valida dados em runtime)
export const HealthResponseSchema = z.object({
  status: z.nativeEnum(HealthStatus).describe("Status da aplicacao"),
  database: z.nativeEnum(DatabaseStatus).describe("Status do banco"),
});

// 2. DTO - Para Swagger/NestJS (envolve o schema em uma classe)
//    Usado apenas em controllers para documentação da API
export class HealthResponseDto extends createZodDto(HealthResponseSchema) {}

// 3. TYPE - Para TypeScript (inferido do schema)
//    Usado em services e lógica de negócio
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
```

**Quando usar cada um:**

| Situação                           | Usar        |
| ---------------------------------- | ----------- |
| Validar input de requisição        | Schema      |
| Documentar endpoint no Swagger     | DTO (class) |
| Tipar retorno de service           | Type        |
| Tipar variáveis internas           | Type        |
| Decorator `@ApiResponse({ type })` | DTO (class) |

**No Frontend:** Usamos apenas Types (sem sufixo Dto), mapeados do `api.d.ts` gerado.

### Frontend (`/frontend/src`)

```
src/
├── assets/                        # Imagens, ícones estáticos
├── components/
│   ├── ui/                        #   Componentes base (Button, Input, Card)
│   └── layout/                    #   Estruturas (Sidebar, Header)
├── features/
│   └── {feature}/                 # Cada funcionalidade do sistema
│       ├── pages/                 #   Páginas/orquestradores da feature
│       │   └── {Feature}Page.tsx
│       ├── api/                   #   Hooks de data fetching (TanStack Query)
│       │   └── use{Feature}.ts
│       ├── components/            #   Componentes da feature
│       │   └── {Component}.tsx
│       ├── hooks/                 #   Hooks de lógica de UI
│       ├── types/                 #   Tipagens da feature
│       │   └── index.ts
│       └── index.ts               #   Barrel exports
├── hooks/                         # Hooks globais (useDebounce, useLocalStorage)
├── lib/                           # axios, react-query, utils
└── routes/                        # Definição de rotas (React Router)
    └── index.tsx
```

##### Features Simples vs Features com Sub-funcionalidades

**Feature simples** (ex: `health-check`): Estrutura plana com pages/, api/, components/, types/.

**Feature complexa** (ex: `wallet`): Agrupa sub-funcionalidades em pastas internas.

```
features/wallet/
├── core/                          # CRUD da carteira
│   ├── pages/
│   │   └── WalletPage.tsx
│   ├── api/
│   │   └── useWallet.ts           # useGetWallet, useCreateWallet, etc (TanStack Query)
│   ├── hooks/
│   │   └── useWalletFilters.ts    # ← useState + lógica de filtro
│   │   └──useWalletModal.ts       # ← Controle de abertura/fechamento de modal
│   ├── components/
│   │   └── WalletList.tsx         # ← Usa AMBOS os hooks
│   └── types/
│       └── index.ts
├── positions/                     # Sub-funcionalidade: posições
│   ├── pages/
│   │   └── PositionsPage.tsx
│   ├── api/
│   │   └── usePositions.ts
│   ├── components/
│   │   └── PositionsList.tsx
│   └── types/
│       └── index.ts
├── transactions/                  # Sub-funcionalidade: transações
│   ├── pages/
│   │   └── TransactionsPage.tsx
│   ├── api/
│   │   └── useTransactions.ts
│   ├── components/
│   │   └── TransactionsTable.tsx
│   └── types/
│       └── index.ts
├── hooks/                         # Hooks compartilhados da feature
├── types/                         # Types compartilhados da feature
└── index.ts                       # Barrel exports
```

**Diferença do Backend:** No React não precisa "registrar" nada. Basta criar as pastas e importar onde usar:

```tsx
// routes/index.tsx
import { WalletPage } from "@/features/wallet/core";
import { PositionsPage } from "@/features/wallet/positions";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/healthcheck" replace />} />
        {/* Simple route example */}
        <Route path="/healthcheck" element={<HealthCheckPage />} />

        {/* Nested routes example */}
        <Route path="/dashboard">
          <Route index element={<DashboardPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

**Exemplo: Feature Health-Check (simples)**

```
features/health-check/
├── pages/
│   └── HealthCheckPage.tsx    # Página principal da feature
├── api/
│   └── useHealthCheck.ts      # Hook de data fetching
├── components/
│   ├── HeroSection.tsx
│   ├── StatusSection.tsx
│   └── TechStackSection.tsx
├── types/
│   └── index.ts               # HealthResponse interface
└── index.ts                   # export { HealthCheckPage } from './pages/HealthCheckPage'
```

### Hooks no React: `api/` vs `hooks/`

**Custom Hooks** são funções que reutilizam lógica entre componentes. No projeto, separamos em duas pastas:

| Pasta      | Propósito     | Quando usar                                                   | Exemplo                                |
| ---------- | ------------- | ------------------------------------------------------------- | -------------------------------------- |
| **api/**   | Data fetching | Comunicação com backend (GET, POST, etc.)                     | `useGetWallets()`, `useCreateClient()` |
| **hooks/** | Lógica de UI  | Estado local, filtros, modais, debounce (não vai ao servidor) | `useTableFilters()`, `useDebounce()`   |

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
    queryKey: ["wallets", clientId],
    queryFn: () => api.get(`/clients/${clientId}/wallets`),
  });
}

// features/wallet/hooks/useWalletFilters.ts
// → Gerencia filtros locais (NÃO vai ao servidor). Mais complexo, é um hook de lógica de UI/estado, por isso fica em hook/
export function useWalletFilters() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "balance">("name");
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

### Componentes de UX

O projeto utiliza componentes e utilitários para melhorar a experiência do usuário.

#### Loading Components (`components/ui/`)

| Componente       | Propósito                                 | Props                         |
| ---------------- | ----------------------------------------- | ----------------------------- |
| `LoadingSpinner` | Spinner animado para indicar carregamento | `size?: 'sm' \| 'md' \| 'lg'` |
| `LoadingScreen`  | Tela cheia de loading com logo e mensagem | `message?: string`            |

```tsx
// Uso do LoadingSpinner
<LoadingSpinner size="sm" />  // Em botões
<LoadingSpinner size="lg" />  // Standalone

// Uso do LoadingScreen
<LoadingScreen message="Verificando sessao..." />
```

#### ButtonSubmit com Loading

O componente `ButtonSubmit` suporta estado de loading:

```tsx
<ButtonSubmit loading={isLoading} full={true}>
  {isLoading ? "Enviando..." : "Enviar"}
</ButtonSubmit>
```

#### Animações Tailwind

Animações customizadas disponíveis via classes Tailwind:

| Classe             | Efeito                            | Uso               |
| ------------------ | --------------------------------- | ----------------- |
| `animate-fade-in`  | Fade in com slide up sutil (0.3s) | Cards, páginas    |
| `animate-shake`    | Tremida horizontal (0.5s)         | Mensagens de erro |
| `animate-slide-up` | Slide up mais pronunciado (0.3s)  | Modais, toasts    |

```tsx
// Exemplo: Card com fade-in
<div className="animate-fade-in">...</div>;

// Exemplo: Erro com shake
{
  error && <div className="animate-shake text-rose-400">{error}</div>;
}
```

#### Padrão de Loading em Formulários

Para formulários com submissão assíncrona:

```tsx
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    await submitData();
  } catch {
    setError('Erro ao enviar');
  } finally {
    setIsLoading(false);
  }
};

return (
  <form onSubmit={handleSubmit}>
    <fieldset disabled={isLoading}>  {/* Desabilita todos os inputs */}
      <Input ... />
      <ButtonSubmit loading={isLoading}>Enviar</ButtonSubmit>
    </fieldset>
  </form>
);
```

## Modelo de Dados (Prisma Schema)

### Enums

```prisma
enum UserRole {
  ADVISOR         // Assessor de investimentos (acesso total aos seus clientes)
  CLIENT          // Cliente (acesso apenas à própria carteira)
  ADMIN           // Administrador do sistema
}

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

enum InviteStatus {
  PENDING         // Cliente criado, nenhum convite gerado
  SENT            // Token gerado e disponível para uso
  ACCEPTED        // Cliente aceitou, conta vinculada
  REJECTED        // Convite foi revogado pelo assessor
}
```

### Estrutura das Tabelas

#### Núcleo do Negócio

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  name          String
  cpfCnpj       String?
  phone         String?
  role          UserRole @default(ADVISOR)  // ADVISOR, CLIENT, ADMIN
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  clients       Client[] @relation("AdvisorClients")  // Clientes do assessor
  clientProfile Client?  @relation("LinkedUser")      // Perfil vinculado (se CLIENT)

  @@map("users")  // Tabela no banco: "users"
}

model Client {
  id              String       @id @default(uuid())
  advisorId       String       // FK para User (assessor responsavel)
  userId          String?      @unique  // FK para User (conta vinculada)
  name            String
  email           String?
  cpf             String
  phone           String?
  riskProfile     RiskProfile  @default(MODERATE)
  inviteToken     String?      @unique  // Token de convite (INV-XXXXXXXX)
  inviteStatus    InviteStatus @default(PENDING)  // Status do convite
  inviteExpiresAt DateTime?    // Expiracao do token
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  wallets         Wallet[]
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

| Tabela     | Propósito                                                                                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**   | Usuário do sistema com autenticação JWT. O campo `role` define o tipo: ADVISOR (assessor), CLIENT, ou ADMIN. Assessores são o **tenant principal** do modelo multi-tenant — cada assessor só vê seus próprios clientes. |
| **Client** | Cliente do assessor. Contém CPF, perfil de risco e dados de contato. Um assessor pode ter N clientes.                                                                                                                   |
| **Wallet** | Carteira de investimentos. Cada cliente pode ter múltiplas carteiras (ex: "Aposentadoria", "Curto Prazo"). O campo `cashBalance` representa o saldo em caixa disponível para investir.                                  |

#### Ativos e Derivativos

| Tabela           | Propósito                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Asset**        | Ativo financeiro negociável. Pode ser **ação** ou **opção**. O campo `type` diferencia.                                                                                         |
| **OptionDetail** | Detalhes de opções (relação 1:1 com Asset). Armazena: ativo objeto, tipo (CALL/PUT), estilo de exercício, strike e vencimento. Essencial para calcular **Moneyness** (ITM/OTM). |

#### Posições e Movimentações

| Tabela          | Propósito                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Position**    | Posição atual de um ativo em uma carteira. Armazena quantidade e **preço médio de aquisição**. Única por par `[walletId, assetId]`. |
| **Transaction** | Histórico de movimentações (append-only). Inclui: compras, vendas, dividendos, splits, depósitos e saques.                          |

> **⚠️ Importante: Preço Médio vs Preço de Mercado**
>
> O campo `Position.averagePrice` é o **preço médio de compra** (quanto o cliente pagou), não o preço atual de mercado.
>
> | Conceito             | Origem                   | Uso                          |
> | -------------------- | ------------------------ | ---------------------------- |
> | **Preço Médio**      | Calculado das transações | IR, lucro/prejuízo realizado |
> | **Preço de Mercado** | API externa (B3, Yahoo)  | Valor atual da carteira      |
>
> **Exemplo:** Cliente comprou 100 PETR4 a R$30 e mais 50 a R$36.
>
> - Preço médio (banco): R$32,00 (custo de aquisição)
> - Preço mercado (API): R$38,00 (cotação atual)
> - Lucro não realizado: R$6,00/ação (+18,75%)

#### Otimização (Iniciação Científica)

| Tabela              | Propósito                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **OptimizationRun** | Execução do algoritmo da Mochila Inteira. Armazena parâmetros de entrada, resultado sugerido e status (gerado/aceito/rejeitado). |
| **RebalanceLog**    | Registro de rebalanceamentos efetivados. Guarda snapshot antes/depois da carteira para auditoria e análise histórica.            |

### Diagrama de Relacionamentos

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │──1:N──│   Client    │──1:N──│   Wallet    │
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

Isso cria `src/types/api.d.ts` com os schemas do backend.

**Fluxo de trabalho:**

1. Alterar schema no backend (ex: adicionar campo)
2. Rodar `npm run generate:types` no frontend
3. Commitar `api.d.ts` junto com as mudanças do backend
4. CI/CD usa o arquivo commitado (não precisa regenerar)

```typescript
// Uso no frontend (features/{feature}/types/index.ts)
import type { components } from "@/types/api";

// Mapear tipos removendo o sufixo Dto (convenção do frontend)
export type HealthApiResponse = components["schemas"]["HealthApiResponseDto"];
export type HealthResponse = HealthApiResponse["data"];
// status: "ok" | "error"  ← Gerado automaticamente do enum do backend
```

### Endpoints Disponíveis

| Endpoint     | URL                           | Descrição                              |
| ------------ | ----------------------------- | -------------------------------------- |
| Backend API  | http://localhost:3000         | API REST principal                     |
| Swagger      | http://localhost:3000/api     | Documentação interativa                |
| Health Check | http://localhost:3000/health  | Status da API e banco                  |
| Auth         | http://localhost:3000/auth    | Autenticacao (login, registro, perfil) |
| Clients      | http://localhost:3000/clients | Gestao de clientes e convites          |

## Autenticação

O sistema utiliza autenticação **JWT (JSON Web Token) stateless** com cookies **HttpOnly**, uma abordagem mais segura que armazenamento em localStorage.

### Por que HttpOnly Cookies?

| Abordagem           | Vulnerável a XSS? | Vulnerável a CSRF? | Recomendação       |
| ------------------- | ----------------- | ------------------ | ------------------ |
| localStorage        | ✅ Sim            | ❌ Não             | ❌ Evitar          |
| Cookie normal       | ✅ Sim            | ✅ Sim             | ❌ Evitar          |
| **HttpOnly Cookie** | ❌ Não            | ⚠️ Mitigado\*      | ✅ **Recomendado** |

\*Mitigado com `SameSite=Strict` e validação de origem (CORS).

**HttpOnly** significa que o cookie não pode ser acessado via JavaScript (`document.cookie`), protegendo contra ataques XSS.

### Fluxo de Autenticação

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            FLUXO DE LOGIN                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Frontend envia POST /auth/login { email, password }                      │
│                          │                                                   │
│                          ▼                                                   │
│  2. LocalStrategy valida credenciais (bcrypt.compare)                        │
│                          │                                                   │
│                          ▼                                                   │
│  3. AuthService gera JWT: { sub: id, email, role }                           │
│                          │                                                   │
│                          ▼                                                   │
│  4. Backend define cookie HttpOnly na resposta:                              │
│     Set-Cookie: tcc_auth=<jwt>; HttpOnly; Secure; SameSite=Strict           │
│                          │                                                   │
│                          ▼                                                   │
│  5. Browser armazena cookie automaticamente (inacessível ao JS)              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE REQUISIÇÃO AUTENTICADA                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Frontend faz GET /health (axios com withCredentials: true)               │
│                          │                                                   │
│                          ▼                                                   │
│  2. Browser anexa cookie automaticamente no header                           │
│     Cookie: tcc_auth=<jwt>                                                   │
│                          │                                                   │
│                          ▼                                                   │
│  3. JwtStrategy extrai token do cookie e valida:                             │
│     - Verifica assinatura com JWT_SECRET                                     │
│     - Verifica se não expirou (12h)                                          │
│     - Decodifica payload: { sub, email, role }                               │
│                          │                                                   │
│                          ▼                                                   │
│  4. Se válido: req.user = { id, email, role } → Controller processa          │
│     Se inválido: retorna 401 Unauthorized                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Estrutura do JWT

Um JWT tem 3 partes separadas por pontos: `header.payload.signature`

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1dWlkIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IkFEVklTT1IifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

| Parte         | Conteúdo                                         | Função                                       |
| ------------- | ------------------------------------------------ | -------------------------------------------- |
| **Header**    | `{ "alg": "HS256", "typ": "JWT" }`               | Algoritmo de assinatura                      |
| **Payload**   | `{ "sub": "id", "email": "...", "role": "..." }` | Dados do usuário (Base64, não criptografado) |
| **Signature** | HMAC-SHA256(header + payload, JWT_SECRET)        | Garante integridade (não foi alterado)       |

> **Importante:** O payload é apenas codificado (Base64), não criptografado. Qualquer um pode decodificar e ler. A assinatura apenas garante que não foi adulterado.

### Endpoints de Autenticação

| Método | Endpoint         | Descrição                   | Autenticado? |
| ------ | ---------------- | --------------------------- | ------------ |
| POST   | `/auth/register` | Criar nova conta            | Não          |
| POST   | `/auth/login`    | Autenticar e receber cookie | Não          |
| POST   | `/auth/logout`   | Remover cookie              | Não          |
| GET    | `/auth/me`       | Obter perfil do usuário     | Sim          |

### Protegendo Rotas (Backend)

```typescript
// Proteger rota com autenticação JWT
@UseGuards(JwtAuthGuard)
@Get('protected')
getProtected() { ... }

// Proteger rota com autenticação + verificação de role
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Delete(':id')
deleteUser() { ... }

// Acessar dados do usuário autenticado
@Get('me')
getProfile(@CurrentUser() user: RequestUser) {
  return user; // { id, email, role }
}
```

### Configuração de Cookies

```typescript
// auth.controller.ts
res.cookie("tcc_auth", token, {
  httpOnly: true, // Inacessível via JavaScript (protege contra XSS)
  secure: true, // Apenas HTTPS em produção
  sameSite: "strict", // Não envia em requisições cross-site (protege CSRF)
  maxAge: 12 * 60 * 60 * 1000, // 12 horas
  path: "/", // Disponível em todas as rotas
});
```

### Frontend: Context de Autenticação

```typescript
// Uso em qualquer componente
const { user, isAuthenticated, signIn, signOut } = useAuth();

// Login
await signIn({ email: "user@example.com", password: "123456" });

// Logout (remove cookie via API)
await signOut();
```

### Variáveis de Ambiente (Auth)

| Variável         | Descrição                                        | Exemplo                                    |
| ---------------- | ------------------------------------------------ | ------------------------------------------ |
| `JWT_SECRET`     | Chave secreta para assinar tokens (min 32 chars) | `sua-chave-secreta-aqui-min-32-caracteres` |
| `JWT_EXPIRES_IN` | Tempo de expiração do token                      | `12h`                                      |
| `COOKIE_SECURE`  | Usar HTTPS para cookies                          | `true` (produção)                          |
| `COOKIE_DOMAIN`  | Domínio do cookie (opcional)                     | `.example.com`                             |
| `CORS_ORIGIN`    | Origem permitida para CORS                       | `https://app.example.com`                  |

## Sistema de Convite de Clientes (Hybrid Client)

O sistema suporta um modelo "Hybrid Client" onde clientes podem vincular suas contas de usuário a um perfil de cliente existente através de um sistema de convite seguro.

### Fluxo do Convite

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE CONVITE DE CLIENTE                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Assessor cria um cliente no sistema (dados básicos)                      │
│                          │                                                   │
│                          ▼                                                   │
│  2. Assessor gera convite: POST /clients/:id/invite                          │
│     → Retorna token no formato INV-XXXXXXXX (válido por 7 dias)              │
│                          │                                                   │
│                          ▼                                                   │
│  3. Assessor compartilha o token com o cliente (email, WhatsApp, etc.)       │
│                          │                                                   │
│                          ▼                                                   │
│  4. Cliente cria conta no sistema: POST /auth/register                       │
│                          │                                                   │
│                          ▼                                                   │
│  5. Cliente aceita convite: POST /clients/invite/accept { token }            │
│     → Conta vinculada ao perfil de cliente do assessor                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Endpoints de Convite

| Método | Endpoint                 | Role    | Descrição                         |
| ------ | ------------------------ | ------- | --------------------------------- |
| POST   | `/clients/:id/invite`    | ADVISOR | Gerar token de convite            |
| GET    | `/clients/:id/invite`    | ADVISOR | Consultar status/token do convite |
| DELETE | `/clients/:id/invite`    | ADVISOR | Revogar convite pendente          |
| POST   | `/clients/invite/accept` | ANY     | Aceitar convite e vincular conta  |

### Estados do Convite (InviteStatus)

| Estado     | Descrição                                   |
| ---------- | ------------------------------------------- |
| `PENDING`  | Cliente criado, nenhum convite gerado ainda |
| `SENT`     | Token gerado e disponível para uso          |
| `ACCEPTED` | Cliente aceitou, conta vinculada            |
| `REJECTED` | Convite foi revogado pelo assessor          |

### Formato do Token

- **Padrão:** `INV-XXXXXXXX` (8 caracteres alfanuméricos)
- **Caracteres:** `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sem caracteres ambíguos como 0/O, 1/I/L)
- **Expiração:** 7 dias após geração
- **Uso único:** Token é invalidado após aceitação

### Segurança

- Tokens gerados com `crypto.randomBytes()` (criptograficamente seguros)
- Cada token é único (constraint `@unique` no banco)
- Expiração automática após 7 dias
- Token removido após uso bem-sucedido
- Assessor pode revogar convites pendentes a qualquer momento

## CI/CD (GitHub Actions)

O pipeline está em `.github/workflows/deploy.yml`:

1. **Backend:** Build Docker → Push DockerHub → Deploy EC2 → Migrate DB
2. **Frontend:** Build Vite → Upload S3 → Invalidate CloudFront

### Secrets Necessárias no GitHub (já estão configuradas no repositório do TCC, listadas abaixo somente para documentação)

| Secret                       | Descrição                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `DOCKERHUB_USERNAME`         | Usuário Docker Hub                                                                                           |
| `DOCKERHUB_TOKEN`            | Token de acesso Docker Hub                                                                                   |
| `EC2_HOST`                   | IP público da EC2                                                                                            |
| `EC2_USER`                   | Usuário SSH (ec2-user)                                                                                       |
| `EC2_SSH_KEY`                | Chave privada .pem                                                                                           |
| `DATABASE_URL`               | Connection string RDS (produção)                                                                             |
| `CORS_ORIGIN`                | URL do CloudFront                                                                                            |
| `VITE_API_URL`               | URL da API para o frontend                                                                                   |
| `AWS_S3_BUCKET`              | Nome do bucket S3                                                                                            |
| `AWS_ACCESS_KEY_ID`          | Credencial AWS                                                                                               |
| `AWS_SECRET_ACCESS_KEY`      | Credencial AWS                                                                                               |
| `CLOUDFRONT_DISTRIBUTION_ID` | ID da distribuição CloudFront                                                                                |
| `DEPLOY_ENABLED`             | Indica se o CI/CD precisa fazer a etapa de deploy na EC2 ou não (não fazer se a AWS não estiver configurada) |
| `JWT_SECRET`                 | Chave secreta para assinar tokens JWT (mínimo 32 caracteres)                                                 |
| `JWT_EXPIRES_IN`             | Tempo de expiração do token JWT (padrão: "12h")                                                              |

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

## Regras de Pull Requests

1. **Prettier**: Ao finalizar suas alterações, rode o comando: `npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}"` para o prettier ajustar a formatação dos arquivos
