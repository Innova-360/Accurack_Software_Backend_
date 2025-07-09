import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Version } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

// Standard response schemas
const successResponseSchema = (message: string, dataExample?: any) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: message },
    data: dataExample
      ? { type: 'object', example: dataExample }
      : { type: 'object' },
    status: { type: 'number', example: 200 },
    timestamp: { type: 'string', example: '2025-07-05T10:30:00.000Z' },
  },
});

const errorResponseSchema = (status: number, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: message },
    status: { type: 'number', example: status },
    timestamp: { type: 'string', example: '2025-07-05T10:30:00.000Z' },
  },
});

// Standard error responses for validator endpoints
const standardErrorResponses = () => [
  ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: errorResponseSchema(400, 'Invalid request data'),
  }),
  ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: errorResponseSchema(401, 'Authentication required'),
  }),
  ApiResponse({
    status: 403,
    description: 'Forbidden',
    schema: errorResponseSchema(403, 'User is not authorized as a validator'),
  }),
  ApiResponse({
    status: 404,
    description: 'Not Found',
    schema: errorResponseSchema(404, 'Resource not found'),
  }),
  ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    schema: errorResponseSchema(500, 'Internal server error'),
  }),
];

export const ValidatorEndpoint = {
  // Get orders for validation endpoint
  GetOrdersForValidation: () =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Get orders pending validation',
        description: 'Retrieve all orders that are sent for validation and pending approval by a validator'
      }),
      ApiResponse({
        status: 200,
        description: 'Orders retrieved successfully',
        schema: successResponseSchema('Orders retrieved successfully', [
          {
            id: 'order-123',
            totalAmount: 150.50,
            status: 'SENT_FOR_VALIDATION',
            paymentMethod: 'cash',
            customer: {
              id: 'customer-456',
              customerName: 'John Doe',
              phoneNumber: '+1234567890',
              customerMail: 'john@example.com'
            },
            createdAt: '2025-07-05T10:30:00.000Z',
            updatedAt: '2025-07-05T10:30:00.000Z'
          }
        ]),
      }),
      ...standardErrorResponses(),
      UseGuards(JwtAuthGuard),
      ApiBearerAuth(),
      Version('1'),
    ),

  // Update payment endpoint
  UpdatePayment: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Update payment amount for an order',
        description: 'Allow validators to update the payment amount for orders before validation'
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Payment updated successfully',
        schema: successResponseSchema('Payment updated successfully', {
          id: 'order-123',
          totalAmount: 175.00,
          status: 'SENT_FOR_VALIDATION',
          customer: {
            id: 'customer-456',
            customerName: 'John Doe',
            phoneNumber: '+1234567890'
          },
          updatedAt: '2025-07-05T10:30:00.000Z'
        }),
      }),
      ...standardErrorResponses(),
      UseGuards(JwtAuthGuard),
      ApiBearerAuth(),
      Version('1'),
    ),

  // Validate order endpoint
  ValidateOrder: () =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Validate an order',
        description: 'Mark an order as validated and update balance sheet accordingly'
      }),
      ApiResponse({
        status: 200,
        description: 'Order validated successfully',
        schema: successResponseSchema('Order validated successfully', {
          id: 'order-123',
          status: 'VALIDATED',
          validatorId: 'validator-789',
          totalAmount: 175.00,
          customer: {
            id: 'customer-456',
            customerName: 'John Doe'
          },
          updatedAt: '2025-07-05T10:30:00.000Z'
        }),
      }),
      ...standardErrorResponses(),
      UseGuards(JwtAuthGuard),
      ApiBearerAuth(),
      Version('1'),
    ),

  // Get validator orders (alternative endpoint)
  GetValidatorOrders: () =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Get all orders handled by validator',
        description: 'Retrieve all orders that have been validated by the current validator'
      }),
      ApiResponse({
        status: 200,
        description: 'Validator orders retrieved successfully',
        schema: successResponseSchema('Validator orders retrieved successfully', [
          {
            id: 'order-123',
            status: 'VALIDATED',
            totalAmount: 175.00,
            validatorId: 'validator-789',
            createdAt: '2025-07-05T10:30:00.000Z',
            validatedAt: '2025-07-05T11:00:00.000Z'
          }
        ]),
      }),
      ...standardErrorResponses(),
      UseGuards(JwtAuthGuard),
      ApiBearerAuth(),
      Version('1'),
    ),

  // Get validation statistics
  GetValidationStats: () =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Get validation statistics',
        description: 'Get statistics about validation activities for the current validator'
      }),
      ApiResponse({
        status: 200,
        description: 'Validation statistics retrieved successfully',
        schema: successResponseSchema('Validation statistics retrieved successfully', {
          totalValidated: 150,
          pendingValidation: 25,
          todayValidated: 12,
          totalAmountValidated: 45750.50,
          averageValidationTime: '00:05:30'
        }),
      }),
      ...standardErrorResponses(),
      UseGuards(JwtAuthGuard),
      ApiBearerAuth(),
      Version('1'),
    ),

  // Reject order endpoint
  RejectOrder: () =>
    applyDecorators(
      ApiOperation({
        summary: 'Reject an order',
        description: 'Mark an order as rejected by a validator'
      }),
      ApiParam({
        name: 'id',
        description: 'Order ID to reject',
        type: String,
        example: 'order-123',
      }),
      ApiResponse({
        status: 200,
        description: 'Order rejected successfully',
        schema: successResponseSchema('Order rejected successfully', {
          id: 'order-123',
          status: 'REJECTED',
          totalAmount: 175.00,
          customer: {
            id: 'customer-456',
            customerName: 'John Doe'
          },
          updatedAt: '2025-07-05T10:30:00.000Z'
        }),
      }),
      ...standardErrorResponses(),
      UseGuards(JwtAuthGuard),
      ApiBearerAuth(),
      Version('1'),
    ),
};