/* eslint-disable prettier/prettier */
/**
 * @file HttpException filter
 * @module filter/error
 */

 import * as lodash from 'lodash'
 import { ExceptionFilter, Catch, HttpException, ArgumentsHost, HttpStatus } from '@nestjs/common'
 import { ResponseStatus, HttpResponseError, ExceptionInfo } from '../interfaces/IResponse'
 import { UNDEFINED } from '../constants/value.constant'
 import { isDevEnv } from '../app.environment'
 
 /**
  * @class HttpExceptionFilter
  * @classdesc Intercept all exceptions thrown globally, and any errors will be normalized output here HttpErrorResponse
  */
 @Catch()
 export class HttpExceptionFilter implements ExceptionFilter {
   catch(exception: HttpException, host: ArgumentsHost) {
     const request = host.switchToHttp().getRequest()
     const response = host.switchToHttp().getResponse()
     const exceptionStatus = exception.getStatus() || HttpStatus.INTERNAL_SERVER_ERROR
     const errorResponse: ExceptionInfo | any = exception.getResponse() as ExceptionInfo
     const errorMessage = lodash.isString(errorResponse) ? errorResponse : errorResponse.message
     const errorInfo = lodash.isString(errorResponse) ? null : errorResponse.error
 
     const data: HttpResponseError | any = {
       code: exceptionStatus,
       status: ResponseStatus.Error,
       message: errorMessage,
       path: request.url,
       timestamp: new Date().toISOString(),
       error: errorInfo?.message || (lodash.isString(errorInfo) ? errorInfo : JSON.stringify(errorInfo)),
       debug: isDevEnv ? errorInfo?.stack || exception.stack : UNDEFINED,
     }
 
     // default 404
     if (exceptionStatus === HttpStatus.NOT_FOUND) {
       data.error = data.error || `Not found`
       data.message = data.message || `Invalid API: ${request.method} > ${request.url}`
     }
 
     return response.status(errorInfo?.status || exceptionStatus).jsonp(data)
   }
 }
 