import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { HttpExceptionFilter } from '@/common/filters';
import { env } from '@/config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Cookie Parser (for HttpOnly JWT cookies)
  app.use(cookieParser());

  // 2. CORS Configuration (Security)
  app.enableCors({
    origin: env.CORS_ORIGIN,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 3. Global Exception Filter (Standardizes error responses)
  app.useGlobalFilters(new HttpExceptionFilter());

  // 4. Global Zod Validation
  app.useGlobalPipes(new ZodValidationPipe());

  // 5. Swagger (API Documentation) - Development only
  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TCC Investimentos API')
      .setDescription(
        'API para gestao de carteiras e otimizacao (Knapsack Problem)',
      )
      .setVersion('1.0')
      .addTag('Health', 'Monitoramento e status da aplicacao')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  await app.listen(env.PORT, '0.0.0.0');

  logger.log(`Application is running on: http://localhost:${env.PORT}`);
  if (env.NODE_ENV !== 'production') {
    logger.log(`Swagger Documentation: http://localhost:${env.PORT}/api`);
  }
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error('Error starting application', err);
});
