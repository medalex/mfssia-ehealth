import {
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Injectable,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { map } from 'rxjs/operators';
  import { RCode } from '../constants/rcode.constant';

  export type ResponseShape<T = unknown> = {
    data: T | {};
    code: number;
    msg: string | null;
  };
  
  @Injectable()
  export class ResponseInterceptor implements NestInterceptor {
    intercept(
      _context: ExecutionContext,
      next: CallHandler<any>,
    ): Observable<ResponseShape> {
      return next.handle().pipe(
        map(content => {
          if (content && typeof content === 'object' && !Array.isArray(content)) {
          const maybe = content as Record<string, any>;
          return {
            data: Object.prototype.hasOwnProperty.call(maybe, 'data')
              ? maybe.data
              : maybe, 
            code: maybe.code ?? RCode.OK,
            msg: maybe.msg ?? null,
          } as ResponseShape;
        }
        }),
      );
    }
  }
  