import { Catch, ArgumentsHost, HttpStatus, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  constructor(protected readonly config: ConfigService, protected readonly logger: PinoLogger) {
    super();
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception?.getStatus ? exception.getStatus() : 500;

    const jsonMsg = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      stack: exception.stack,
      message: exception.message,
      headers: request.headers,
    };

    if (['TypeError'].includes(exception.name)) this.logger.error(jsonMsg);

    return response.status(status).json({
      statusCode: jsonMsg.statusCode,
      message: jsonMsg.message,
    });
  }
}
