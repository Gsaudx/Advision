import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '../schemas';

interface ExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

const GENERIC_ERROR_MESSAGE = 'Erro interno do servidor';

/**
 * Filtro global para padronizar todas as respostas de erro da API.
 * Captura HttpExceptions, ZodValidationException e erros nao tratados.
 * Em producao, mascaramos erros internos para nao expor detalhes de implementacao.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getStatus(exception);
    const message = this.extractMessage(exception, status);
    const errors = this.extractErrors(exception, status);

    const errorResponse: ApiErrorResponse = {
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof ZodValidationException) {
      return HttpStatus.BAD_REQUEST;
    }

    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private extractMessage(exception: unknown, status: number): string {
    // In production, mask internal server errors
    if (
      this.isProduction &&
      status === Number(HttpStatus.INTERNAL_SERVER_ERROR)
    ) {
      return GENERIC_ERROR_MESSAGE;
    }

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as ZodError;
      return zodError.issues[0]?.message || 'Validation failed';
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse() as ExceptionResponse;
      if (typeof response === 'string') return response;

      if (response.message) {
        return Array.isArray(response.message)
          ? response.message[0]
          : response.message;
      }
    }

    return GENERIC_ERROR_MESSAGE;
  }

  private extractErrors(
    exception: unknown,
    status: number,
  ): string[] | undefined {
    // In production, don't expose internal error details
    if (
      this.isProduction &&
      status === Number(HttpStatus.INTERNAL_SERVER_ERROR)
    ) {
      return undefined;
    }

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as ZodError;

      return zodError.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      });
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse() as ExceptionResponse;

      if (response.message && Array.isArray(response.message)) {
        return response.message;
      }
    }

    if (exception instanceof Error) {
      return [exception.message];
    }

    return undefined;
  }
}
