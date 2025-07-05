import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { RequireGlobalPermission } from '../../auth/decorators/permissions.decorator';
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

export const ProfileEndpoint = {
  GetProfile: () =>
    applyDecorators(
      RequireGlobalPermission(PermissionResource.USER, PermissionAction.READ),
      ApiTags('Users'),
      ApiOperation({
        summary: 'Get current user profile',
        description:
          'Retrieves the profile information of the currently authenticated user. Users can view their own profile, while admins with USER.READ permission can view any user profile.',
      }),
      ApiResponse({
        status: 200,
        description: 'User profile retrieved successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'User profile retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: 'c7a8b9d0-e1f2-g3h4-i5j6-k7l8m9n0o1p2',
                },
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' },
                email: { type: 'string', example: 'john.doe@example.com' },
                phone: { type: 'string', example: '123-456-7890' },
                role: { type: 'string', example: 'admin' },
                status: { type: 'string', example: 'active' },
              },
            },
            status: { type: 'number', example: 200 },
            timestamp: { type: 'string', example: '2025-07-05T12:00:00.000Z' },
          },
        },
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  UpdateProfile: (dtoType: new () => object) =>
    applyDecorators(
      RequireGlobalPermission(PermissionResource.USER, PermissionAction.UPDATE),
      ApiTags('Users'),
      ApiOperation({
        summary: 'Update current user profile',
        description:
          'Updates the profile information (first name, last name, phone) of the currently authenticated user. Users can update their own profile, while admins with USER.UPDATE permission can update any user profile.',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'User profile updated successfully',
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: {
              type: 'string',
              example: 'User profile updated successfully',
            },
            data: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: 'c7a8b9d0-e1f2-g3h4-i5j6-k7l8m9n0o1p2',
                },
                firstName: { type: 'string', example: 'Johnathan' },
                lastName: { type: 'string', example: 'Doe' },
                email: { type: 'string', example: 'john.doe@example.com' },
                phone: { type: 'string', example: '555-123-4567' },
              },
            },
            status: { type: 'number', example: 200 },
            timestamp: { type: 'string', example: '2025-07-05T12:05:00.000Z' },
          },
        },
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - Validation failed',
      }),
      ApiResponse({ status: 404, description: 'User not found' }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),
};
