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
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  InviteDto,
  AcceptInviteDto,
} from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { ResponseService, BaseAuthController, AuthEndpoint, CookieHelper } from '../common';

@ApiTags('Authentication')
@Controller('auth')
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
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    return this.handleGoogleAuth(res, () =>
      this.authService.googleLogin(req.user),
    );
  }

  @AuthEndpoint.GetMe()
  @Get('me')
  getMe(@Req() req) {
    const userData = this.extractUserData(req.user);
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
  @Post('signup/super-admin')
  async signupSuperAdmin(@Body() dto: SignupSuperAdminDto) {
    return this.handleServiceOperation(
      () => this.authService.signupSuperAdmin(dto),
      'Super admin account created successfully',
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

  // @AuthEndpoint.LoginEndpoint(LoginDto)
  // @Post('login')
  // async login(@Body() dto: LoginDto, @Res() res) {
  //   return this.handleCookieAuth(
  //     res,
  //     () => this.authService.login(dto),
  //     'Login successful',
  //     200,
  //   );
  // }

  @AuthEndpoint.LoginEndpoint(LoginDto)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    try {
      const result = await this.authService.login(dto);

      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'none', // Prevent CSRF attacks 
        maxAge:  15 * 60 * 1000, // 15 mins
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'none', // Prevent CSRF attacks
        maxAge:  7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return clean response without duplicate tokens
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken, // Only include if frontend needs it
          refreshToken: result.refreshToken, // Only include if frontend needs it
        },
      });
    } catch (error) {
      throw error;
    }
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
}
