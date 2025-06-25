import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiTags,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import {
  RequirePermissions,
  RequireGlobalPermission,
} from '../../auth/decorators/permissions.decorator';
import {
  PermissionResource,
  PermissionAction,
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

export const PermissionEndpoint = {
  // Permission Management Endpoints
  GetUserPermissions: () =>
    applyDecorators(
      RequireGlobalPermission(
        PermissionResource.PERMISSION,
        PermissionAction.READ,
      ),
      ApiOperation({ summary: 'Get user permissions' }),
      ApiParam({ name: 'userId', description: 'User ID' }),
      ApiResponse({
        status: 200,
        description: 'User permissions retrieved successfully',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  AssignPermission: (dtoType: any) =>
    applyDecorators(
      RequireGlobalPermission(
        PermissionResource.PERMISSION,
        PermissionAction.ASSIGN,
      ),
      ApiOperation({ summary: 'Assign permission to user' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Permission assigned successfully',
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - Invalid permission data',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  RevokePermission: (dtoType: any) =>
    applyDecorators(
      RequireGlobalPermission(
        PermissionResource.PERMISSION,
        PermissionAction.DELETE,
      ),
      ApiOperation({ summary: 'Revoke permission from user' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Permission revoked successfully',
      }),
      ApiResponse({ status: 404, description: 'Permission not found' }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  BulkAssignPermissions: (dtoType: any) =>
    applyDecorators(
      RequireGlobalPermission(
        PermissionResource.PERMISSION,
        PermissionAction.ASSIGN,
      ),
      ApiOperation({ summary: 'Bulk assign permissions to multiple users' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Permissions assigned successfully',
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - Invalid bulk assignment data',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  CheckPermission: (dtoType: any) =>
    applyDecorators(
      RequireGlobalPermission(
        PermissionResource.PERMISSION,
        PermissionAction.READ,
      ),
      ApiOperation({ summary: 'Check if user has specific permission' }),
      ApiBody({ type: dtoType }),
      ApiResponse({ status: 200, description: 'Permission check completed' }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  CheckUserStorePermission: (dtoType: any) =>
    applyDecorators(
      RequireGlobalPermission(
        PermissionResource.PERMISSION,
        PermissionAction.READ,
      ),
      ApiOperation({
        summary: 'Check if specific user has permission for specific store',
        description:
          'Checks if a user has a specific permission (resource + action) for a specific store. Considers both global permissions and store-specific permissions.',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'User store permission check completed successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'User store permission check completed',
            },
            data: {
              type: 'object',
              properties: {
                hasPermission: { type: 'boolean', example: true },
                source: {
                  type: 'string',
                  enum: ['global', 'store', 'none'],
                  example: 'store',
                },
                userId: { type: 'string', example: 'user123' },
                storeId: { type: 'string', example: 'store456' },
                resource: { type: 'string', example: 'inventory' },
                action: { type: 'string', example: 'create' },
              },
            },
          },
        },
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - Invalid input data',
      }),
      ApiResponse({
        status: 404,
        description: 'User or store not found',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  // Role Template Endpoints
  GetRoleTemplates: () =>
    applyDecorators(
      RequireGlobalPermission(
        PermissionResource.PERMISSION,
        PermissionAction.READ,
      ),
      ApiOperation({ summary: 'Get all role templates' }),
      ApiResponse({
        status: 200,
        description: 'Role templates retrieved successfully',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  CreateRoleTemplate: (dtoType: any) =>
    applyDecorators(
      RequireGlobalPermission(
        PermissionResource.PERMISSION,
        PermissionAction.CREATE,
      ),
      ApiOperation({ summary: 'Create new role template' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Role template created successfully',
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - Invalid role template data',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  UpdateRoleTemplate: (dtoType: any) =>
    applyDecorators(
      RequireGlobalPermission(
        PermissionResource.PERMISSION,
        PermissionAction.UPDATE,
      ),
      ApiOperation({ summary: 'Update role template' }),
      ApiParam({ name: 'id', description: 'Role template ID' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Role template updated successfully',
      }),
      ApiResponse({ status: 404, description: 'Role template not found' }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  DeleteRoleTemplate: () =>
    applyDecorators(
      RequireGlobalPermission(
        PermissionResource.PERMISSION,
        PermissionAction.DELETE,
      ),
      ApiOperation({ summary: 'Delete role template' }),
      ApiParam({ name: 'id', description: 'Role template ID' }),
      ApiResponse({
        status: 200,
        description: 'Role template deleted successfully',
      }),
      ApiResponse({ status: 404, description: 'Role template not found' }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  AssignRoleTemplate: (dtoType: any) =>
    applyDecorators(
      RequireGlobalPermission(
        PermissionResource.PERMISSION,
        PermissionAction.ASSIGN,
      ),
      ApiOperation({ summary: 'Assign role template to users' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Role template assigned successfully',
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - Invalid assignment data',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  // Resource-specific permission endpoints
  CreateResource: (resource: string, description: string, dtoType?: any) =>
    applyDecorators(
      RequirePermissions(resource, PermissionAction.CREATE),
      ApiOperation({ summary: `Create ${description}` }),
      ApiResponse({
        status: 201,
        description: `${description} created successfully`,
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - Validation failed',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  ReadResource: (resource: string, description: string) =>
    applyDecorators(
      RequirePermissions(resource, PermissionAction.READ),
      ApiOperation({ summary: `Get ${description}` }),
      ApiResponse({
        status: 200,
        description: `${description} retrieved successfully`,
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  UpdateResource: (resource: string, description: string, dtoType?: any) =>
    applyDecorators(
      RequirePermissions(resource, PermissionAction.UPDATE),
      ApiOperation({ summary: `Update ${description}` }),
      ApiResponse({
        status: 200,
        description: `${description} updated successfully`,
      }),
      ApiResponse({ status: 404, description: `${description} not found` }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  DeleteResource: (resource: string, description: string) =>
    applyDecorators(
      RequirePermissions(resource, PermissionAction.DELETE),
      ApiOperation({ summary: `Delete ${description}` }),
      ApiResponse({
        status: 200,
        description: `${description} deleted successfully`,
      }),
      ApiResponse({ status: 404, description: `${description} not found` }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),
};
