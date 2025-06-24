import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { USE_MASTER_DB_KEY } from '../common/decorators/use-master-db.decorator';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Check if this endpoint should use master database
    const useMasterDB = this.reflector.getAllAndOverride<boolean>(USE_MASTER_DB_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (useMasterDB) {
      request._useMasterDB = true;
    }

    return next.handle();
  }
}
