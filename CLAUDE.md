# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TCC Investimentos is a B2B SaaS platform for investment advisors. It provides portfolio management and investment optimization using the Knapsack algorithm (part of an academic research project).

## Quick Reference

For detailed documentation, see the `docs/` folder:

- [Architecture](docs/ARCHITECTURE.md) - Backend and frontend structure
- [Database](docs/DATABASE.md) - Schema and relationships
- [Authentication](docs/AUTHENTICATION.md) - Auth flow and invite system
- [Development](docs/DEVELOPMENT.md) - How to add features and conventions

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

## Architecture Summary

### Backend: Domain-Based Modular Monolith (NestJS)

- Organized by **business domain** in `modules/`
- Path alias: `@/` maps to `src/`
- Validation with Zod 4 + `nestjs-zod` for DTOs

**Key Folders:**

- `modules/` - Business domains: `auth/`, `clients/`, `health/`
- `common/` - Shared: decorators, schemas, filters, guards
- `shared/` - Global services (`@Global()`) like PrismaService
- `config/` - Environment configuration with Zod validation

### Frontend: Feature-Based (React + Vite)

- **Colocation**: code lives near where it's used
- Path alias: `@/` maps to `src/`

**Key Folders:**

- `features/{feature}/` - Self-contained features with `pages/`, `api/`, `components/`, `hooks/`, `types/`
- `components/layout/` - Layout components: `Header`, `Sidebar`, `ProtectedLayout`, `ModalBase`
- `components/ui/` - Reusable UI components (design system)
- `lib/` - axios config, react-query setup

### API Response Pattern

All endpoints return standardized responses:

- Success: `{ success: true, data: {...}, message?: string }`
- Error: `{ success: false, statusCode, message, errors?, timestamp, path }`

## Database

- PostgreSQL 16 with Prisma ORM 7.x (Driver Adapters)
- Schema in `backend/prisma/schema.prisma`
- Multi-tenant model: User (Advisor) -> Clients -> Wallets -> Positions/Transactions
- User roles: `UserRole` enum with ADVISOR, CLIENT, ADMIN

## Authentication

- JWT-based with **HttpOnly cookies** (protects against XSS)
- Backend: `modules/auth/` with strategies (local, jwt), service, controller
- Frontend: `features/auth/` with AuthProvider, useAuth hook
- Endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- Guards: `JwtAuthGuard`, `RolesGuard`
- Decorators: `@Roles()`, `@CurrentUser()`

## Role-Based Routing (Frontend)

Uses React Router layout routes for persistent navigation:

- **`ProtectedLayout`** (`components/layout/ProtectedLayout.tsx`): Handles auth check, role validation, and provides persistent Header/Sidebar
- Layout stays mounted during navigation (prevents blink)
- Routes are grouped by allowed roles in `routes/index.tsx`

**Routes:**

| Route          | Access         | Description         |
| -------------- | -------------- | ------------------- |
| `/advisor/home`| ADVISOR, ADMIN | Advisor dashboard   |
| `/clients`     | ADVISOR, ADMIN | Client management   |
| `/client/home` | CLIENT         | Client dashboard    |
| `/admin/health`| ADMIN          | Health check page   |
| `/login`       | Public         | Login page          |
| `/register`    | Public         | Registration page   |

## Client Invite System

Allows clients to link their user accounts via secure invite tokens.

- Backend: `modules/clients/` with invite service and controller
- Token format: `INV-XXXXXXXX` (8 alphanumeric chars)
- Token expiration: 7 days
- Frontend: `InviteTokenPrompt` component in `features/home/components/client/`

## UI Components

**Layout (`components/layout/`):**

- `ProtectedLayout`: Auth wrapper with Header/Sidebar (uses React Router Outlet)
- `Header`: Navigation header with search and user menu
- `Sidebar`: Collapsible navigation sidebar
- `ModalBase`: Base modal component
- `PageTitle`: Page title component

**UI (`components/ui/`):**

- `LoadingSpinner`: Animated spinner (sm, md, lg)
- `LoadingScreen`: Full-page loading overlay
- `ButtonSubmit`: Button with loading state
- `Input`, `InputEmail`, `InputPassword`, `InputName`: Form inputs
- `InputPhone`: International phone input with country selector
- `InputCpfCnpj`: Auto-masking CPF/CNPJ input
- `RoleToggle`: ADVISOR/CLIENT toggle switch
- `Select`: Dropdown select

**Custom Tailwind Animations:**

- `animate-fade-in`: Fade in with slide (0.3s)
- `animate-shake`: Horizontal shake (0.5s)
- `animate-slide-up`: Slide up (0.3s)

## CI/CD

Quality checks run on PRs to main/master:

- Backend: lint, prettier, tests with 80% coverage threshold
- Frontend: lint, prettier, build check

## Development Rules

1. **Zero Over-engineering**: Keep it simple
2. **Strict Typing**: No `any`. Frontend interfaces mirror backend DTOs.
3. **Conventional Commits**: `feat`, `fix`, `chore`, etc.
4. **Language**: Code in English. Comments only when necessary, in English. UI text in Brazilian Portuguese.
5. **Atomic Commits**: Commit after each working iteration. Semantic commits in English. Do not add co-authors.
6. **Documentation**: After committing, update docs if architecture/structure changed.
7. **Standards**: Follow existing patterns. Report security issues or bad implementations for discussion.
8. **Quality**: Maintainable, secure, scalable, simple, and efficient code.
