# Advision

B2B SaaS platform for investment advisors. Portfolio management and investment optimization using the Knapsack algorithm (academic research project).

## Tech Stack

| Layer         | Technology                  |
| ------------- | --------------------------- |
| Backend       | NestJS + TypeScript         |
| Frontend      | React + Vite + TypeScript   |
| Database      | PostgreSQL 16               |
| ORM           | Prisma 7.x                  |

## Prerequisites

- Node.js 20+
- Docker and Docker Compose

## Quick Start

### 1. Clone and configure environment

```bash
git clone https://github.com/gsaudx/advision.git
cd advision

# Create .env file in backend
cp backend/.env.example backend/.env
```

### 2. Start database

```bash
docker-compose up -d
```

### 3. Setup Backend

```bash
cd backend
npm install
npx prisma generate    # Generate Prisma Client
npx prisma migrate dev # Apply migrations
npm run start:dev      # http://localhost:3000
```

### 4. Setup Frontend

```bash
cd frontend
npm install
npm run generate:types # Generate types from backend (requires backend running)
npm run dev            # http://localhost:5173
```

## Available Endpoints

| Endpoint     | URL                           | Description                |
| ------------ | ----------------------------- | -------------------------- |
| Backend API  | http://localhost:3000         | REST API                   |
| Swagger      | http://localhost:3000/api     | Interactive documentation  |
| Health Check | http://localhost:3000/health  | API and database status    |
| Frontend     | http://localhost:5173         | Web application            |

## Common Commands

### Backend

```bash
npm run start:dev            # Start dev server
npm run lint                 # Run ESLint
npm test                     # Run tests
npm test -- --coverage       # Run tests with coverage
npx prisma studio            # Database browser
```

### Frontend

```bash
npm run dev                  # Start dev server
npm run build                # Build for production
npm run lint                 # Run ESLint
npm run generate:types       # Regenerate API types
```

### Before Committing

```bash
npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}"
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - Backend and frontend structure
- [Database](docs/DATABASE.md) - Schema and relationships
- [Authentication](docs/AUTHENTICATION.md) - Auth flow and invite system
- [Development](docs/DEVELOPMENT.md) - How to add features and conventions

## Development Rules

1. **Zero Over-engineering**: Keep it simple
2. **Strict Typing**: No `any`
3. **Conventional Commits**: `feat`, `fix`, `chore`, etc.
4. **Language**: Code in English, UI in Brazilian Portuguese
