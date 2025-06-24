import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  RequirePermissions,
  RequireGlobalPermission,
} from '../../decorators/permissions.decorator';
import {
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '../../permissions/enums/permission.enum';

const standardErrorResponses = () => [
  ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  }),
  ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  }),
  ApiResponse({ status: 500, description: 'Internal server error' }),
];

export const StoreEndpoint = {
  // Get all stores user has access to
  GetUserStores: () =>
    applyDecorators(      RequirePermissions(
        PermissionResource.STORE,
        PermissionAction.READ,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Get list of user stores',
        description:
          'Returns all stores that the authenticated user has access to based on their store mappings and permissions.',
      }),
      ApiResponse({
        status: 200,
        description: 'Stores retrieved successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'Stores retrieved successfully',
            },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: '123e4567-e89b-12d3-a456-426614174000',
                  },
                  name: { type: 'string', example: 'Downtown Store' },
                  email: { type: 'string', example: 'store@example.com' },
                  address: {
                    type: 'string',
                    example: '123 Main St, City, State 12345',
                  },
                  phone: { type: 'string', example: '+1-555-123-4567' },
                  status: { type: 'string', example: 'active' },
                  createdAt: {
                    type: 'string',
                    example: '2025-06-18T10:30:00.000Z',
                  },
                  settings: {
                    type: 'object',
                    properties: {
                      currency: { type: 'string', example: 'USD' },
                      timezone: { type: 'string', example: 'America/New_York' },
                      taxRate: { type: 'number', example: 0.08 },
                      taxMode: { type: 'string', example: 'exclusive' },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  // Get specific store by ID (with store-specific permission check)
  GetStoreById: () =>
    applyDecorators(      RequirePermissions(
        PermissionResource.STORE,
        PermissionAction.READ,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Get store by ID',
        description:
          'Returns detailed information about a specific store. User must have READ permission for this specific store.',
      }),
      ApiParam({
        name: 'id',
        description: 'Store ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
      ApiResponse({
        status: 200,
        description: 'Store retrieved successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'Store retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                name: { type: 'string', example: 'Downtown Store' },
                email: { type: 'string', example: 'store@example.com' },
                address: {
                  type: 'string',
                  example: '123 Main St, City, State 12345',
                },
                phone: { type: 'string', example: '+1-555-123-4567' },
                status: { type: 'string', example: 'active' },
                createdAt: {
                  type: 'string',
                  example: '2025-06-18T10:30:00.000Z',
                },
                settings: {
                  type: 'object',
                  properties: {
                    currency: { type: 'string', example: 'USD' },
                    timezone: { type: 'string', example: 'America/New_York' },
                    taxRate: { type: 'number', example: 0.08 },
                    taxMode: { type: 'string', example: 'exclusive' },
                  },
                },
              },
            },
          },
        },
      }),
      ApiResponse({
        status: 404,
        description: 'Store not found or access denied',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  // Create store (global permission required)
  CreateStore: (dtoType: any) =>
    applyDecorators(
      RequireGlobalPermission(
        PermissionResource.STORE,
        PermissionAction.CREATE,      ),
      ApiOperation({
        summary: 'Create a new store',
        description:
          'Creates a new store. Requires global STORE.CREATE permission (typically super_admin or admin role).',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Store created successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Store created successfully' },
            data: {
              type: 'object',
              properties: {
                store: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      example: '123e4567-e89b-12d3-a456-426614174000',
                    },
                    name: { type: 'string', example: 'Downtown Store' },
                    email: { type: 'string', example: 'store@example.com' },
                    address: {
                      type: 'string',
                      example: '123 Main St, City, State 12345',
                    },
                    phone: { type: 'string', example: '+1-555-123-4567' },
                    createdAt: {
                      type: 'string',
                      example: '2025-06-18T10:30:00.000Z',
                    },
                  },
                },
                settings: {
                  type: 'object',
                  properties: {
                    currency: { type: 'string', example: 'USD' },
                    timezone: { type: 'string', example: 'America/New_York' },
                    taxRate: { type: 'number', example: 0 },
                    taxMode: { type: 'string', example: 'exclusive' },
                  },
                },
              },
            },
          },
        },
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - Invalid input data',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  // Update store (store-specific permission)
  UpdateStore: (dtoType: any) =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.STORE,        PermissionAction.UPDATE,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Update store',
        description:
          'Updates store information. User must have UPDATE permission for this specific store.',
      }),
      ApiParam({
        name: 'id',
        description: 'Store ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Store updated successfully',
      }),
      ApiResponse({
        status: 404,
        description: 'Store not found or access denied',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  // Delete store (global permission required)
  DeleteStore: () =>
    applyDecorators(
      RequireGlobalPermission(
        PermissionResource.STORE,        PermissionAction.DELETE,
      ),
      ApiOperation({
        summary: 'Delete store',
        description:
          'Deletes a store. Requires global STORE.DELETE permission (typically super_admin only).',
      }),
      ApiParam({
        name: 'id',
        description: 'Store ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
      ApiResponse({
        status: 200,
        description: 'Store deleted successfully',
      }),
      ApiResponse({ status: 404, description: 'Store not found' }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),
};
