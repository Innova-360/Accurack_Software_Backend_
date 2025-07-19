import {
  Controller,
  Get,
  Req,
  Res,
  Post,
  Body,
  Request,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  SignupSuperAdminDto,
  CreateClientWithSuperAdminDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  InviteDto,
  AcceptInviteDto,
  FixClientRecordDto,
  FixUserRecordDto,
  ChangePasswordDto,
  ResendOtpDto,
} from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import {
  ResponseService,
  BaseAuthController,
  AuthEndpoint,
  UseMasterDB,
} from '../common';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Authentication')
@Controller('auth')
@UseMasterDB()
export class AuthController extends BaseAuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  // Google OAuth endpoints
  @AuthEndpoint.GoogleAuth()
  @Get('google')
  async googleAuth(@Req() req) {
    // This will redirect to Google
  }

  @AuthEndpoint.GoogleCallback()
  @Get('google/callback')
  async googleAuthRedirect(@Req() req, @Res() res: Response): Promise<void> {
    try {
      const isProduction = process.env.NODE_ENV === 'production';
      let redirectUrl = process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}`
        : 'http://localhost:5173';

      if (!process.env.FRONTEND_URL && !isProduction) {
        throw new Error('FRONTEND_URL environment variable is not set');
      }

      if (!req.user) {
        // Set Google profile cookie for signup pre-fill
        res.cookie('googleSignup', JSON.stringify({
          email: req.user?.email || '',
          firstName: req.user?.firstName || '',
          lastName: req.user?.lastName || '',
          picture: req.user?.picture || '',
        }), {
          httpOnly: true,
          secure: true,
          sameSite:'none',
          maxAge: 5 * 60 * 1000, // 5 minutes
        });
        redirectUrl = `${redirectUrl}/signup`;
        return res.redirect(redirectUrl);
      }

      const { access_token, refresh_token } =
        await this.authService.googleLogin(req.user);
      if (!access_token || !refresh_token) {
        // Set Google profile cookie for signup pre-fill
        res.cookie('googleSignup', JSON.stringify({
          email: req.user?.email || '',
          firstName: req.user?.firstName || '',
          lastName: req.user?.lastName || '',
          picture: req.user?.picture || '',
        }), {
          httpOnly: true,
          secure: true,
          sameSite:'none',
          maxAge: 5 * 60 * 1000, // 5 minutes
        });
        redirectUrl = `${redirectUrl}/signup`;
        return res.redirect(redirectUrl);
      }

      res.cookie('accessToken', access_token, {
        httpOnly: true,
        secure: true,
        sameSite:'none',
      });
      res.cookie('refreshToken', refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite:'none',
      });

      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google Auth Error:', error);
      // Try to set Google profile cookie if available
      if (req.user) {
        res.cookie('googleSignup', JSON.stringify({
          email: req.user?.email || '',
          firstName: req.user?.firstName || '',
          lastName: req.user?.lastName || '',
          picture: req.user?.picture || '',
        }), {
          httpOnly: true,
          secure: true,
          sameSite:'none',
          maxAge: 5 * 60 * 1000, // 5 minutes
        });
      }
      const redirectUrl = process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/signup`
        : 'http://localhost:5173/signup';
      return res.redirect(redirectUrl);
    }
  }

  @AuthEndpoint.GetMe()
  @Get('me')
  async getMe(@Req() req) {
    // Get user data with permissions
    const userWithPermissions = await this.authService.getUserWithPermissions(
      req.user,
    );
    const userData = this.extractUserData(userWithPermissions);
    return this.responseService.success(
      'User information retrieved successfully',
      userData,
      200,
    );
  }

  @AuthEndpoint.Logout()
  @Post('logout')
  async logout(@Res() res: Response) {
    return this.handleLogout(res);
  }

  @AuthEndpoint.SignupSuperAdmin(SignupSuperAdminDto)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('signup/super-admin')
  async signupSuperAdmin(@Body() dto: SignupSuperAdminDto) {
    return this.handleServiceOperation(
      () => this.authService.signupSuperAdmin(dto),
      'Super admin account created successfully',
      201,
    );
  }

  @AuthEndpoint.SignupSuperAdmin(CreateClientWithSuperAdminDto)
  @Post('create-client-with-admin')
  async createClientWithSuperAdmin(@Body() dto: CreateClientWithSuperAdminDto) {
    return this.handleServiceOperation(
      () => this.authService.createClientWithSuperAdmin(dto),
      'Client and super admin account created successfully',
      201,
    );
  }

  @AuthEndpoint.VerifyOTP()
  @Post('verify-otp')
  async verifyOTP(@Body() body) {
    return this.handleServiceOperation(
      () => this.authService.verifyOTP(body.email, body.otp),
      'OTP verified successfully',
      200,
    );
  }

  @AuthEndpoint.ResendOTP(ResendOtpDto)
  @Post('resend-otp')
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.handleServiceOperation(
      () => this.authService.resendOtp(dto.email),
      'OTP resent successfully',
      200,
    );
  }

  @AuthEndpoint.LoginEndpoint(LoginDto)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res) {
    const resp = await this.authService.login(dto);

    res.cookie('accessToken', resp.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    res.cookie('refreshToken', resp.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });

    return res.status(200).json(
      this.responseService.success(
        'Login successful',
        {
          user: resp.user,
          accessToken: resp.accessToken,
          refreshToken: resp.refreshToken,
        },
        200,
      ),
    );
  }

  @AuthEndpoint.RefreshToken(RefreshTokenDto)
  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.handleServiceOperation(
      () => this.authService.refreshToken(dto),
      'Token refreshed successfully',
      200,
    );
  }

  @AuthEndpoint.ForgotPassword(ForgotPasswordDto)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.handleServiceOperation(
      () => this.authService.forgotPassword(dto),
      'Password reset email sent successfully',
      200,
    );
  }

  @AuthEndpoint.ResetPassword(ResetPasswordDto)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.handleServiceOperation(
      () => this.authService.resetPassword(dto),
      'Password reset successfully',
      200,
    );
  }

  @AuthEndpoint.ChangePassword(ChangePasswordDto)
  @Post('change-password')
  async changePassword(@Body() dto: ChangePasswordDto, @Request() req) {
    return this.handleServiceOperation(
      () =>
        this.authService.changePassword(
          req.user.id,
          dto.currentPassword,
          dto.newPassword,
          dto.confirmPassword,
        ),
      'Password changed successfully',
      200,
    );
  }

  @AuthEndpoint.InviteUser(InviteDto)
  @Post('invite')
  async invite(@Body() dto: InviteDto, @Request() req) {
    return this.handleServiceOperation(
      () =>
        this.authService.invite(
          dto,
          req.user.id,
          req.user.role,
          req.user.stores,
        ),
      'Invitation sent successfully',
      201,
    );
  }

  @AuthEndpoint.AcceptInvite(AcceptInviteDto)
  @Post('accept-invite')
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.handleServiceOperation(
      () => this.authService.acceptInvite(dto),
      'Invitation accepted successfully',
      200,
    );
  }

  @AuthEndpoint.GetPermissions()
  @Get('permissions')
  async getPermissions(@Request() req, @Query('storeId') storeId: string) {
    return this.handleServiceOperation(
      () => this.authService.getPermissions(req.user.id, storeId),
      'User permissions retrieved successfully',
      200,
    );
  }

  @AuthEndpoint.SignupSuperAdmin(SignupSuperAdminDto)
  @Post('fix-super-admin-permissions')
  async fixSuperAdminPermissions(@Body() body: { email: string }) {
    return this.handleServiceOperation(
      () => this.authService.fixSuperAdminPermissions(body.email),
      'Super admin permissions fixed successfully',
      200,
    );
  }
  @AuthEndpoint.SignupSuperAdmin(FixClientRecordDto)
  @Post('fix-client-record')
  async fixClientRecord(@Body() body: FixClientRecordDto) {
    return this.handleServiceOperation(
      () => this.authService.fixClientRecord(body.clientId),
      'Client record fixed successfully',
      200,
    );
  }

  @AuthEndpoint.SignupSuperAdmin(FixUserRecordDto)
  @Post('fix-user-record')
  async fixUserRecord(@Body() body: FixUserRecordDto) {
    return this.handleServiceOperation(
      () => this.authService.fixUserRecord(body.userId),
      'User record fixed successfully',
      200,
    );
  }

  @AuthEndpoint.GetPermissions()
  @Get('test-super-admin-access')
  async testSuperAdminAccess(@Request() req) {
    return this.handleServiceOperation(
      () => this.authService.testSuperAdminAccess(req.user),
      'Super admin access test completed',
      200,
    );
  }
}
