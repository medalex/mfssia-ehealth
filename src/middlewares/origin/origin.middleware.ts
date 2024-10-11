/* eslint-disable prettier/prettier */
/**
 * @file Origin middleware
 * @module middleware/origin
 */

 import { Request, Response } from 'express'
 import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common'
 import { HttpResponseError, ResponseStatus } from '../../interfaces/IResponse'
 import { isProdEnv } from '../../app.environment'
 import * as TEXT from '../../constants/text.constant'
 
 export const CROSS_DOMAIN = {
    allowedOrigins: ['http://localhost:40001'],
    allowedReferer: 'brgserver.me',
  }

 /**
  * @class OriginMiddleware
  * @classdesc Used to verify whether it is an illegal origin request
  */
 @Injectable()
 export class OriginMiddleware implements NestMiddleware {
   use(request: Request, response: Response, next) {
     // referer when production
     if (isProdEnv) {
       const { origin, referer } = request.headers
       const isAllowed = (field) => !field || field.includes(CROSS_DOMAIN.allowedReferer)
       const isAllowedOrigin = isAllowed(origin)
       const isAllowedReferer = isAllowed(referer)
       if (!isAllowedOrigin && !isAllowedReferer) {
         return response.status(HttpStatus.UNAUTHORIZED).jsonp({
           status: ResponseStatus.Error,
           message: TEXT.HTTP_ANONYMOUS_TEXT,
           error: null,
         } as HttpResponseError)
       }
     }
 
     return next()
   }
 }
 