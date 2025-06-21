import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../decorators/permissions.decorator';
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
    timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
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
    timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
  },
});

const errorResponseSchema = (status: number, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: message },
    data: { type: 'null' },
    status: { type: 'number', example: status },
    timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
  },
});

// Common error responses
const standardErrorResponses = () => [
  ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: errorResponseSchema(400, 'Bad request'),
  }),
  ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: errorResponseSchema(401, 'Unauthorized'),
  }),
  ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    schema: errorResponseSchema(500, 'Internal server error'),
  }),
];

// Supplier endpoint decorators
export const SupplierEndpoint = {
  CreateSupplier: (dtoType: any) =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.SUPPLIER,
        PermissionAction.CREATE,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Create a new supplier',
        description:
          'Creates a new supplier for the specified store. Only users with supplier creation permissions can create suppliers.',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Supplier created successfully',
        schema: createdResponseSchema('Supplier created successfully', {
          id: 'uuid-supplier-id',
          supplier_id: 'SUP-001',
          name: 'ABC Suppliers Ltd',
          email: 'supplier@example.com',
          phone: '+1-555-123-4567',
          address: '123 Main St, City, State 12345',
          storeId: 'uuid-store-id',
          status: 'active',
          createdAt: '2025-06-21T10:30:00.000Z',
          updatedAt: '2025-06-21T10:30:00.000Z',
          store: {
            id: 'uuid-store-id',
            name: 'Main Store',
          },
        }),
      }),
      ApiResponse({
        status: 403,
        description: 'Forbidden - insufficient permissions',
        schema: errorResponseSchema(
          403,
          'Insufficient permissions to create suppliers',
        ),
      }),
      ApiResponse({
        status: 400,
        description:
          'Bad Request - Validation failed or supplier_id already exists',
        schema: errorResponseSchema(
          400,
          'Supplier with this supplier_id already exists',
        ),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  GetSuppliers: () =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.SUPPLIER,
        PermissionAction.READ,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Get all suppliers',
        description:
          'Retrieves all suppliers for the stores accessible to the user.',
      }),
      ApiQuery({
        name: 'storeId',
        required: false,
        type: 'string',
        description: 'Filter by specific store ID',
        example: 'uuid-store-id',
      }),
      ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number for pagination (default: 1)',
        example: 1,
      }),
      ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of items per page (default: 10)',
        example: 10,
      }),
      ApiResponse({
        status: 200,
        description: 'Suppliers retrieved successfully',
        schema: successResponseSchema('Suppliers retrieved successfully', {
          suppliers: [
            {
              id: 'uuid-supplier-id-1',
              supplier_id: 'SUP-001',
              name: 'ABC Suppliers Ltd',
              email: 'supplier@example.com',
              phone: '+1-555-123-4567',
              address: '123 Main St, City, State 12345',
              storeId: 'uuid-store-id',
              status: 'active',
              createdAt: '2025-06-21T10:30:00.000Z',
              updatedAt: '2025-06-21T10:30:00.000Z',
              store: {
                id: 'uuid-store-id',
                name: 'Main Store',
              },
            },
            {
              id: 'uuid-supplier-id-2',
              supplier_id: 'SUP-002',
              name: 'XYZ Trading Co',
              email: 'contact@xyz-trading.com',
              phone: '+1-555-987-6543',
              address: '456 Oak Ave, City, State 67890',
              storeId: 'uuid-store-id',
              status: 'active',
              createdAt: '2025-06-20T15:45:00.000Z',
              updatedAt: '2025-06-20T15:45:00.000Z',
              store: {
                id: 'uuid-store-id',
                name: 'Main Store',
              },
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
          },
        }),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  GetSupplierById: () =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.SUPPLIER,
        PermissionAction.READ,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Get supplier by ID',
        description: 'Retrieves a specific supplier by its ID.',
      }),
      ApiParam({
        name: 'id',
        type: 'string',
        description: 'The UUID of the supplier to retrieve',
        example: 'uuid-supplier-id',
      }),
      ApiResponse({
        status: 200,
        description: 'Supplier retrieved successfully',
        schema: successResponseSchema('Supplier retrieved successfully', {
          id: 'uuid-supplier-id',
          supplier_id: 'SUP-001',
          name: 'ABC Suppliers Ltd',
          email: 'supplier@example.com',
          phone: '+1-555-123-4567',
          address: '123 Main St, City, State 12345',
          storeId: 'uuid-store-id',
          status: 'active',
          createdAt: '2025-06-21T10:30:00.000Z',
          updatedAt: '2025-06-21T10:30:00.000Z',
          store: {
            id: 'uuid-store-id',
            name: 'Main Store',
          },
        }),
      }),
      ApiResponse({
        status: 404,
        description: 'Supplier not found',
        schema: errorResponseSchema(404, 'Supplier not found'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  GetSupplierBySupplierId: () =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.SUPPLIER,
        PermissionAction.READ,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Get supplier by supplier ID',
        description:
          'Retrieves a supplier by their unique supplier_id. Requires supplier read permissions.',
      }),
      ApiParam({
        name: 'supplierId',
        type: 'string',
        description: 'The unique supplier_id to search for',
        example: 'SUP-001',
      }),
      ApiResponse({
        status: 200,
        description: 'Supplier retrieved successfully',
        schema: successResponseSchema('Supplier retrieved successfully', {
          id: 'uuid-supplier-id',
          supplier_id: 'SUP-001',
          name: 'ABC Suppliers Ltd',
          email: 'supplier@example.com',
          phone: '+1-555-123-4567',
          address: '123 Main St, City, State 12345',
          storeId: 'uuid-store-id',
          status: 'active',
          createdAt: '2025-06-21T10:30:00.000Z',
          updatedAt: '2025-06-21T10:30:00.000Z',
          store: {
            id: 'uuid-store-id',
            name: 'Main Store',
          },
        }),
      }),
      ApiResponse({
        status: 403,
        description: 'Forbidden - insufficient permissions',
        schema: errorResponseSchema(
          403,
          'Insufficient permissions to view suppliers',
        ),
      }),
      ApiResponse({
        status: 404,
        description: 'Supplier not found',
        schema: errorResponseSchema(404, 'Supplier not found'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  UpdateSupplier: (dtoType: any) =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.SUPPLIER,
        PermissionAction.UPDATE,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Update supplier',
        description:
          'Updates an existing supplier. Requires supplier update permissions.',
      }),
      ApiParam({
        name: 'id',
        type: 'string',
        description: 'The UUID of the supplier to update',
        example: 'uuid-supplier-id',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Supplier updated successfully',
        schema: successResponseSchema('Supplier updated successfully', {
          id: 'uuid-supplier-id',
          supplier_id: 'SUP-001-UPDATED',
          name: 'Updated Supplier Name Ltd',
          email: 'updated@example.com',
          phone: '+1-555-987-6543',
          address: '456 Updated St, City, State 67890',
          storeId: 'uuid-store-id',
          status: 'active',
          createdAt: '2025-06-21T10:30:00.000Z',
          updatedAt: '2025-06-21T12:45:00.000Z',
          store: {
            id: 'uuid-store-id',
            name: 'Main Store',
          },
        }),
      }),
      ApiResponse({
        status: 403,
        description: 'Forbidden - insufficient permissions',
        schema: errorResponseSchema(
          403,
          'Insufficient permissions to update suppliers',
        ),
      }),
      ApiResponse({
        status: 404,
        description: 'Supplier not found',
        schema: errorResponseSchema(404, 'Supplier not found'),
      }),
      ApiResponse({
        status: 400,
        description:
          'Bad Request - Validation failed or supplier_id already exists',
        schema: errorResponseSchema(
          400,
          'Supplier with this supplier_id already exists',
        ),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  DeleteSupplier: () =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.SUPPLIER,
        PermissionAction.DELETE,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Delete supplier',
        description:
          'Deletes a supplier. Requires supplier deletion permissions.',
      }),
      ApiParam({
        name: 'id',
        type: 'string',
        description: 'The UUID of the supplier to delete',
        example: 'uuid-supplier-id',
      }),
      ApiResponse({
        status: 200,
        description: 'Supplier deleted successfully',
        schema: successResponseSchema('Supplier deleted successfully', {
          id: 'uuid-supplier-id',
          deleted: true,
        }),
      }),
      ApiResponse({
        status: 403,
        description: 'Forbidden - insufficient permissions',
        schema: errorResponseSchema(
          403,
          'Insufficient permissions to delete suppliers',
        ),
      }),
      ApiResponse({
        status: 404,
        description: 'Supplier not found',
        schema: errorResponseSchema(404, 'Supplier not found'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),
};
