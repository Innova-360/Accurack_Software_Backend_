import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiOAuth2,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Version } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { Public } from '../../decorators/public.decorator';
import { Roles } from '../../decorator/roles.decorator';
import { GoogleOAuthGuard } from '../../guards/google-oauth.guard';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Role } from '@prisma/client';

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

// Auth endpoint decorators
export const AuthEndpoint = {
  // Google OAuth endpoints
  GoogleAuth: () =>
    applyDecorators(
      ApiOperation({ summary: 'Initiate Google OAuth authentication' }),
      ApiResponse({
        status: 302,
        description: 'Redirects to Google OAuth consent screen',
      }),
      ApiOAuth2(['openid', 'profile', 'email'], 'google-oauth'),
      Public(),
      Version('1'),
      UseGuards(GoogleOAuthGuard),
    ),

  GoogleCallback: () =>
    applyDecorators(
      ApiOperation({ summary: 'Google OAuth callback handler' }),
      ApiResponse({
        status: 200,
        description: 'Google authentication successful with cookies set',
        schema: successResponseSchema('Google authentication successful', {
          user: { id: 'uuid', email: 'user@example.com' },
          redirectTo: 'http://localhost:3000',
        }),
      }),
      ApiExcludeEndpoint(),
      Public(),
      Version('1'),
      UseGuards(GoogleOAuthGuard),
    ),

  // User info endpoint
  GetMe: () =>
    applyDecorators(
      ApiOperation({ summary: 'Get current user information' }),
      ApiResponse({
        status: 200,
        description: 'Returns the current user information',
        schema: successResponseSchema(
          'User information retrieved successfully',
          {
            id: 'uuid-string',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'employee',
            clientId: 'uuid-string',
            status: 'active',
            googleId: '1234567890',
            createdAt: '2025-06-18T10:30:00.000Z',
            updatedAt: '2025-06-18T10:30:00.000Z',
          },
        ),
      }),
      ApiBearerAuth('JWT-auth'),
      UseGuards(JwtAuthGuard),
      Version('1'),
    ),

  // Logout endpoint
  Logout: () =>
    applyDecorators(
      ApiOperation({ summary: 'Logout user and clear authentication cookies' }),
      ApiResponse({
        status: 200,
        description: 'Successfully logged out and cookies cleared',
        schema: successResponseSchema('Successfully logged out', null),
      }),
      Public(),
      Version('1'),
    ),

  // Login endpoint
  LoginEndpoint: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'User login' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Login successful',
        schema: successResponseSchema('Login successful', {
          user: { id: 'uuid', email: 'user@example.com', role: 'employee' },
        }),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  // Registration endpoint
  SignupSuperAdmin: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'Register super admin account' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Super admin account created successfully',
        schema: createdResponseSchema(
          'Super admin account created successfully',
        ),
      }),
      ApiResponse({
        status: 409,
        description: 'Conflict - Email already exists',
        schema: errorResponseSchema(409, 'Email already exists'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  // OTP verification
  VerifyOTP: () =>
    applyDecorators(
      ApiOperation({ summary: 'Verify OTP for email confirmation' }),
      ApiBody({
        schema: {
          type: 'object',
          properties: {
            email: { type: 'string', example: 'user@example.com' },
            otp: { type: 'string', example: '123456' },
          },
          required: ['email', 'otp'],
        },
      }),
      ApiResponse({
        status: 200,
        description: 'OTP verified successfully',
        schema: successResponseSchema('OTP verified successfully'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  // Token refresh
  RefreshToken: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'Refresh JWT token' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Token refreshed successfully',
        schema: successResponseSchema('Token refreshed successfully', {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        }),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  // Password reset request
  ForgotPassword: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'Request password reset' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Password reset email sent',
        schema: successResponseSchema('Password reset email sent successfully'),
      }),
      ApiResponse({
        status: 404,
        description: 'Email not found',
        schema: errorResponseSchema(404, 'Email not found'),
      }),
      Public(),
      Version('1'),
    ),

  // Password reset
  ResetPassword: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'Reset password with token' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Password reset successfully',
        schema: successResponseSchema('Password reset successfully'),
      }),
      ApiResponse({
        status: 400,
        description: 'Invalid or expired reset token',
        schema: errorResponseSchema(400, 'Invalid or expired reset token'),
      }),
      Public(),
      Version('1'),
    ),

  // Invite user
  InviteUser: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'Invite user to store' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Invitation sent successfully',
        schema: createdResponseSchema('Invitation sent successfully', {
          inviteId: '123e4567-e89b-12d3-a456-426614174000',
        }),
      }),
      ApiResponse({
        status: 403,
        description: 'Insufficient permissions',
        schema: errorResponseSchema(403, 'Insufficient permissions'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
      UseGuards(JwtAuthGuard, RolesGuard),
      Roles(Role.super_admin, Role.admin),
    ),

  // Accept invitation
  AcceptInvite: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'Accept store invitation' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Invitation accepted successfully',
        schema: successResponseSchema('Invitation accepted successfully', {
          user: { id: 'uuid', email: 'user@example.com' },
        }),
      }),
      ApiResponse({
        status: 400,
        description: 'Invalid or expired invitation token',
        schema: errorResponseSchema(400, 'Invalid or expired invitation token'),
      }),
      Version('1'),
    ),

  // Get permissions
  GetPermissions: () =>
    applyDecorators(
      ApiOperation({ summary: 'Get user permissions for a store' }),
      ApiQuery({
        name: 'storeId',
        required: true,
        description: 'Store ID to get permissions for',
        example: '123e4567-e89b-12d3-a456-426614174000',
      }),
      ApiResponse({
        status: 200,
        description: 'User permissions retrieved successfully',
        schema: successResponseSchema(
          'User permissions retrieved successfully',
          {
            permissions: ['read', 'write', 'delete'],
            role: 'manager',
          },
        ),
      }),
      ApiResponse({
        status: 404,
        description: 'Store not found or no access',
        schema: errorResponseSchema(404, 'Store not found or no access'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
      UseGuards(JwtAuthGuard),
    ),
};
