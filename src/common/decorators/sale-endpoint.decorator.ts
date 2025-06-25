import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import {
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '../../permissions/enums/permission.enum';

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
    timestamp: { type: 'string', example: '2025-06-25T10:20:00.000Z' },
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
    timestamp: { type: 'string', example: '2025-06-25T10:20:00.000Z' },
  },
});

const errorResponseSchema = (status: number, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: message },
    data: { type: 'null' },
    status: { type: 'number', example: status },
    timestamp: { type: 'string', example: '2025-06-25T10:20:00.000Z' },
  },
});

const standardErrorResponses = () => [
  ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: errorResponseSchema(400, 'Validation failed or invalid request'),
  }),
  ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: errorResponseSchema(401, 'Authentication required'),
  }),
  ApiResponse({
    status: 403,
    description: 'Forbidden',
    schema: errorResponseSchema(403, 'Insufficient permissions'),
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

export const SaleEndpoint = {
  // Customer Management Endpoints
  CreateCustomer: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales - Customers'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Create a new customer',
        description: 'Creates a new customer record with automatic balance sheet initialization'
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Customer created successfully',
        schema: createdResponseSchema('Customer created successfully', {
          id: 'uuid',
          customerName: 'John Doe',
          phoneNumber: '+1234567890',
          customerAddress: '123 Main St',
          storeId: 'store-uuid',
          clientId: 'client-uuid',
          createdAt: '2025-06-25T10:20:00.000Z'
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.CREATE),
    ),

  FindCustomerByPhone: () =>
    applyDecorators(
      ApiTags('Sales - Customers'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Find customer by phone number',
        description: 'Retrieves customer information and current balance by phone number'
      }),
      ApiParam({ name: 'phoneNumber', description: 'Customer phone number' }),
      ApiResponse({
        status: 200,
        description: 'Customer found successfully',
        schema: successResponseSchema('Customer found successfully', {
          id: 'uuid',
          customerName: 'John Doe',
          phoneNumber: '+1234567890',
          balanceSheets: [{ remainingAmount: 150.00 }]
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.READ),
    ),

  UpdateCustomer: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales - Customers'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Update customer information',
        description: 'Updates customer details (name, address, contact info)'
      }),
      ApiParam({ name: 'customerId', description: 'Customer ID' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Customer updated successfully',
        schema: successResponseSchema('Customer updated successfully'),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.UPDATE),
    ),

  GetCustomers: () =>
    applyDecorators(
      ApiTags('Sales - Customers'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Get all customers for a store',
        description: 'Retrieves paginated list of customers with balance information'
      }),
      ApiQuery({ name: 'storeId', description: 'Store ID' }),
      ApiQuery({ name: 'page', description: 'Page number', required: false }),
      ApiQuery({ name: 'limit', description: 'Items per page', required: false }),
      ApiResponse({
        status: 200,
        description: 'Customers retrieved successfully',
        schema: successResponseSchema('Customers retrieved successfully', {
          customers: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.READ),
    ),

  GetCustomerBalance: () =>
    applyDecorators(
      ApiTags('Sales - Customers'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Get customer balance and payment history',
        description: 'Retrieves customer balance sheet and payment history'
      }),
      ApiParam({ name: 'customerId', description: 'Customer ID' }),
      ApiResponse({
        status: 200,
        description: 'Balance retrieved successfully',
        schema: successResponseSchema('Balance retrieved successfully', {
          customer: { id: 'uuid', customerName: 'John Doe' },
          currentBalance: 150.00,
          totalPaid: 850.00,
          balanceHistory: []
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.READ),
    ),

  // Sale Management Endpoints
  CreateSale: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales - Transactions'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Create a new sale',
        description: 'Creates a new sale with automatic inventory updates, customer creation/lookup, and invoice generation'
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Sale created successfully',
        schema: createdResponseSchema('Sale created successfully', {
          sale: { id: 'uuid', totalAmount: 250.00, status: 'COMPLETED' },
          customer: { id: 'uuid', customerName: 'John Doe' },
          invoice: { id: 'uuid', invoiceNumber: 'INV-20250625-0001' }
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.CREATE),
    ),

  GetSales: () =>
    applyDecorators(
      ApiTags('Sales - Transactions'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Get all sales with filtering options',
        description: 'Retrieves paginated list of sales with various filtering options'
      }),
      ApiQuery({ name: 'storeId', description: 'Store ID' }),
      ApiQuery({ name: 'page', description: 'Page number', required: false }),
      ApiQuery({ name: 'limit', description: 'Items per page', required: false }),
      ApiQuery({ name: 'customerId', description: 'Filter by customer ID', required: false }),
      ApiQuery({ name: 'status', description: 'Filter by sale status', required: false }),
      ApiQuery({ name: 'paymentMethod', description: 'Filter by payment method', required: false }),
      ApiQuery({ name: 'dateFrom', description: 'Filter from date (ISO string)', required: false }),
      ApiQuery({ name: 'dateTo', description: 'Filter to date (ISO string)', required: false }),
      ApiResponse({
        status: 200,
        description: 'Sales retrieved successfully',
        schema: successResponseSchema('Sales retrieved successfully', {
          sales: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.READ),
    ),

  GetSaleById: () =>
    applyDecorators(
      ApiTags('Sales - Transactions'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Get sale by ID with full details',
        description: 'Retrieves complete sale information including customer, items, invoices, and returns'
      }),
      ApiParam({ name: 'saleId', description: 'Sale ID' }),
      ApiResponse({
        status: 200,
        description: 'Sale retrieved successfully',
        schema: successResponseSchema('Sale retrieved successfully', {
          id: 'uuid',
          customer: { customerName: 'John Doe' },
          saleItems: [],
          invoices: [],
          returns: []
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.READ),
    ),

  UpdateSale: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales - Transactions'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Update sale information',
        description: 'Updates sale details such as status, payment method, or amounts'
      }),
      ApiParam({ name: 'saleId', description: 'Sale ID' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Sale updated successfully',
        schema: successResponseSchema('Sale updated successfully'),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.UPDATE),
    ),

  DeleteSale: () =>
    applyDecorators(
      ApiTags('Sales - Transactions'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Delete sale and restore inventory',
        description: 'Deletes a sale and automatically restores inventory quantities'
      }),
      ApiParam({ name: 'saleId', description: 'Sale ID' }),
      ApiResponse({
        status: 200,
        description: 'Sale deleted successfully',
        schema: successResponseSchema('Sale deleted successfully'),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.DELETE),
    ),

  // Return Management Endpoints
  CreateSaleReturn: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales - Returns'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Process a sale return',
        description: 'Processes returns with automatic inventory adjustment based on return category (SALEABLE, NON_SALEABLE, SCRAP)'
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Return processed successfully',
        schema: createdResponseSchema('Return processed successfully', {
          id: 'uuid',
          saleId: 'sale-uuid',
          productId: 'product-uuid',
          quantity: 2,
          returnCategory: 'SALEABLE'
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.CREATE),
    ),

  // Payment Management Endpoints
  CreatePayment: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales - Payments'),
      ApiBearerAuth(),
      ApiOperation({ 
        summary: 'Record a customer payment',
        description: 'Records customer payment and updates balance sheet automatically'
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Payment recorded successfully',
        schema: createdResponseSchema('Payment recorded successfully', {
          id: 'uuid',
          customerId: 'customer-uuid',
          amountPaid: 100.00,
          remainingAmount: 50.00,
          paymentStatus: 'PARTIAL'
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.CREATE),
    ),
};
