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

const createdResponseSchema = (message: string, dataExample?: any) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: message },
    data: dataExample
      ? { type: 'object', example: dataExample }
      : { type: 'object' },
    status: { type: 'number', example: 201 },
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

// Standard error responses for driver endpoints
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
    schema: errorResponseSchema(403, 'User is not authorized as a driver'),
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

export const DriverEndpoint = {
  // Create order endpoint
  CreateOrder: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Create a new order',
        description: 'Create a new order/sale entry for a customer. Driver must be authenticated and authorized.'
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Order created successfully',
        schema: createdResponseSchema('Order created successfully', {
          id: 'order-123',
          customerId: 'customer-456',
          userId: 'driver-789',
          cashierName: 'John Driver',
          totalAmount: 150.50,
          paymentMethod: 'cash',
          quantitySend: 5,
          status: 'PENDING',
          storeId: 'store-101',
          clientId: 'client-202',
          customer: {
            id: 'customer-456',
            customerName: 'Jane Doe',
            phoneNumber: '+1234567890',
            customerMail: 'jane@example.com'
          },
          createdAt: '2025-07-05T10:30:00.000Z',
          updatedAt: '2025-07-05T10:30:00.000Z'
        }),
      }),
      ...standardErrorResponses(),
      UseGuards(JwtAuthGuard),
      ApiBearerAuth(),
      Version('1'),
    ),

  // Update order endpoint
  UpdateOrder: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Update an existing order',
        description: 'Update order details such as status, total amount, and payment method. Driver must be authenticated and authorized.'
      }),
      ApiParam({
        name: 'id',
        description: 'The unique identifier of the order to update',
        type: 'string',
        format: 'uuid',
        example: 'order-123'
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Order updated successfully',
        schema: successResponseSchema('Order updated successfully', {
          id: 'order-123',
          status: 'COMPLETED',
          totalAmount: 175.00,
          paymentMethod: 'card',
          customer: {
            id: 'customer-456',
            customerName: 'Jane Doe',
            phoneNumber: '+1234567890'
          },
          updatedAt: '2025-07-05T11:00:00.000Z'
        }),
      }),
      ...standardErrorResponses(),
      UseGuards(JwtAuthGuard),
      ApiBearerAuth(),
      Version('1'),
    ),

  // Get orders endpoint
  GetOrders: () =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Get driver orders',
        description: 'Retrieve all orders associated with the authenticated driver'
      }),
      ApiResponse({
        status: 200,
        description: 'Orders retrieved successfully',
        schema: successResponseSchema('Orders retrieved successfully', [
          {
            id: 'order-123',
            customerId: 'customer-456',
            totalAmount: 150.50,
            status: 'PENDING',
            paymentMethod: 'cash',
            quantitySend: 5,
            customer: {
              id: 'customer-456',
              customerName: 'Jane Doe',
              phoneNumber: '+1234567890',
              customerMail: 'jane@example.com'
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

  // Send for validation endpoint
  SendForValidation: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Send order for validation',
        description: 'Submit an order for validation by changing its status to SENT_FOR_VALIDATION'
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Order sent for validation successfully',
        schema: successResponseSchema('Order sent for validation successfully', {
          id: 'order-123',
          status: 'SENT_FOR_VALIDATION',
          totalAmount: 150.50,
          customerId: 'customer-456',
          updatedAt: '2025-07-05T11:00:00.000Z'
        }),
      }),
      ...standardErrorResponses(),
      UseGuards(JwtAuthGuard),
      ApiBearerAuth(),
      Version('1'),
    ),

  // Get driver statistics (additional endpoint)
  GetDriverStats: () =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Get driver statistics',
        description: 'Get performance statistics for the authenticated driver'
      }),
      ApiResponse({
        status: 200,
        description: 'Driver statistics retrieved successfully',
        schema: successResponseSchema('Driver statistics retrieved successfully', {
          totalOrders: 45,
          pendingOrders: 8,
          completedOrders: 32,
          sentForValidation: 5,
          totalSalesAmount: 12750.50,
          todayOrders: 3,
          thisWeekOrders: 15,
          averageOrderValue: 283.34
        }),
      }),
      ...standardErrorResponses(),
      UseGuards(JwtAuthGuard),
      ApiBearerAuth(),
      Version('1'),
    ),

  // Get order details endpoint
  GetOrderDetails: () =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Get order details by ID',
        description: 'Retrieve detailed information about a specific order'
      }),
      ApiParam({
        name: 'orderId',
        description: 'The unique identifier of the order',
        type: 'string',
        format: 'uuid',
        example: 'order-123'
      }),
      ApiResponse({
        status: 200,
        description: 'Order details retrieved successfully',
        schema: successResponseSchema('Order details retrieved successfully', {
          id: 'order-123',
          customerId: 'customer-456',
          userId: 'driver-789',
          cashierName: 'John Driver',
          totalAmount: 150.50,
          paymentMethod: 'cash',
          quantitySend: 5,
          status: 'PENDING',
          storeId: 'store-101',
          customer: {
            id: 'customer-456',
            customerName: 'Jane Doe',
            phoneNumber: '+1234567890',
            customerMail: 'jane@example.com',
            address: '123 Main St, City'
          },
          createdAt: '2025-07-05T10:30:00.000Z',
          updatedAt: '2025-07-05T10:30:00.000Z'
        }),
      }),
      ...standardErrorResponses(),
      UseGuards(JwtAuthGuard),
      ApiBearerAuth(),
      Version('1'),
    ),

  // Get all drivers endpoint
  GetDrivers: () =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Get all drivers',
        description: 'Retrieve a list of all drivers in the system. Only accessible by admins and managers.'
      }),
      ApiResponse({
        status: 200,
        description: 'Drivers retrieved successfully',
        schema: successResponseSchema('Drivers retrieved successfully', [
          {
            id: 'driver-123',
            firstName: 'John',
            lastName: 'Driver',
            email: 'john.driver@example.com',
            position: 'driver',
            status: 'active',
            clientId: 'client-456',
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
};
