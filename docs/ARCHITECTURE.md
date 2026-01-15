# Architecture

This document describes the architectural decisions and folder structure for both backend and frontend.

## Tech Stack

| Layer             | Technology                  | Version    |
| ----------------- | --------------------------- | ---------- |
| **Backend**       | NestJS + TypeScript         | 11.x       |
| **Validation**    | Zod + nestjs-zod            | 4.x / 5.x  |
| **ORM**           | Prisma (Driver Adapters)    | 7.2.x      |
| **Frontend**      | React + Vite + TypeScript   | 19.x / 7.x |
| **UI**            | TailwindCSS + Lucide Icons  | 3.x        |
| **Data Fetching** | TanStack Query              | 5.x        |
| **Database**      | PostgreSQL                  | 16         |
| **Infrastructure**| AWS (EC2/RDS/S3/CloudFront) | -          |
| **Proxy**         | Caddy (auto SSL)            | 2.x        |

## Backend: Domain-Based Modular Monolith (NestJS)

We do **not** use traditional layered architecture (Controller/Service/Repo at root). Instead, we group by **Business Domain**.

- **Modules:** Each folder in `modules/` is an isolated domain (e.g., optimization, wallet, assets).
- **Internal Structure:** Larger modules use subfolders (`controllers/`, `services/`, `schemas/`, `__tests__/`).
- **Shared:** Shared services (Prisma, etc.) live in `shared/` with `@Global()`.
- **Path Alias:** We use `@/` for absolute imports (e.g., `@/shared/prisma`).
- **Communication:** Modules can import each other via `imports: []` in the Module.
- **Database:** Prisma ORM 7.x with Driver Adapters (PostgreSQL).

### Folder Structure (`/backend/src`)

#### Simple Module

**Simple module** (e.g., `health`): Flat structure with controllers/, services/, schemas/

```
src/
  common/                         # Reusable code across the application
    decorators/                   #   Custom decorators
    schemas/                      #   Base Zod schemas (ApiResponse, ApiError)
    filters/                      #   Exception handling
    guards/                       #   Access control
    utils/                        #   Utility functions
  config/                         # Environment configuration
  generated/                      # Prisma Client (auto-generated)
  modules/
    {feature}/                    # Each business domain
      controllers/                #   API endpoints
      services/                   #   Business logic
      schemas/                    #   Zod schemas (validation + types + DTOs)
      enums/                      #   Domain enums
      __tests__/                  #   Unit tests
      {feature}.module.ts
      index.ts                    #   Barrel exports
  shared/                         # Global shared services
    prisma/                       #   Database connection
    shared.module.ts              #   @Global() module
  app.module.ts                   # Root module
  main.ts                         # Bootstrap: CORS, Filters, Pipes, Swagger
```

#### Complex Module

**Complex module** (e.g., `wallet`): Groups sub-functionalities into internal folders.

```
modules/wallet/
  core/                           # Wallet CRUD
    controllers/
      wallet.controller.ts        # /wallets
    services/
      wallet.service.ts
    schemas/
      wallet.schema.ts
  positions/                      # Sub-functionality: positions
    controllers/
      positions.controller.ts     # /wallets/:id/positions
    services/
      positions.service.ts
    schemas/
      position.schema.ts
  transactions/                   # Sub-functionality: transactions
    controllers/
      transactions.controller.ts
    services/
      transactions.service.ts
    schemas/
      transaction.schema.ts
  enums/                          # Shared module enums
  __tests__/
  wallet.module.ts                # Registers ALL controllers/services
  index.ts
```

```typescript
// wallet.module.ts - registers all sub-functionalities
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

### Folder Descriptions

#### `modules/` - Business Domains

Each folder represents an **isolated feature** of the system. A module contains everything it needs to function.

| Subfolder          | Responsibility                                                                                   | When to use                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| **controllers/**   | Receives HTTP requests, validates input, calls service and returns response.                     | Whenever exposing an endpoint (`GET /wallets`, `POST /clients`).    |
| **services/**      | Contains business logic. Knows nothing about HTTP.                                               | Calculations, business rule validations, data orchestration.        |
| **schemas/**       | Defines Zod schemas for validation and typing. Generates DTOs (via `createZodDto`) and types.   | Input validation, contract definition, Swagger documentation.       |
| **enums/**         | TypeScript enums specific to the domain. Ensures type-safety between Schema, Service and Swagger.| Whenever there are fixed values (`status`, `type`, etc.).           |
| **__tests__/**     | Module unit tests. Located close to the code they test.                                          | Testing services in isolation with mocks.                           |

#### `common/` - Shared Code

Contains functionality that is **shared** between multiple modules. Unlike `shared/` (which has injectable services like Prisma), here we have pure utilities.

| Subfolder       | What it is                                                                                            | Example                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **decorators/** | Custom annotations for methods/classes. Extract data or add metadata.                                 | `@CurrentUser()` - extracts logged user from JWT token and injects into controller.                            |
| **schemas/**    | Reusable base Zod schemas. Define validation, DTOs and types for standardized responses.              | `ApiResponseSchema`: success wrapper. `ApiErrorResponseSchema`: standard error format.                         |
| **filters/**    | Intercept exceptions and format error response. Ensure all errors follow the same pattern.            | `HttpExceptionFilter` - catches errors and returns standardized response.                                      |
| **guards/**     | Block or allow access to routes. Execute **before** the controller.                                   | `JwtAuthGuard` - verifies token. `RolesGuard` - verifies user permission.                                      |
| **utils/**      | Pure helper functions, no NestJS dependency.                                                          | `formatCpf()`, `calculateAveragePrice()`, `slugify()`                                                          |

#### `config/` - Environment Configuration

Centralizes environment variables and typed configurations. Avoids scattered `process.env` in code.

#### `shared/` - Global Services

Services that **all modules** need to access. Marked with `@Global()` so no need to import in each module.

```typescript
// shared/shared.module.ts
@Global() // Available throughout the application automatically
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class SharedModule {}
```

### API Response Pattern

The API uses standardized wrappers to ensure response consistency. A global `HttpExceptionFilter` (registered in `main.ts`) intercepts all exceptions and formats them automatically.

#### Request Flow

```
Request -> Controller -> Service -> Controller -> Response
(validate)              (process)      (ApiResponseDto.success())
If error -> throw HttpException -> HttpExceptionFilter -> ApiErrorResponseDto
```

#### Separation of Concerns

| Layer                   | Responsibility                                                        | Knows HTTP? |
| ----------------------- | --------------------------------------------------------------------- | ----------- |
| **Service**             | Business logic. Returns pure data or throws exception.                | No          |
| **Controller**          | Receives request, calls service, wraps response with `ApiResponseDto`.| Yes         |
| **HttpExceptionFilter** | Catches exceptions and formats as `ApiErrorResponseDto`.              | Yes         |

#### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional"
}
```

#### Error Response

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid data",
  "errors": ["email: Invalid email"],
  "timestamp": "2026-01-06T15:30:00.000Z",
  "path": "/api/clients"
}
```

### Schema vs DTO vs Type

The project uses three related but distinct concepts:

| Concept    | What it is                     | Purpose                                    | Runtime Behavior       |
| ---------- | ------------------------------ | ------------------------------------------ | ---------------------- |
| **Schema** | Zod validation rules           | Define structure + validate data           | Actually validates     |
| **DTO**    | NestJS class                   | Swagger documentation + controller typing  | Just a type container  |
| **Type**   | TypeScript type (via `z.infer`)| Type-safety in code                        | Removed at compilation |

**Definition flow:**

```typescript
// 1. SCHEMA - Source of truth (validates data at runtime)
export const HealthResponseSchema = z.object({
  status: z.nativeEnum(HealthStatus).describe("Application status"),
  database: z.nativeEnum(DatabaseStatus).describe("Database status"),
});

// 2. DTO - For Swagger/NestJS (wraps schema in a class)
//    Used only in controllers for API documentation
export class HealthResponseDto extends createZodDto(HealthResponseSchema) {}

// 3. TYPE - For TypeScript (inferred from schema)
//    Used in services and business logic
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
```

---

## Frontend: Feature-Based (React)

We don't pile all components in a giant folder. We use **Colocation**: code lives near where it's used.

- **Features:** Each folder in `features/` contains everything a functionality needs (api, components, hooks).
- **Shared:** Only generic components (UI Kit) go in `components/ui`.
- **Path Alias:** We use `@/` for absolute imports (e.g., `@/lib/axios`, `@/components/ui`).

### Folder Structure (`/frontend/src`)

```
src/
  assets/                        # Images, static icons
  components/
    ui/                          # Base components (Button, Input, Card)
    layout/                      # Structures (Sidebar, Header, ProtectedLayout)
  features/
    {feature}/                   # Each system functionality
      pages/                     # Feature pages/orchestrators
        {Feature}Page.tsx
      api/                       # Data fetching hooks (TanStack Query)
        use{Feature}.ts
      components/                # Feature components
        {Component}.tsx
      hooks/                     # UI logic hooks
      types/                     # Feature types
        index.ts
      index.ts                   # Barrel exports
  hooks/                         # Global hooks
  lib/                           # axios, react-query, utils
  types/                         # Generated API types (api.d.ts)
  routes/                        # Route definitions (React Router)
    index.tsx
```

### Simple vs Complex Features

**Simple feature** (e.g., `health-check`): Flat structure with pages/, api/, components/, types/.

**Complex feature** (e.g., `wallet`): Groups sub-functionalities into internal folders.

```
features/wallet/
  core/                          # Wallet CRUD
    pages/
      WalletPage.tsx
    api/
      useWallet.ts               # useGetWallet, useCreateWallet, etc
    hooks/
      useWalletFilters.ts        # useState + filter logic
      useWalletModal.ts          # Modal open/close control
    components/
      WalletList.tsx             # Uses BOTH hooks
    types/
      index.ts
  positions/                     # Sub-functionality: positions
    pages/
      PositionsPage.tsx
    api/
      usePositions.ts
    components/
      PositionsList.tsx
    types/
      index.ts
  transactions/                  # Sub-functionality: transactions
  hooks/                         # Shared feature hooks
  types/                         # Shared feature types
  index.ts                       # Barrel exports
```

### Layout Routes with React Router

The frontend uses React Router's **layout routes** pattern to prevent screen blinks during navigation. The `ProtectedLayout` component provides:

- Authentication check
- Persistent sidebar and header
- Smooth page transitions via `<Outlet />`

```typescript
// routes/index.tsx
<Route element={<ProtectedLayout allowedRoles={['ADVISOR', 'ADMIN']} />}>
  <Route path="/advisor/home" element={<HomePageAdvisor />} />
  <Route path="/clients" element={<ClientsPage />} />
</Route>
```

Page components render content directly without needing a wrapper component - the layout is provided by `ProtectedLayout`.

### Hooks: `api/` vs `hooks/`

**Custom Hooks** are functions that reuse logic between components. In the project, we separate into two folders:

| Folder     | Purpose       | When to use                                                   | Example                                |
| ---------- | ------------- | ------------------------------------------------------------- | -------------------------------------- |
| **api/**   | Data fetching | Backend communication (GET, POST, etc.)                       | `useGetWallets()`, `useCreateClient()` |
| **hooks/** | UI logic      | Local state, filters, modals, debounce (doesn't hit server)   | `useTableFilters()`, `useDebounce()`   |

**Where to put?**

- `features/{feature}/api/` - Feature-specific hook
- `features/{feature}/hooks/` - Feature-specific hook
- `src/hooks/` - Hook reused across multiple features

---

## Production Architecture

```
Client Browser
  -> CloudFront (CDN) -> S3 (Frontend)
  -> Caddy (SSL/Proxy) -> Backend (NestJS) -> RDS (PostgreSQL)
```
