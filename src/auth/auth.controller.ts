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

import { Roles } from '../decorator/roles.decorator';

import { verify } from 'crypto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  // Start Google OAuth flow

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

  @Public()
  @Version('1')
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth(@Req() req) {
    // This will redirect to Google
  }

  // Google OAuth callback
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

  @Version('1')
  @Get('test')
  async test() {
    return 'testing successful';
  }

  @Version('1')
  @Post('signup/super-admin')
  async signupSuperAdmin(@Body() dto: SignupSuperAdminDto) {
    return this.authService.signupSuperAdmin(dto);
  }

  @Version('1')
  @Post('verify-otp')
  async verifyOTP(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyOTP(body.email, body.otp);
  }
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

  @Version('1')
  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Version('1')
  @Post('forgot-password')
  @Public()
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Version('1')
  @Post('reset-password')
  @Public()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

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

  @Version('1')
  @Post('accept-invite')
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }

  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Get('permissions')
  async getPermissions(@Request() req, @Query('storeId') storeId: string) {
    return this.authService.getPermissions(req.user.id, storeId);
  }
}
