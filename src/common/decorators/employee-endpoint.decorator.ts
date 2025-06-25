import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import {
  PermissionResource,
  PermissionAction,
} from '../../permissions/enums/permission.enum';
import { Version } from '@nestjs/common';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';

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

export const EmployeeEndpoint = {
  // Create Employee
  CreateEmployee: (dtoType: any) =>
    applyDecorators(
      RequirePermissions(PermissionResource.USER, PermissionAction.CREATE),
      ApiOperation({ summary: 'Create a new employee' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Employee created successfully',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  // Get All Employees
  GetAllEmployees: () =>
    applyDecorators(
      RequirePermissions(PermissionResource.USER, PermissionAction.READ),
      ApiOperation({ summary: 'Get all employees' }),
      ApiResponse({
        status: 200,
        description: 'Employees retrieved successfully',
      }),
      ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number for pagination',
      }),
      ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of items per page',
      }),
      ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Search term for filtering employees',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  // Get Employee By ID
  GetEmployeeById: () =>
    applyDecorators(
      RequirePermissions(PermissionResource.USER, PermissionAction.READ),
      ApiOperation({ summary: 'Get employee by ID' }),
      ApiParam({ name: 'id', description: 'Employee ID' }),
      ApiResponse({
        status: 200,
        description: 'Employee retrieved successfully',
      }),
      ApiResponse({
        status: 404,
        description: 'Employee not found',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  // Update Employee
  UpdateEmployee: (dtoType: any) =>
    applyDecorators(
      RequirePermissions(PermissionResource.USER, PermissionAction.UPDATE),
      ApiOperation({ summary: 'Update an employee' }),
      ApiParam({ name: 'id', description: 'Employee ID' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Employee updated successfully',
      }),
      ApiResponse({
        status: 404,
        description: 'Employee not found',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  // Update Employee Permissions
  UpdateEmployeePermissions: (dtoType: any) =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.PERMISSION,
        PermissionAction.UPDATE,
      ),
      ApiOperation({ summary: 'Update employee permissions' }),
      ApiParam({ name: 'id', description: 'Employee ID' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Employee permissions updated successfully',
      }),
      ApiResponse({
        status: 404,
        description: 'Employee not found',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  // Delete Employee
  DeleteEmployee: () =>
    applyDecorators(
      RequirePermissions(PermissionResource.USER, PermissionAction.DELETE),
      ApiOperation({ summary: 'Delete an employee' }),
      ApiParam({ name: 'id', description: 'Employee ID' }),
      ApiResponse({
        status: 200,
        description: 'Employee deleted successfully',
      }),
      ApiResponse({
        status: 404,
        description: 'Employee not found',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  // Invite Employee
  InviteEmployee: (dtoType: any) =>
    applyDecorators(
      RequirePermissions(PermissionResource.USER, PermissionAction.CREATE),
      ApiOperation({ summary: 'Invite a new employee' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Employee invitation sent successfully',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  // Deactivate Employee
  DeactivateEmployee: () =>
    applyDecorators(
      RequirePermissions(PermissionResource.USER, PermissionAction.UPDATE),
      ApiOperation({ summary: 'Deactivate employee account' }),
      ApiParam({ name: 'id', description: 'Employee ID' }),
      ApiResponse({
        status: 200,
        description: 'Employee deactivated successfully',
      }),
      ApiResponse({
        status: 404,
        description: 'Employee not found',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  // Update Employee Stores
  UpdateEmployeeStores: (dtoType: any) =>
    applyDecorators(
      RequirePermissions(PermissionResource.USER, PermissionAction.UPDATE),
      ApiOperation({ summary: 'Update employee store assignments' }),
      ApiParam({ name: 'id', description: 'Employee ID' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Employee store assignments updated successfully',
      }),
      ApiResponse({
        status: 404,
        description: 'Employee not found',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),

  // Reset Employee Password
  ResetEmployeePassword: () =>
    applyDecorators(
      RequirePermissions(PermissionResource.USER, PermissionAction.UPDATE),
      ApiOperation({ summary: 'Reset employee password' }),
      ApiParam({ name: 'id', description: 'Employee ID' }),
      ApiResponse({
        status: 200,
        description: 'Employee password reset successfully',
      }),
      ApiResponse({
        status: 404,
        description: 'Employee not found',
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
    ),
};
