import {
  Controller,
  Get,
  UseGuards,
  Req,
  Res,
  Version,
  Post,
  Body,
  Request,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiOAuth2,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from '../guards/google-oauth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Public } from '../decorators/public.decorator';
import { Status, Role } from '@prisma/client';
import {
  GoogleProfileDto,
  AuthResponseDto,
  SignupSuperAdminDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  InviteDto,
  AcceptInviteDto,
} from './dto/auth.dto';

import { Roles } from '../decorators/roles.decorator';

import { verify } from 'crypto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  // Start Google OAuth flow

  @ApiOperation({ summary: 'Check authentication service status' })
  @ApiResponse({
    status: 200,
    description: 'Service status information',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Auth service is running' },
        timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
        status: { type: 'string', example: 'active' },
      },
    },
  })
  @Public()
  @Version('1')
  @Get('/')
  async getStatus() {
    return {
      message: 'Auth service is running',
      timestamp: new Date().toISOString(),
      status: 'active',
    };
  }

  @ApiOperation({ summary: 'Initiate Google OAuth authentication' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth consent screen',
  })
  @ApiOAuth2(['openid', 'profile', 'email'], 'google-oauth')
  @Public()
  @Version('1')
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth(@Req() req) {
    // This will redirect to Google
  }

  @ApiOperation({ summary: 'Google OAuth callback handler' })
  @ApiResponse({
    status: 200,
    description: 'Successful Google authentication',
    type: AuthResponseDto,
  })
  @ApiExcludeEndpoint()
  @Public()
  @Version('1')
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const googleUser: GoogleProfileDto = req.user;
    const authResponse: AuthResponseDto =
      await this.authService.googleLogin(googleUser);

    // For API testing, return JSON response
    // In production, you might want to redirect to frontend with token
    return res.json({
      success: true,
      ...authResponse,
    });
  }
  @ApiOperation({ summary: 'Get user profile information' })
  @ApiResponse({
    status: 200,
    description: 'User profile data',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'This is a protected route' },
        user: {
          type: 'object',
          description: 'User information from JWT token',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiBearerAuth('JWT-auth')
  // Protected route to test JWT token
  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.employee, Role.manager, Role.admin, Role.super_admin)
  getProfile(@Req() req) {
    return {
      message: 'This is a protected route',
      user: req.user,
    };
  }

  @ApiOperation({ summary: 'Get admin-only data' })
  @ApiResponse({
    status: 200,
    description: 'Admin data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'This is an admin-only route' },
        user: {
          type: 'object',
          description: 'User information from JWT token',
        },
        adminData: { type: 'string', example: 'Secret admin information' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiBearerAuth('JWT-auth')
  // Admin only route example
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin, Role.super_admin)
  getAdminData(@Req() req) {
    return {
      message: 'This is an admin-only route',
      user: req.user,
      adminData: 'Secret admin information',
    };
  }

  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    description: 'Logout instructions',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Logged out successfully. Please remove the token from client side.',
        },
        instruction: {
          type: 'string',
          example: 'Delete the JWT token from your application storage',
        },
      },
    },
  })
  // Logout (simple token invalidation message)
  @Public()
  @Get('logout')
  logout() {
    return {
      message:
        'Logged out successfully. Please remove the token from client side.',
      instruction: 'Delete the JWT token from your application storage',
    };
  }

  @ApiOperation({ summary: 'Register super admin account' })
  @ApiBody({ type: SignupSuperAdminDto })
  @ApiResponse({
    status: 201,
    description: 'Super admin account created successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Super admin account created successfully',
        },
        user: { type: 'object', description: 'Created user information' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  @Version('1')
  @Post('signup/super-admin')
  async signupSuperAdmin(@Body() dto: SignupSuperAdminDto) {
    return this.authService.signupSuperAdmin(dto);
  }

  @ApiOperation({ summary: 'Verify OTP for email confirmation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        otp: { type: 'string', example: '123456' },
      },
      required: ['email', 'otp'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'OTP verified successfully' },
        verified: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  @Version('1')
  @Post('verify-otp')
  async verifyOTP(@Body() body) {
    console.log('Verifying OTP for email:', body.email);
    return this.authService.verifyOTP(body.email, body.otp);
  }

  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'object', description: 'User information' },
        status: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Login successful' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 500, description: 'Login failed' })
  @Version('1')
  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res) {
    try {
      const { accessToken, refreshToken, user } =
        await this.authService.login(dto);
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'none', // Adjust as necessary
      });
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
      });
      return res
        .status(200)
        .json({ data: user, status: 200, message: 'Login successful' });
    } catch (error) {
      console.error('Login error:', error);
      return res
        .status(500)
        .json({ error: error.message, status: 500, message: 'Login failed' });
    }
  }

  @ApiOperation({ summary: 'Refresh JWT token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @Version('1')
  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password reset email sent successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Email not found' })
  @Version('1')
  @Post('forgot-password')
  @Public()
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password reset successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  @Version('1')
  @Post('reset-password')
  @Public()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiOperation({ summary: 'Invite user to store' })
  @ApiBody({ type: InviteDto })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Invitation sent successfully' },
        inviteId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiBearerAuth('JWT-auth')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.super_admin, Role.admin)
  @Post('invite')
  async invite(@Body() dto: InviteDto, @Request() req) {
    return this.authService.invite(
      dto,
      req.user.id,
      req.user.role,
      req.user.stores,
    );
  }

  @ApiOperation({ summary: 'Accept store invitation' })
  @ApiBody({ type: AcceptInviteDto })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Invitation accepted successfully',
        },
        user: { type: 'object', description: 'Created user information' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired invitation token',
  })
  @Version('1')
  @Post('accept-invite')
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }

  @ApiOperation({ summary: 'Get user permissions for a store' })
  @ApiQuery({
    name: 'storeId',
    required: true,
    description: 'Store ID to get permissions for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User permissions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        permissions: {
          type: 'array',
          items: { type: 'string' },
          example: ['read', 'write', 'delete'],
        },
        role: { type: 'string', example: 'manager' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Store not found or no access' })
  @ApiBearerAuth('JWT-auth')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Get('permissions')
  async getPermissions(@Request() req, @Query('storeId') storeId: string) {
    return this.authService.getPermissions(req.user.id, storeId);
  }
}
