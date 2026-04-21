import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { DomainException } from '../domain/domain.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof DomainException) {
      // Automatically map Domain Exceptions to 400 Bad Request
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma-specific database errors gracefully
      switch (exception.code) {
        case 'P2002': // Unique constraint failed
          status = HttpStatus.CONFLICT; // 409 Conflict is semantically correct for duplicates
          const target = (exception.meta?.target as string[])?.join(', ') || 'field';
          message = `Unique constraint failed on ${target}. The record already exists.`;
          break;
        case 'P2003': // Foreign key constraint failed
          status = HttpStatus.BAD_REQUEST;
          const field_name = exception.meta?.field_name || 'field';
          message = `Foreign key constraint failed on ${field_name}. The referenced record does not exist.`;
          break;
        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          message = exception.meta?.cause || 'Record not found';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = 'A database error occurred while processing the request.';
          break;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `HTTP Status: ${status} Error Message: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'object' && message !== null && 'message' in message
          ? (message as any).message
          : message,
    });
  }
}
