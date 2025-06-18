import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { StandardResponseDto } from '../dto/response.dto';

export const SKIP_RESPONSE_TRANSFORM = 'skipResponseTransform';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, StandardResponseDto<T>>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponseDto<T>> {
    // Check if response transformation should be skipped
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_TRANSFORM,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        // If data is already in the standard format, return as is
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'message' in data
        ) {
          return data;
        }

        // Otherwise, wrap the response
        return {
          success: statusCode >= 200 && statusCode < 300,
          message: this.getDefaultMessage(statusCode),
          data,
          status: statusCode,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }

  private getDefaultMessage(statusCode: number): string {
    switch (statusCode) {
      case 200:
        return 'Operation completed successfully';
      case 201:
        return 'Resource created successfully';
      case 204:
        return 'Operation completed successfully';
      default:
        return 'Request processed successfully';
    }
  }
}
