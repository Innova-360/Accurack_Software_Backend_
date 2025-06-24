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

export const TenantEndpoint = {
  // Create new tenant
  CreateTenant: (dtoType: any) =>
    applyDecorators(
      ApiBearerAuth('JWT-auth'),
      RequireGlobalPermission(
        PermissionResource.TENANT,
        PermissionAction.CREATE,
      ),
      ApiOperation({
        summary: 'Create new tenant with dedicated database',
        description:
          'Creates a new tenant with a dedicated database and database user. This is a super admin operation that sets up complete tenant isolation.',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Tenant created successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Tenant created successfully' },
            data: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                name: { type: 'string', example: 'Acme Corporation' },
                email: { type: 'string', example: 'admin@acme.com' },
                databaseName: { type: 'string', example: 'tenant_acme_corp' },
                status: { type: 'string', example: 'active' },
                createdAt: {
                  type: 'string',
                  example: '2025-06-18T10:30:00.000Z',
                },
              },
            },
            status: { type: 'number', example: 201 },
            timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
          },
        },
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - validation failed or tenant already exists',
      }),
      ...standardErrorResponses(),
    ),

  // Get all tenants
  GetAllTenants: () =>
    applyDecorators(
      ApiBearerAuth('JWT-auth'),
      RequireGlobalPermission(PermissionResource.TENANT, PermissionAction.READ),
      ApiOperation({
        summary: 'Get all tenants',
        description:
          'Returns a list of all tenants in the system. Super admin operation.',
      }),
      ApiResponse({
        status: 200,
        description: 'Tenants retrieved successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'Tenants retrieved successfully',
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
                  name: { type: 'string', example: 'Acme Corporation' },
                  email: { type: 'string', example: 'admin@acme.com' },
                  databaseName: { type: 'string', example: 'tenant_acme_corp' },
                  status: { type: 'string', example: 'active' },
                  createdAt: {
                    type: 'string',
                    example: '2025-06-18T10:30:00.000Z',
                  },
                },
              },
            },
            status: { type: 'number', example: 200 },
            timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
          },
        },
      }),
      ...standardErrorResponses(),
    ),

  // Get tenant by ID
  GetTenantById: () =>
    applyDecorators(
      ApiBearerAuth('JWT-auth'),
      RequireGlobalPermission(PermissionResource.TENANT, PermissionAction.READ),
      ApiOperation({
        summary: 'Get tenant by ID',
        description: 'Returns detailed information about a specific tenant.',
      }),
      ApiParam({
        name: 'id',
        description: 'Tenant UUID',
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
      ApiResponse({
        status: 200,
        description: 'Tenant retrieved successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'Tenant retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                name: { type: 'string', example: 'Acme Corporation' },
                email: { type: 'string', example: 'admin@acme.com' },
                databaseName: { type: 'string', example: 'tenant_acme_corp' },
                status: { type: 'string', example: 'active' },
                createdAt: {
                  type: 'string',
                  example: '2025-06-18T10:30:00.000Z',
                },
                updatedAt: {
                  type: 'string',
                  example: '2025-06-18T10:30:00.000Z',
                },
              },
            },
            status: { type: 'number', example: 200 },
            timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
          },
        },
      }),
      ApiResponse({
        status: 404,
        description: 'Tenant not found',
      }),
      ...standardErrorResponses(),
    ),

  // Update tenant status
  UpdateTenantStatus: (dtoType: any) =>
    applyDecorators(
      ApiBearerAuth('JWT-auth'),
      RequireGlobalPermission(
        PermissionResource.TENANT,
        PermissionAction.UPDATE,
      ),
      ApiOperation({
        summary: 'Update tenant status',
        description:
          'Update the status of a tenant (active/inactive/suspended).',
      }),
      ApiParam({
        name: 'id',
        description: 'Tenant UUID',
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Tenant status updated successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'Tenant status updated successfully',
            },
            data: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                name: { type: 'string', example: 'Acme Corporation' },
                status: { type: 'string', example: 'inactive' },
                updatedAt: {
                  type: 'string',
                  example: '2025-06-18T10:30:00.000Z',
                },
              },
            },
            status: { type: 'number', example: 200 },
            timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
          },
        },
      }),
      ApiResponse({
        status: 404,
        description: 'Tenant not found',
      }),
      ...standardErrorResponses(),
    ),

  // Delete tenant
  DeleteTenant: () =>
    applyDecorators(
      ApiBearerAuth('JWT-auth'),
      RequireGlobalPermission(
        PermissionResource.TENANT,
        PermissionAction.DELETE,
      ),
      ApiOperation({
        summary: 'Delete tenant and cleanup resources',
        description:
          'Permanently deletes a tenant and all associated resources including database and user. This operation cannot be undone.',
      }),
      ApiParam({
        name: 'id',
        description: 'Tenant UUID',
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
      ApiResponse({
        status: 200,
        description: 'Tenant deleted successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'Tenant deleted successfully',
            },
            data: { type: 'null' },
            status: { type: 'number', example: 200 },
            timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
          },
        },
      }),
      ApiResponse({
        status: 404,
        description: 'Tenant not found',
      }),
      ...standardErrorResponses(),
    ),

  // Get tenant database status
  GetTenantDatabaseStatus: () =>
    applyDecorators(
      ApiBearerAuth('JWT-auth'),
      RequireGlobalPermission(PermissionResource.TENANT, PermissionAction.READ),
      ApiOperation({
        summary: 'Get tenant database connection status',
        description:
          "Check the connectivity and health status of a tenant's database.",
      }),
      ApiParam({
        name: 'id',
        description: 'Tenant UUID',
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
      ApiResponse({
        status: 200,
        description: 'Database status retrieved successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'Database status retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                tenantId: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                databaseName: { type: 'string', example: 'tenant_acme_corp' },
                status: { type: 'string', example: 'connected' },
                schemaInitialized: { type: 'boolean', example: true },
                tableCount: { type: 'number', example: 15 },
                lastChecked: {
                  type: 'string',
                  example: '2025-06-18T10:30:00.000Z',
                },
                connectionCount: { type: 'number', example: 5 },
                details: {
                  type: 'object',
                  properties: {
                    version: { type: 'string', example: '16.1' },
                    isHealthy: { type: 'boolean', example: true },
                  },
                },
              },
            },
            status: { type: 'number', example: 200 },
            timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
          },
        },
      }),
      ApiResponse({
        status: 404,
        description: 'Tenant not found',
      }),
      ...standardErrorResponses(),
    ),

  // Initialize tenant schema
  InitializeTenantSchema: () =>
    applyDecorators(
      ApiBearerAuth('JWT-auth'),
      RequireGlobalPermission(
        PermissionResource.TENANT,
        PermissionAction.UPDATE,
      ),
      ApiOperation({
        summary: 'Initialize or reinitialize tenant database schema',
        description:
          'Applies the application schema to the tenant database. Useful for existing tenants or recovery scenarios.',
      }),
      ApiParam({
        name: 'tenantId',
        description: 'Tenant UUID',
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
      ApiResponse({
        status: 200,
        description: 'Schema initialized successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'Tenant schema initialized successfully',
            },
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                schemaInitialized: { type: 'boolean', example: true },
                tableCount: { type: 'number', example: 15 },
                message: {
                  type: 'string',
                  example:
                    'Schema initialized successfully for tenant Acme Corp',
                },
              },
            },
            status: { type: 'number', example: 200 },
            timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
          },
        },
      }),
      ApiResponse({
        status: 404,
        description: 'Tenant not found',
      }),
      ...standardErrorResponses(),
    ),
};
