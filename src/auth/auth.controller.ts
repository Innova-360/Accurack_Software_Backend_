import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from '../guards/google-oauth.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles, Role } from '../decorators/roles.decorator';
import { Public } from '../decorators/public.decorator';
import { GoogleProfileDto, AuthResponseDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  // Start Google OAuth flow
  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth(@Req() req) {
    // This will redirect to Google
  }

  // Google OAuth callback
  @Public()
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
  @Roles(Role.USER, Role.ADMIN)
  getProfile(@Req() req) {
    return {
      message: 'This is a protected route',
      user: req.user,
    };
  }

  // Admin only route example
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
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
}
