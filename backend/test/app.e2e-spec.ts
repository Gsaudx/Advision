import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/shared/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL:
        'postgresql://admin:password123@localhost:5432/advision?schema=public',
      JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
      CORS_ORIGIN: 'http://localhost:5173',
      NODE_ENV: 'test',
    };

    const { AppModule } = await import('../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer()).get('/health').expect(401);
  });
});
