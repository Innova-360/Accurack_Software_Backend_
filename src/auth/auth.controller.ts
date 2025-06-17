import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Version,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  SignupSuperAdminDto,
  InviteDto,
  AcceptInviteDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { RolesGuard } from '../guard/roles.guard';
import { Roles } from '../decorator/roles.decorator';
import { Role } from '@prisma/client';
import { Public } from '../decorator/public.decorator';
import { verify } from 'crypto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
      const {accessToken, refreshToken, user} = await this.authService.login(dto);
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        sameSite: 'none', // Adjust as necessary
      });
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
      });
      console.log('Access Token:', accessToken);
      console.log('Refresh Token:', refreshToken);
      console.log('User:', user);
      return res.status(200).json({ data: user, status: 200, message: 'Login successful' });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: error.message, status: 500, message: 'Login failed' });
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
