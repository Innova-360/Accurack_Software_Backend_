import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

// Standard success response decorator
export function ApiSuccessResponse(description: string, example?: any) {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: description },
          data: example ? { type: 'object', example } : { type: 'object' },
          status: { type: 'number', example: 200 },
          timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
        },
      },
    }),
  );
}

// Standard created response decorator
export function ApiCreatedResponse(description: string, example?: any) {
  return applyDecorators(
    ApiResponse({
      status: 201,
      description,
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: description },
          data: example ? { type: 'object', example } : { type: 'object' },
          status: { type: 'number', example: 201 },
          timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
        },
      },
    }),
  );
}

// Standard error responses decorator
export function ApiErrorResponses() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Bad Request',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Bad request' },
          data: { type: 'null' },
          status: { type: 'number', example: 400 },
          timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Unauthorized' },
          data: { type: 'null' },
          status: { type: 'number', example: 401 },
          timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Internal server error' },
          data: { type: 'null' },
          status: { type: 'number', example: 500 },
          timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
        },
      },
    }),
  );
}

// Combined decorator for auth endpoints
export function ApiAuthEndpoint(
  successDescription: string,
  successExample?: any,
) {
  return applyDecorators(
    ApiSuccessResponse(successDescription, successExample),
    ApiErrorResponses(),
  );
}
