import { Injectable } from '@nestjs/common';
import { StandardResponseDto, PaginationMetaDto } from '../dto/response.dto';

@Injectable()
export class ResponseService {
  /**
   * Create a successful response
   */
  success<T>(
    message: string,
    data?: T,
    status: number = 200,
    meta?: PaginationMetaDto,
  ): StandardResponseDto<T> {
    return {
      success: true,
      message,
      data,
      status,
      timestamp: new Date().toISOString(),
      ...(meta && { meta }),
    };
  }

  /**
   * Create an error response
   */
  error(
    message: string,
    status: number = 400,
    error?: string,
  ): StandardResponseDto<null> {
    return {
      success: false,
      message,
      data: null,
      status,
      timestamp: new Date().toISOString(),
      ...(error && { error }),
    };
  }

  /**
   * Create a paginated response
   */
  paginated<T>(
    message: string,
    data: T[],
    meta: PaginationMetaDto,
    status: number = 200,
  ): StandardResponseDto<T[]> {
    return {
      success: true,
      message,
      data,
      status,
      timestamp: new Date().toISOString(),
      meta,
    };
  }

  /**
   * Create a response for created resources
   */
  created<T>(message: string, data: T): StandardResponseDto<T> {
    return this.success(message, data, 201);
  }

  /**
   * Create a response for updated resources
   */
  updated<T>(message: string, data?: T): StandardResponseDto<T> {
    return this.success(message, data, 200);
  }

  /**
   * Create a response for deleted resources
   */
  deleted(
    message: string = 'Resource deleted successfully',
  ): StandardResponseDto<null> {
    return this.success(message, null, 200);
  }

  /**
   * Create a not found response
   */
  notFound(message: string = 'Resource not found'): StandardResponseDto<null> {
    return this.error(message, 404);
  }

  /**
   * Create an unauthorized response
   */
  unauthorized(
    message: string = 'Unauthorized access',
  ): StandardResponseDto<null> {
    return this.error(message, 401);
  }

  /**
   * Create a forbidden response
   */
  forbidden(message: string = 'Access forbidden'): StandardResponseDto<null> {
    return this.error(message, 403);
  }
}
