# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TCC Investimentos is a B2B SaaS platform for investment advisors. It provides portfolio management and investment optimization using the Knapsack algorithm (part of an academic research project).

## Common Commands

### Backend (from `/backend`)

```bash
npm install                  # Install dependencies
npx prisma generate          # Generate Prisma Client (required before running)
npx prisma migrate dev       # Apply database migrations
npm run start:dev            # Start dev server (http://localhost:3000)
npm run lint                 # Run ESLint with auto-fix
npm test                     # Run all tests
npm test -- --coverage       # Run tests with coverage (80% threshold required)
npm test -- path/to/file     # Run specific test file
```

### Frontend (from `/frontend`)

```bash
npm install                  # Install dependencies
npm run dev                  # Start dev server (http://localhost:5173)
npm run build                # Build for production (runs tsc + vite build)
npm run lint                 # Run ESLint
npm run generate:types       # Generate TypeScript types from backend OpenAPI (requires backend running)
```

### Before Committing

```bash
npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}"
```

## Architecture

### Backend: Domain-Based Modular Monolith (NestJS)

- **Not** traditional layered architecture (Controller/Service/Repo at root)
- Organized by **business domain** in `modules/`
- Path alias: `@/` maps to `src/` (e.g., `@/shared/prisma`)

**Module Structure:**

- Simple modules: flat structure with `controllers/`, `services/`, `schemas/`, `__tests__/`
- Complex modules (like `wallet`): sub-functionality folders (e.g., `core/`, `positions/`, `transactions/`)

**Key Folders:**

- `modules/` - Business domains (each is self-contained)
- `common/` - Shared utilities: decorators, schemas, filters, guards, utils
- `shared/` - Global services (`@Global()`) like PrismaService
- `config/` - Environment configuration

**Validation with Zod:**

- Schemas defined in `schemas/` folders using Zod 4
- Use `createZodDto()` from `nestjs-zod` to create DTO classes for Swagger
- Types inferred with `z.infer<typeof Schema>`
- Enums: use `z.nativeEnum(MyEnum)`

### Frontend: Feature-Based (React + Vite)

- **Colocation**: code lives near where it's used
- Path alias: `@/` maps to `src/`

**Key Folders:**

- `features/{feature}/` - Self-contained features with `pages/`, `api/`, `components/`, `hooks/`, `types/`
- `components/ui/` - Reusable UI components (design system)
- `hooks/` - Global hooks shared across features
- `lib/` - axios config, react-query setup, utilities

**Hooks Convention:**

- `api/` folder: data fetching hooks (TanStack Query)
- `hooks/` folder: UI logic hooks (local state, filters, modals)

### API Response Pattern

All endpoints return standardized responses:

- Success: `{ success: true, data: {...}, message?: string }`
- Error: `{ success: false, statusCode, message, errors?, timestamp, path }`

The `HttpExceptionFilter` automatically formats errors. Services return pure data; controllers wrap with `ApiResponseDto.success()`.

### Type Generation

Frontend types are auto-generated from backend Swagger:

```typescript
import type { components } from "@/types/api";
type HealthResponseDto = components["schemas"]["HealthResponseDto"];
```

Run `npm run generate:types` in frontend after backend schema changes.

## Database

- PostgreSQL 16 with Prisma ORM 7.x (Driver Adapters)
- Schema in `backend/prisma/schema.prisma`
- Multi-tenant model: User (Advisor role) → Clients → Wallets → Positions/Transactions
- `Position.averagePrice` = acquisition price (not market price)
- User roles: `UserRole` enum with ADVISOR, CLIENT, ADMIN

## Authentication

- JWT-based stateless authentication via `@nestjs/passport`
- **HttpOnly cookies** for token storage (more secure than localStorage - protects against XSS)
- Cookie settings: `httpOnly: true`, `sameSite: 'strict'`, `secure: true` (production)
- Token expiration: 12 hours (configurable via `JWT_EXPIRES_IN`)
- Backend auth module: `modules/auth/` with strategies (local, jwt), service, controller
- Endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- Guards: `JwtAuthGuard` (protects routes), `RolesGuard` (RBAC)
- Decorators: `@Roles()` (set required roles), `@CurrentUser()` (inject authenticated user)
- Frontend auth feature: `features/auth/` with AuthProvider, useAuth hook, ProtectedRoute
- Frontend axios config: `withCredentials: true` to send cookies with requests
- Environment: `JWT_SECRET` (required), `JWT_EXPIRES_IN` (default: "12h"), `COOKIE_SECURE`, `COOKIE_DOMAIN`

## UX Components

- `LoadingSpinner`: Animated spinner with size variants (sm, md, lg)
- `LoadingScreen`: Full-page loading with logo and message
- `ButtonSubmit`: Supports `loading` prop for async submissions
- Custom Tailwind animations: `animate-fade-in`, `animate-shake`, `animate-slide-up`
- Form loading pattern: use `<fieldset disabled={isLoading}>` to disable all inputs during submission
- AuthProvider shows LoadingScreen during initial auth check (prevents flicker)
- BasePage content uses `animate-fade-in` for smooth page transitions

## CI/CD

Quality checks run on PRs to main/master:

- Backend: lint, prettier, tests with 80% coverage threshold
- Frontend: lint, prettier, build check

## Development Rules

1. **Zero Over-engineering**: Keep it simple
2. **Strict Typing**: No `any`. Frontend interfaces mirror backend DTOs.
3. **Conventional Commits**: `feat`, `fix`, `chore`, etc.
4. **Human Language and comments**: Code is in english. Comments only when strictly necessary, and also in english. Every text in U.I in brazilian portuguese.
5. **Commits**: Let's work always with atomic commits. When we finish a whole iteration (working properly) we should commit the changes to the repository. Always semantic commits in english. Example - feat(backend): Add wallet/ endpoint to list wallets. Do not add other people/claude as co-authors. Let only myself as the author of the changes.
6. **Documentation**: After we commit a change, read the whole README.md file and update the respective sections, if needed with the new information (if we change some architecture decision, include folders, etc). After that, do the same thing in the CLAUDE.md file.
7. **Extra Instructions**: Always follow the standard used in the files already written, if we have a bad implementation, security issue or related, relate it to me so we can discuss a change in the implementation.
8. **General Development Rules**: We should always develop the most maintainable, secure, scalable, simple and efficient code as possible based on the market standards.
