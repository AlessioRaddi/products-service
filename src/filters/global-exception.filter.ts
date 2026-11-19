import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UniqueConstraintError, ValidationError } from 'sequelize';
import { ErrorResponseDto } from './error-response.dto.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, messages } = this.resolveException(exception);

    if (status >= 500) {
      const reason =
        exception instanceof Error ? exception.message : String(exception);

      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${reason}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} -> ${status}: ${messages.join('; ')}`,
      );
    }

    const errorMessage: ErrorResponseDto = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      messages,
    };

    response.status(status).json(errorMessage);
  }

  private resolveException(exception: unknown): {
    status: number;
    messages: string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'object' &&
        response !== null &&
        'message' in response
          ? (response as { message: string | string[] }).message
          : exception.message;

      return { status, messages: Array.isArray(message) ? message : [message] };
    }

    if (exception instanceof UniqueConstraintError) {
      return {
        status: HttpStatus.CONFLICT,
        messages: exception.errors.map((e) => e.message),
      };
    }

    if (exception instanceof ValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        messages: exception.errors.map((e) => e.message),
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      messages: ['Internal Server Error'],
    };
  }
}
