# TCC Investimentos - SaaS B2B para Assessores

Plataforma de gestão de portfólio e otimização de investimentos.
Projeto de TCC + Iniciação Científica (Algoritmo da Mochila).

## Arquitetura e Padrões

### Backend: Monolito Modular (NestJS)
Não usamos arquitetura de camadas tradicional (Controller/Service/Repo) na raiz.
Agrupamos por **Domínio de Negócio**.

- **Módulos:** Cada pasta em `modules/` é um domínio isolado (ex: optimization, wallet, assets).
- **Comunicação:** Módulos podem importar uns aos outros via `imports: []` no Module.
- **Banco de Dados:** Prisma ORM 7.x com Driver Adapters (PostgreSQL).

### Frontend: Feature-Based (React)
Não aglomeramos componentes em uma pasta gigante.
Usamos **Colocation**: No caso do nosso projeto, o código vive perto de onde é usado.

- **Features:** Cada pasta em `features/` contém tudo que uma funcionalidade precisa (api, componentes, hooks).
- **Shared:** Apenas componentes genéricos (UI Kit) ficam em `components/ui`.

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

## Estrutura de Pastas

### Backend (`/backend/src`)
```
src/
├── common/              # Decorators, Guards, Filters, Pipes
├── config/              # Configurações de ambiente
├── generated/           # Prisma Client (auto-gerado, ignorado no git)
├── modules/
│   ├── assets/          # Gestão de ativos (ações, opções)
│   ├── optimization/    # Algoritmo da Mochila (IC)
│   └── wallet/          # Carteiras e posições
├── prisma.service.ts    # Singleton do Prisma Client
├── app.module.ts
└── main.ts
```

### Frontend (`/frontend/src`)
```
src/
├── assets/              # Imagens, ícones estáticos
├── components/
│   ├── ui/              # Componentes base (Button, Input, Card)
│   └── layout/          # Estruturas (Sidebar, Header)
├── features/
│   ├── {feature}/
│   │   ├── api/         # Hooks de data fetching (TanStack Query)
│   │   ├── components/  # Componentes da feature
│   │   ├── hooks/       # Hooks de lógica de UI
│   │   ├── types/       # Tipagens da feature
│   │   └── index.tsx    # Página principal (export)
│   ├── health-check/    # Verificação de status (API + DB)
│   └── optimization/    # Otimização de carteira
├── hooks/               # Hooks globais (useDebounce, useLocalStorage)
├── lib/                 # axios, react-query, utils
└── pages/               # Rotas
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
npm run dev            # http://localhost:5173
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