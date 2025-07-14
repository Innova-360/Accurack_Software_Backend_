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
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Create a new customer',
        description:
          'Creates a new customer record with automatic balance sheet initialization',
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
          createdAt: '2025-06-25T10:20:00.000Z',
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.TRANSACTION,
        PermissionAction.CREATE,
      ),
    ),

  FindCustomerByPhone: () =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Find customer by phone number',
        description:
          'Retrieves customer information and current balance by phone number',
      }),
      ApiParam({ name: 'phoneNumber', description: 'Customer phone number' }),
      ApiResponse({
        status: 200,
        description: 'Customer found successfully',
        schema: successResponseSchema('Customer found successfully', {
          id: 'uuid',
          customerName: 'John Doe',
          phoneNumber: '+1234567890',
          balanceSheets: [{ remainingAmount: 150.0 }],
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.READ),
    ),

  UpdateCustomer: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Update customer information',
        description: 'Updates customer details (name, address, contact info)',
      }),
      ApiParam({ name: 'customerId', description: 'Customer ID' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Customer updated successfully',
        schema: successResponseSchema('Customer updated successfully'),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.TRANSACTION,
        PermissionAction.UPDATE,
      ),
    ),

  DeleteCustomer: () =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Delete customer and associated balance sheet',
        description:
          'Deletes customer record and associated balance sheet, restoring inventory if applicable',
      }),
      ApiParam({ name: 'customerId', description: 'Customer ID' }),
      ApiResponse({
        status: 200,
        description: 'Customer deleted successfully',
        schema: successResponseSchema('Customer deleted successfully'),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.TRANSACTION,
        PermissionAction.DELETE,
      ),
    ),

  GetCustomers: () =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Get all customers for a store',
        description:
          'Retrieves paginated list of customers with balance information',
      }),
      ApiQuery({ name: 'storeId', description: 'Store ID' }),
      ApiQuery({ name: 'page', description: 'Page number', required: false }),
      ApiQuery({
        name: 'limit',
        description: 'Items per page',
        required: false,
      }),
      ApiQuery({
        name: 'search',
        description: 'Search query',
        required: false,
      }),
      ApiResponse({
        status: 200,
        description: 'Customers retrieved successfully',
        schema: successResponseSchema('Customers retrieved successfully', {
          customers: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.READ),
    ),

  GetCustomerBalance: () =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Get customer balance and payment history',
        description: 'Retrieves customer balance sheet and payment history',
      }),
      ApiParam({ name: 'customerId', description: 'Customer ID' }),
      ApiResponse({
        status: 200,
        description: 'Balance retrieved successfully',
        schema: successResponseSchema('Balance retrieved successfully', {
          customer: { id: 'uuid', customerName: 'John Doe' },
          currentBalance: 150.0,
          totalPaid: 850.0,
          balanceHistory: [],
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.READ),
    ),

  // Sale Management Endpoints
  CreateSale: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Create a new sale',
        description:
          'Creates a new sale with automatic inventory updates, customer creation/lookup, and invoice generation',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Sale created successfully',
        schema: createdResponseSchema('Sale created successfully', {
          sale: { id: 'uuid', totalAmount: 250.0, status: 'COMPLETED' },
          customer: { id: 'uuid', customerName: 'John Doe' },
          invoice: { id: 'uuid', invoiceNumber: 'INV-20250625-0001' },
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.TRANSACTION,
        PermissionAction.CREATE,
      ),
    ),

  SetSaleConfirmation: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales'), // Tags the endpoint under "Sales" in Swagger UI
      ApiOperation({
        summary: 'Set sale confirmation status',
        description:
          'Confirms or cancels a sale, updating its status and related data.',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Sale confirmation status updated successfully',
        schema: {
          type: 'object',
          properties: {
            sale: { type: 'object', description: 'Updated sale details' },
            invoice: {
              type: 'object',
              nullable: true,
              description: 'Generated invoice (if confirmed)',
            },
          },
        },
      }),
      ApiResponse({
        status: 400,
        description: 'Bad Request - Invalid input data',
      }),
      ApiResponse({
        status: 404,
        description: 'Not Found - Sale or related resources not found',
      }),
      ApiResponse({
        status: 500,
        description: 'Internal Server Error',
      }),
      ApiBody({
        description: 'Request body for setting sale confirmation status',
        type: 'object',
        examples: {
          pendingSale: {
            summary: 'Pending Sale Example',
            description: 'Example for pending sale status',
            value: {
              setStatus: 'PENDING',
              availableStatuses: ['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_RETURNED', 'PENDING_VALIDATION', 'VALIDATED', 'SENT_FOR_VALIDATION', 'CONFIRMED', 'SHIPPED'],
              sale: {
                id: 'sale_123',
                status: 'PENDING'
              }
            }
          },
          completedSale: {
            summary: 'Completed Sale Example',
            description: 'Example for completed sale status',
            value: {
              setStatus: 'COMPLETED',
              sale: {
                id: 'sale_123',
                status: 'COMPLETED'
              }
            }
          },
          cancelledSale: {
            summary: 'Cancelled Sale Example',
            description: 'Example for cancelled sale status',
            value: {
              setStatus: 'CANCELLED',
              sale: {
                id: 'sale_123',
                status: 'CANCELLED'
              }
            }
          },
          refundedSale: {
            summary: 'Refunded Sale Example',
            description: 'Example for refunded sale status',
            value: {
              setStatus: 'REFUNDED',
              sale: {
                id: 'sale_123',
                status: 'REFUNDED'
              }
            }
          },
          partiallyReturnedSale: {
            summary: 'Partially Returned Sale Example',
            description: 'Example for partially returned sale status',
            value: {
              setStatus: 'PARTIALLY_RETURNED',
              sale: {
                id: 'sale_123',
                status: 'PARTIALLY_RETURNED'
              }
            }
          },
          pendingValidationSale: {
            summary: 'Pending Validation Sale Example',
            description: 'Example for pending validation sale status',
            value: {
              setStatus: 'PENDING_VALIDATION',
              sale: {
                id: 'sale_123',
                status: 'PENDING_VALIDATION'
              }
            }
          },
          validatedSale: {
            summary: 'Validated Sale Example',
            description: 'Example for validated sale status',
            value: {
              setStatus: 'VALIDATED',
              sale: {
                id: 'sale_123',
                status: 'VALIDATED'
              }
            }
          },
          sentForValidationSale: {
            summary: 'Sent For Validation Sale Example',
            description: 'Example for sent for validation sale status',
            value: {
              setStatus: 'SENT_FOR_VALIDATION',
              sale: {
                id: 'sale_123',
                status: 'SENT_FOR_VALIDATION'
              }
            }
          },
          confirmedSale: {
            summary: 'Confirmed Sale Example',
            description: 'Example for confirmed sale status',
            value: {
              setStatus: 'CONFIRMED',
              sale: {
                id: 'sale_123',
                status: 'CONFIRMED'
              }
            }
          },
          shippedSale: {
            summary: 'Shipped Sale Example - UNCOMMITTED',
            description: 'Example for shipped sale status (uncommitted)',
            value: {
              setStatus: 'SHIPPED',
              sale: {
                id: 'sale_123',
                status: 'SHIPPED',
                note: 'This status is uncommitted and may change'
              }
            }
          }
        },
      }),
    ),

  GetSales: () =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Get all sales with filtering options',
        description:
          'Retrieves paginated list of sales with various filtering options',
      }),
      ApiQuery({ name: 'storeId', description: 'Store ID' }),
      ApiQuery({ name: 'page', description: 'Page number', required: false }),
      ApiQuery({
        name: 'limit',
        description: 'Items per page',
        required: false,
      }),
      ApiQuery({
        name: 'customerId',
        description: 'Filter by customer ID',
        required: false,
      }),
      ApiQuery({
        name: 'status',
        description: 'Filter by sale status',
        required: false,
      }),
      ApiQuery({
        name: 'paymentMethod',
        description: 'Filter by payment method',
        required: false,
      }),
      ApiQuery({
        name: 'dateFrom',
        description: 'Filter from date (ISO string)',
        required: false,
      }),
      ApiQuery({
        name: 'dateTo',
        description: 'Filter to date (ISO string)',
        required: false,
      }),
      ApiResponse({
        status: 200,
        description: 'Sales retrieved successfully',
        schema: successResponseSchema('Sales retrieved successfully', {
          sales: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.READ),
    ),

  GetSaleById: () =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Get sale by ID with full details',
        description:
          'Retrieves complete sale information including customer, items, invoices, and returns',
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
          returns: [],
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(PermissionResource.TRANSACTION, PermissionAction.READ),
    ),

  UpdateSale: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Update sale information',
        description:
          'Updates sale details such as status, payment method, or amounts',
      }),
      ApiParam({ name: 'saleId', description: 'Sale ID' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Sale updated successfully',
        schema: successResponseSchema('Sale updated successfully'),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.TRANSACTION,
        PermissionAction.UPDATE,
      ),
    ),

  DeleteSale: () =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Delete sale and restore inventory',
        description:
          'Deletes a sale and automatically restores inventory quantities',
      }),
      ApiParam({ name: 'saleId', description: 'Sale ID' }),
      ApiResponse({
        status: 200,
        description: 'Sale deleted successfully',
        schema: successResponseSchema('Sale deleted successfully'),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.TRANSACTION,
        PermissionAction.DELETE,
      ),
    ),

  DeleteAllSales: () =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Delete all sales for a store',
        description:
          'Deletes all sales for a store and cleans up associated file upload records. This will allow the same files to be uploaded again.',
      }),
      ApiQuery({ name: 'storeId', description: 'Store ID' }),
      ApiResponse({
        status: 200,
        description: 'All sales deleted successfully',
        schema: successResponseSchema('All sales deleted successfully'),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.TRANSACTION,
        PermissionAction.DELETE,
      ),
    ),

  // Return Management Endpoints
  CreateSaleReturn: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Process a sale return',
        description:
          'Processes returns with automatic inventory adjustment based on return category (SALEABLE, NON_SALEABLE, SCRAP)',
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
          returnCategory: 'SALEABLE',
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.TRANSACTION,
        PermissionAction.CREATE,
      ),
    ),



  GetReturnSales: () =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Fetch all sale returns for a store',
        description:
          'Retrieves all sale return records for a specified store, including sale details, sale items, customer details, and product details.',
      }),
      ApiResponse({
        status: 200,
        description: 'Sale returns retrieved successfully',
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'return-uuid-1' },
              saleId: { type: 'string', example: 'sale-uuid-1' },
              productId: { type: 'string', example: 'product-uuid-1' },
              pluUpc: { type: 'string', example: '123456789012' },
              quantity: { type: 'number', example: 2 },
              returnCategory: { type: 'string', example: 'SALEABLE' },
              reason: { type: 'string', example: 'Customer changed mind' },
              processedBy: { type: 'string', example: 'user-uuid-1' },
              createdAt: { type: 'string', example: '2025-07-08T15:30:00.000Z' },
              updatedAt: { type: 'string', example: '2025-07-08T15:30:00.000Z' },
              sale: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'sale-uuid-1' },
                  customerId: { type: 'string', example: 'customer-uuid-1' },
                  userId: { type: 'string', example: 'user-uuid-1' },
                  storeId: { type: 'string', example: 'store-uuid-1' },
                  clientId: { type: 'string', example: 'client-uuid-1' },
                  paymentMethod: { type: 'string', example: 'CREDIT_CARD' },
                  totalAmount: { type: 'number', example: 150.75 },
                  confirmation: { type: 'string', example: 'CONFIRMED' },
                  quantitySend: { type: 'number', example: 5 },
                  allowance: { type: 'number', example: 10.00 },
                  source: { type: 'string', example: 'manual' },
                  tax: { type: 'number', example: 12.50 },
                  status: { type: 'string', example: 'COMPLETED' },
                  generateInvoice: { type: 'boolean', example: true },
                  isProductReturned: { type: 'boolean', example: true },
                  cashierName: { type: 'string', example: 'John Smith' },
                  createdAt: { type: 'string', example: '2025-07-08T14:00:00.000Z' },
                  updatedAt: { type: 'string', example: '2025-07-08T15:30:00.000Z' },
                  customer: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'customer-uuid-1' },
                      customerName: { type: 'string', example: 'Jane Doe' },
                      customerAddress: { type: 'string', example: '123 Main St, Springfield' },
                      phoneNumber: { type: 'string', example: '+1234567890' },
                      telephoneNumber: { type: 'string', example: '+0987654321', nullable: true },
                      customerMail: { type: 'string', example: 'jane.doe@example.com', nullable: true },
                      website: { type: 'string', example: 'www.janedoe.com', nullable: true },
                      threshold: { type: 'number', example: 500.00 },
                      storeId: { type: 'string', example: 'store-uuid-1' },
                      clientId: { type: 'string', example: 'client-uuid-1' },
                      createdAt: { type: 'string', example: '2025-01-01T10:00:00.000Z' },
                      updatedAt: { type: 'string', example: '2025-07-01T12:00:00.000Z' },
                    },
                  },
                  saleItems: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', example: 'sale-item-uuid-1' },
                        saleId: { type: 'string', example: 'sale-uuid-1' },
                        productId: { type: 'string', example: 'product-uuid-1' },
                        pluUpc: { type: 'string', example: '123456789012' },
                        productName: { type: 'string', example: 'Wireless Mouse' },
                        quantity: { type: 'number', example: 2 },
                        sellingPrice: { type: 'number', example: 25.00 },
                        totalPrice: { type: 'number', example: 50.00 },
                        createdAt: { type: 'string', example: '2025-07-08T14:00:00.000Z' },
                        updatedAt: { type: 'string', example: '2025-07-08T14:00:00.000Z' },
                        product: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', example: 'product-uuid-1' },
                            name: { type: 'string', example: 'Wireless Mouse' },
                            categoryId: { type: 'string', example: 'category-uuid-1', nullable: true },
                            ean: { type: 'string', example: '1234567890123', nullable: true },
                            pluUpc: { type: 'string', example: '123456789012', nullable: true },
                            sku: { type: 'string', example: 'WM123', nullable: true },
                            itemQuantity: { type: 'number', example: 50 },
                            msrpPrice: { type: 'number', example: 30.00 },
                            singleItemSellingPrice: { type: 'number', example: 25.00 },
                            clientId: { type: 'string', example: 'client-uuid-1' },
                            storeId: { type: 'string', example: 'store-uuid-1' },
                            discountAmount: { type: 'number', example: 5.00 },
                            percentDiscount: { type: 'number', example: 10.00 },
                            hasVariants: { type: 'boolean', example: false },
                            packIds: { type: 'array', items: { type: 'string' }, example: [] },
                            variants: { type: 'array', items: { type: 'object' }, example: [] },
                            createdAt: { type: 'string', example: '2025-01-01T09:00:00.000Z' },
                            updatedAt: { type: 'string', example: '2025-07-08T15:30:00.000Z' },
                          },
                        },
                      },
                    },
                  },
                  client: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'client-uuid-1' },
                      name: { type: 'string', example: 'Tech Retail Inc.' },
                    },
                  },
                  store: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'store-uuid-1' },
                      name: { type: 'string', example: 'Downtown Tech Store' },
                    },
                  },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'user-uuid-1' },
                      name: { type: 'string', example: 'John Smith' },
                      },
                    },
                  },
                },
              product: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'product-uuid-1' },
                  name: { type: 'string', example: 'Wireless Mouse' },
                  categoryId: { type: 'string', example: 'category-uuid-1', nullable: true },
                  ean: { type: 'string', example: '1234567890123', nullable: true },
                  pluUpc: { type: 'string', example: '123456789012', nullable: true },
                  sku: { type: 'string', example: 'WM123', nullable: true },
                  itemQuantity: { type: 'number', example: 50 },
                  msrpPrice: { type: 'number', example: 30.00 },
                  singleItemSellingPrice: { type: 'number', example: 25.00 },
                  clientId: { type: 'string', example: 'client-uuid-1' },
                  storeId: { type: 'string', example: 'store-uuid-1' },
                  discountAmount: { type: 'number', example: 5.00 },
                  percentDiscount: { type: 'number', example: 10.00 },
                  hasVariants: { type: 'boolean', example: false },
                  packIds: { type: 'array', items: { type: 'string' }, example: [] },
                  variants: { type: 'array', items: { type: 'object' }, example: [] },
                  createdAt: { type: 'string', example: '2025-01-01T09:00:00.000Z' },
                  updatedAt: { type: 'string', example: '2025-07-08T15:30:00.000Z' },
                },
              },
            },
          },
        },
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.TRANSACTION,
        PermissionAction.READ,
      ),
    ),

  // Payment Management Endpoints
  CreatePayment: (dtoType: any) =>
    applyDecorators(
      ApiTags('Sales'),
      ApiBearerAuth(),
      ApiOperation({
        summary: 'Record a customer payment',
        description:
          'Records customer payment and updates balance sheet automatically',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Payment recorded successfully',
        schema: createdResponseSchema('Payment recorded successfully', {
          id: 'uuid',
          customerId: 'customer-uuid',
          amountPaid: 100.0,
          remainingAmount: 50.0,
          paymentStatus: 'PARTIAL',
        }),
      }),
      ...standardErrorResponses(),
      RequirePermissions(
        PermissionResource.TRANSACTION,
        PermissionAction.CREATE,
      ),
    ),
};
