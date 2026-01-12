import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { HttpExceptionFilter } from '@/common/filters';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Cookie Parser (for HttpOnly JWT cookies)
  app.use(cookieParser());

  // 2. CORS Configuration (Security)
  // In production, replace '*' with CloudFront URL
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 2. Global Exception Filter (Standardizes error responses)
  app.useGlobalFilters(new HttpExceptionFilter());

  // 3. Global Zod Validation
  app.useGlobalPipes(new ZodValidationPipe());

  // 4. Swagger (API Documentation) - Development only
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TCC Investimentos API')
      .setDescription(
        'API para gestão de carteiras e otimização (Knapsack Problem)',
      )
      .setVersion('1.0')
      .addTag('Health', 'Monitoramento e status da aplicação')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`📑 Swagger Documentation: http://localhost:${port}/api`);
  }
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error('Error starting application', err);
});
