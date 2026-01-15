# Development Guide

This document describes how to add new features, conventions, and CI/CD setup.

## Adding a New Backend Module

### 1. Simple Module Structure

Create a new folder in `backend/src/modules/{feature}/`:

```
modules/my-feature/
  controllers/
    my-feature.controller.ts
    index.ts
  services/
    my-feature.service.ts
    index.ts
  schemas/
    my-feature.schema.ts
    index.ts
  enums/
    my-feature.enum.ts        # if needed
    index.ts
  __tests__/
    my-feature.service.spec.ts
  my-feature.module.ts
  index.ts
```

### 2. Module File

```typescript
// my-feature.module.ts
import { Module } from '@nestjs/common';
import { MyFeatureController } from './controllers';
import { MyFeatureService } from './services';

@Module({
  controllers: [MyFeatureController],
  providers: [MyFeatureService],
  exports: [MyFeatureService], // Only if other modules need this service
})
export class MyFeatureModule {}
```

### 3. Register in AppModule

```typescript
// app.module.ts
import { MyFeatureModule } from './modules/my-feature';

@Module({
  imports: [
    SharedModule,
    // ... other modules
    MyFeatureModule,
  ],
})
export class AppModule {}
```

### 4. Schema with Zod

```typescript
// schemas/my-feature.schema.ts
import { z } from 'zod/v4';
import { createZodDto } from 'nestjs-zod';

// Schema - validation rules (source of truth)
export const CreateMyFeatureSchema = z.object({
  name: z.string().min(2).max(100),
  status: z.enum(['active', 'inactive']),
});

// DTO - for Swagger/NestJS
export class CreateMyFeatureDto extends createZodDto(CreateMyFeatureSchema) {}

// Type - for TypeScript
export type CreateMyFeature = z.infer<typeof CreateMyFeatureSchema>;
```

### 5. Controller

```typescript
// controllers/my-feature.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { ApiResponseDto } from '@/common/schemas';
import { MyFeatureService } from '../services';
import { CreateMyFeatureDto, MyFeatureResponseDto } from '../schemas';

@ApiTags('my-feature')
@Controller('my-feature')
@UseGuards(JwtAuthGuard)
export class MyFeatureController {
  constructor(private readonly myFeatureService: MyFeatureService) {}

  @Get()
  @ApiResponse({ type: MyFeatureResponseDto })
  async findAll() {
    const data = await this.myFeatureService.findAll();
    return ApiResponseDto.success(data);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADVISOR')
  async create(@Body() dto: CreateMyFeatureDto) {
    const data = await this.myFeatureService.create(dto);
    return ApiResponseDto.success(data);
  }
}
```

### 6. Service

```typescript
// services/my-feature.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma';
import type { CreateMyFeature } from '../schemas';

@Injectable()
export class MyFeatureService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.myFeature.findMany();
  }

  async create(data: CreateMyFeature) {
    return this.prisma.myFeature.create({ data });
  }

  async findById(id: string) {
    const item = await this.prisma.myFeature.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Item not found');
    }
    return item;
  }
}
```

---

## Adding a New Frontend Feature

### 1. Feature Structure

Create a new folder in `frontend/src/features/{feature}/`:

```
features/my-feature/
  pages/
    MyFeaturePage.tsx
  api/
    useMyFeature.ts           # TanStack Query hooks
  components/
    MyFeatureList.tsx
    MyFeatureCard.tsx
  hooks/
    useMyFeatureFilters.ts    # UI logic hooks
  types/
    index.ts
  index.ts                    # Barrel exports
```

### 2. Types from Generated API

```typescript
// types/index.ts
import type { components } from '@/types/api';

export type MyFeatureResponse = components['schemas']['MyFeatureResponseDto'];
export type CreateMyFeature = components['schemas']['CreateMyFeatureDto'];
```

### 3. API Hook (TanStack Query)

```typescript
// api/useMyFeature.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { MyFeatureResponse, CreateMyFeature } from '../types';

export function useGetMyFeatures() {
  return useQuery({
    queryKey: ['my-features'],
    queryFn: async () => {
      const { data } = await api.get<{ data: MyFeatureResponse[] }>('/my-feature');
      return data.data;
    },
  });
}

export function useCreateMyFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateMyFeature) => {
      const { data } = await api.post('/my-feature', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-features'] });
    },
  });
}
```

### 4. UI Logic Hook

```typescript
// hooks/useMyFeatureFilters.ts
import { useState } from 'react';

export function useMyFeatureFilters() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
  };

  return { search, setSearch, status, setStatus, resetFilters };
}
```

### 5. Page Component

```typescript
// pages/MyFeaturePage.tsx
import { useGetMyFeatures } from '../api/useMyFeature';
import { useMyFeatureFilters } from '../hooks/useMyFeatureFilters';
import { MyFeatureList } from '../components/MyFeatureList';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function MyFeaturePage() {
  const { data, isLoading, error } = useGetMyFeatures();
  const { search, setSearch, status, setStatus } = useMyFeatureFilters();

  if (isLoading) return <LoadingSpinner size="lg" />;
  if (error) return <div>Error loading data</div>;

  const filtered = data?.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === 'all' || item.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">My Feature</h1>
      {/* Filter controls */}
      <MyFeatureList items={filtered ?? []} />
    </div>
  );
}
```

### 6. Add Route

```typescript
// routes/index.tsx
import { MyFeaturePage } from '@/features/my-feature';

// Inside the ProtectedLayout routes:
<Route element={<ProtectedLayout allowedRoles={['ADVISOR', 'ADMIN']} />}>
  <Route path="/advisor/home" element={<HomePageAdvisor />} />
  <Route path="/my-feature" element={<MyFeaturePage />} />
</Route>
```

### 7. Export from Feature Index

```typescript
// features/my-feature/index.ts
export { MyFeaturePage } from './pages/MyFeaturePage';
export * from './types';
```

---

## Type Generation (OpenAPI)

The frontend auto-generates types from the backend Swagger:

```bash
cd frontend
npm run generate:types  # Requires backend running at localhost:3000
```

This creates `src/types/api.d.ts` with backend schemas.

**Workflow:**

1. Change schema in backend (e.g., add field)
2. Run `npm run generate:types` in frontend
3. Commit `api.d.ts` with backend changes
4. CI/CD uses the committed file (no regeneration needed)

---

## UX Components

### Loading Components

| Component        | Purpose                                   | Props                         |
| ---------------- | ----------------------------------------- | ----------------------------- |
| `LoadingSpinner` | Animated spinner for loading indication   | `size?: 'sm' \\| 'md' \\| 'lg'`   |
| `LoadingScreen`  | Full-page loading with logo and message   | `message?: string`            |

```tsx
// LoadingSpinner usage
<LoadingSpinner size="sm" />  // In buttons
<LoadingSpinner size="lg" />  // Standalone

// LoadingScreen usage
<LoadingScreen message="Checking session..." />
```

### ButtonSubmit with Loading

```tsx
<ButtonSubmit loading={isLoading} full={true}>
  {isLoading ? "Sending..." : "Send"}
</ButtonSubmit>
```

### Tailwind Animations

| Class              | Effect                            | Use               |
| ------------------ | --------------------------------- | ----------------- |
| `animate-fade-in`  | Fade in with subtle slide (0.3s)  | Cards, pages      |
| `animate-shake`    | Horizontal shake (0.5s)           | Error messages    |
| `animate-slide-up` | More pronounced slide up (0.3s)   | Modals, toasts    |

### Form Loading Pattern

```tsx
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    await submitData();
  } catch {
    setError('Error submitting');
  } finally {
    setIsLoading(false);
  }
};

return (
  <form onSubmit={handleSubmit}>
    <fieldset disabled={isLoading}>  {/* Disables all inputs */}
      <Input ... />
      <ButtonSubmit loading={isLoading}>Submit</ButtonSubmit>
    </fieldset>
  </form>
);
```

---

## Development Rules

1. **Zero Over-engineering**: Keep it simple
2. **Strict Typing**: No `any`. Frontend interfaces mirror backend DTOs.
3. **Conventional Commits**: `feat`, `fix`, `chore`, etc.
4. **Language**: Code in English. Comments only when strictly necessary, also in English. All UI text in Brazilian Portuguese.
5. **Atomic Commits**: Commit working iterations. Semantic commits in English.
6. **Documentation**: After committing changes, update README.md and CLAUDE.md if needed.

---

## CI/CD (GitHub Actions)

Quality checks run on PRs to main/master:

- **Backend:** lint, prettier, tests with 80% coverage threshold
- **Frontend:** lint, prettier, build check

### Pipeline (`.github/workflows/deploy.yml`)

1. **Backend:** Build Docker -> Push DockerHub -> Deploy EC2 -> Migrate DB
2. **Frontend:** Build Vite -> Upload S3 -> Invalidate CloudFront

### Required GitHub Secrets

| Secret                       | Description                                              |
| ---------------------------- | -------------------------------------------------------- |
| `DOCKERHUB_USERNAME`         | Docker Hub username                                      |
| `DOCKERHUB_TOKEN`            | Docker Hub access token                                  |
| `EC2_HOST`                   | EC2 public IP                                            |
| `EC2_USER`                   | SSH user (ec2-user)                                      |
| `EC2_SSH_KEY`                | Private .pem key                                         |
| `DATABASE_URL`               | RDS connection string (production)                       |
| `CORS_ORIGIN`                | CloudFront URL                                           |
| `VITE_API_URL`               | API URL for frontend                                     |
| `AWS_S3_BUCKET`              | S3 bucket name                                           |
| `AWS_ACCESS_KEY_ID`          | AWS credential                                           |
| `AWS_SECRET_ACCESS_KEY`      | AWS credential                                           |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID                               |
| `DEPLOY_EC2_ENABLED`         | Whether CI/CD should deploy to EC2                       |
| `JWT_SECRET`                 | Secret key for JWT tokens (min 32 chars)                 |
| `JWT_EXPIRES_IN`             | JWT expiration time (default: "12h")                     |
| `COOKIE_SECURE`              | Force secure cookies in production (default: "true")     |
| `COOKIE_DOMAIN`              | Cookie domain (optional)                                 |
| `DOMAIN`                     | Caddy hostname (default: tcc-investimentos.duckdns.org)  |

---

## Before Committing

Run Prettier to format files:

```bash
npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}"
```

---

## Testing

### Backend Tests

```bash
cd backend
npm test                     # Run all tests
npm test -- --coverage       # Run with coverage (80% threshold required)
npm test -- path/to/file     # Run specific test file
```

### Test Structure

Tests are colocated with the code they test:

```
modules/my-feature/
  services/
    my-feature.service.ts
  __tests__/
    my-feature.service.spec.ts
```

### Example Test

```typescript
// __tests__/my-feature.service.spec.ts
import { Test } from '@nestjs/testing';
import { MyFeatureService } from '../services';
import { PrismaService } from '@/shared/prisma';

describe('MyFeatureService', () => {
  let service: MyFeatureService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MyFeatureService,
        {
          provide: PrismaService,
          useValue: {
            myFeature: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MyFeatureService>(MyFeatureService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return all items', async () => {
    const mockItems = [{ id: '1', name: 'Test' }];
    jest.spyOn(prisma.myFeature, 'findMany').mockResolvedValue(mockItems);

    const result = await service.findAll();
    expect(result).toEqual(mockItems);
  });
});
```
