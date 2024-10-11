/* eslint-disable prettier/prettier */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException,Logger, HttpStatus } from '@nestjs/common';
import { isProdEnv } from '../app.environment'
import { APIError, APIErrorAlias } from 'src/shared/exceptions/api.error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  public catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const logger = new Logger('Global filters')
    let apiError = exception;

    if (exception instanceof APIError) {
      logger.debug('Expected API Exception', { data: exception });
    } else if (exception instanceof HttpException) {
      logger.warn('Unexpected HttpException', { data: exception });
      apiError = this.transformHttpExceptionToAPIError(exception);
    } else {
      logger.error('Exception', { data: { message: exception.message, stack: exception.stack } });
      apiError = this.transformToAPIError(exception);
    }

    const status = apiError.getStatus();
    const rsp = {
      alias: apiError.alias,
      code: apiError.status,
      message: apiError.message,
      stack: apiError.stack,
      timestamp: new Date().toISOString(),
      data: apiError.data,
    };
    response.status(status).json(rsp);
  }

  private transformHttpExceptionToAPIError(exception: HttpException): APIError {
    let errMessage: any = isProdEnv ? 'Unknown error' : exception.message;

    if (errMessage.message) {
      errMessage = errMessage.message;
    }

    const convertedError = new APIError({
      alias: APIErrorAlias.Unknown,
      message: errMessage,
      stack: exception.stack,
      status: exception.getStatus() || HttpStatus.INTERNAL_SERVER_ERROR,
      // data: exception.data,
    });
    return convertedError;
  }

  private transformToAPIError(exception: any): APIError {
    const convertedError = new APIError({
      alias: APIErrorAlias.Unknown,
      message: exception.message,
      stack: exception.stack,
      status: exception.status || HttpStatus.INTERNAL_SERVER_ERROR,
      data: exception.data,
    });
    return convertedError;
  }
}
