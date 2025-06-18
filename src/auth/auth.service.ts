import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { google } from 'googleapis';
import { MailService } from '../mail/mail.service';
import {
  GoogleProfileDto,
  AuthResponseDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  SignupSuperAdminDto,
  LoginDto,
  ResetPasswordDto,
  InviteDto,
  AcceptInviteDto,
} from './dto/auth.dto';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { Role, Status } from '@prisma/client';

import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}
  async googleLogin(googleUser: GoogleProfileDto): Promise<AuthResponseDto> {
    try {
      // Check if user exists by Google ID
      let user = await this.prisma.users.findUnique({
        where: { googleId: googleUser.id },
        include: { client: true },
      } as any); // Temporary type assertion

      // If not found by googleId, check by email
      if (!user) {
        user = await this.prisma.users.findUnique({
          where: { email: googleUser.email },
          include: { client: true },
        });

        // If user exists with same email but no googleId, link the accounts
        if (user) {
          user = await this.prisma.users.update({
            where: { id: user.id },
            data: {
              googleId: googleUser.id,
              googleRefreshToken: googleUser.refreshToken || null,
            },
            include: { client: true },
          } as any); // Temporary type assertion
        }
      }

      // If no user exists, create a new one using the configured strategy
      if (!user) {
        user = await this.handleGoogleUserCreation(googleUser);
      }

      // Update refresh token if provided
      if (googleUser.refreshToken) {
        await this.prisma.users.update({
          where: { id: user.id },
          data: { googleRefreshToken: googleUser.refreshToken },
        } as any); // Temporary type assertion
      }

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        googleId: (user as any).googleId, // Temporary type assertion
      };

      // Generate access token (15 minutes)
      const accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      });

      // Generate refresh token (7 days)
      const refreshToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      });

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          clientId: user.clientId,
          provider: 'google',
        },
        message: 'Google authentication successful',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Google authentication failed');
    }
  }

  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      return null;
    }
  }

  private getDatabaseUrl(): string {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new InternalServerErrorException('Database URL is not configured');
    }
    return databaseUrl;
  }

  private generateOtp(): string {
    // In production, use a more secure random number generator
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async validateInput(dto: SignupSuperAdminDto): Promise<void> {
    const { firstName, lastName, email, password } = dto;

    if (!firstName || !lastName || !email || !password) {
      throw new BadRequestException('All fields are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one uppercase letter and one number',
      );
    }
  }

  async signupSuperAdmin(dto: SignupSuperAdminDto) {
    try {
      // Validate input
      await this.validateInput(dto);

      const { firstName, lastName, email, password } = dto;

      // Check for existing user
      const existingUser = await this.prisma.users.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate OTP
      const otp = this.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration

      // Create transaction for client and user creation
      const result = await this.prisma.$transaction(async (tx) => {
        // Create client
        const client = await tx.clients.create({
          data: {
            name: `${firstName} ${lastName}'s Organization`,
            email,
            databaseUrl: this.getDatabaseUrl(),
            tier: 'free',
          },
          select: { id: true },
        });

        // Create user with OTP
        const user = await tx.users.create({
          data: {
            firstName,
            lastName,
            email,
            passwordHash,
            role: Role.super_admin,
            clientId: client.id,
            status: Status.active,
            otp,
            otpExpiresAt,
            isOtpUsed: false,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        });

        return { client, user };
      });

      const { client, user } = result;

      if (!client || !user) {
        throw new InternalServerErrorException(
          'Failed to create client or user',
        );
      }

      // Send OTP email
      await this.mailService.sendMail({
        to: email,
        subject: 'Your OTP Code - Accurack',
        html: `<p>Your OTP code is: <strong>${otp}</strong></p>`,
      });

      // Create audit log
      await this.prisma.auditLogs.create({
        data: {
          userId: user.id,
          action: 'user_created',
          resource: 'auth',
          details: {
            role: Role.super_admin,
            email,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        message: 'Super Admin created successfully',
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      // Handle specific Prisma errors
      if (error.code === 'P2002') {
        throw new BadRequestException('Email already exists');
      }

      // Log error for debugging (in production, use proper logging service)
      console.error('Super admin signup error:', error);

      // Throw appropriate error
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException('Failed to create Super Admin');
    }
  }

  private async validateOtpInput(email: string, otp: string): Promise<void> {
    // Validate email
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate OTP
    if (!otp) {
      throw new BadRequestException('OTP is required');
    }

    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestException('OTP must be a 6-digit number');
    }
  }

  async verifyOTP(email: string, otp: string): Promise<{ message: string }> {
    try {
      // Validate input
      await this.validateOtpInput(email, otp);

      // Find user with OTP
      const user = await this.prisma.users.findFirst({
        where: {
          email,
          otp,
          otpExpiresAt: { gt: new Date() },
          isOtpUsed: false,
        },
        select: {
          id: true,
          otpExpiresAt: true,
        },
      });

      // Verify OTP existence and validity
      if (!user) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      // Mark OTP as used
      await this.prisma.users.update({
        where: { id: user.id },
        data: { isOtpUsed: true, otp: null, otpExpiresAt: null },
      });

      // Log OTP verification
      await this.prisma.auditLogs.create({
        data: {
          userId: user.id,
          action: 'otp_verified',
          resource: 'auth',
          details: {
            email,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return { message: 'OTP verified successfully' };
    } catch (error) {
      // Log error for debugging (in production, use proper logging service)
      console.error('OTP verification error:', error);

      // Handle specific errors
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to verify OTP');
    }
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: Role;
      stores: { storeId: string }[];
    };
  }> {
    const { email, password } = dto;

    const user = await this.prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
        clientId: true,
        stores: { select: { storeId: true } },
      },
    });
    if (!user || user.status !== Status.active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }
    const payload = {
      id: user.id,
      role: user.role,
      email: user.email,
      clientId: user.clientId,
      stores: user.stores,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    await this.prisma.auditLogs.create({
      data: {
        userId: user.id,
        action: 'login',
        resource: 'auth',
        details: { email },
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        stores: user.stores,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const { refreshToken } = dto;
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      });

      const user = await this.prisma.users.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          role: true,
          email: true,
          clientId: true,
          status: true,
          stores: { select: { storeId: true } },
        },
      });
      if (!user || user.status !== Status.active) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const payload = {
        id: user.id,
        role: user.role,
        email: user.email,
        clientId: user.clientId,
        stores: user.stores,
      };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

    const user = await this.prisma.users.findUnique({
      where: { email },
      select: { id: true, firstName: true, email: true },
    });
    if (!user) {
      // Silently return to prevent email enumeration
      return { message: 'If an account exists, a reset link has been sent.' };
    }

    console.log(`Password reset requested for user: ${user.email}`);
    // Invalidate existing tokens
    await this.prisma.passwordResetTokens.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetTokens.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    console.log(`Reset link: ${resetLink}`);
    try {
      await this.mailService.sendMail({
        to: user.email,
        subject: 'Password Reset Request',
        html: `<p>Hi ${user.firstName},</p>
               <p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset your password. The link expires in 1 hour.</p>
               <p>If you didn't request this, please ignore this email.</p>`,
      });
    } catch (error) {
      await this.prisma.passwordResetTokens.deleteMany({
        where: { token },
      });
      throw new BadRequestException('Failed to send reset email');
    }

    await this.prisma.auditLogs.create({
      data: {
        userId: user.id,
        action: 'password_reset_requested',
        resource: 'auth',
        details: { email },
      },
    });

    return { message: 'If an account exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { token, password } = dto;

    const resetToken = await this.prisma.passwordResetTokens.findUnique({
      where: { token },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    if (resetToken.usedAt) {
      throw new BadRequestException('Reset token already used');
    }
    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Reset token expired');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: resetToken.userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.users.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await this.prisma.passwordResetTokens.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    await this.prisma.auditLogs.create({
      data: {
        userId: user.id,
        action: 'password_reset',
        resource: 'auth',
        details: { email: user.email },
      },
    });

    return { message: 'Password reset successfully' };
  }

  async invite(
    dto: InviteDto,
    userId: string,
    userRole: Role,
    userStores: { storeId: string }[],
  ) {
    const { email, storeId, role } = dto;

    if (role === Role.admin && userRole !== Role.super_admin) {
      throw new ForbiddenException('Only Super Admin can invite Admins');
    }

    const store = await this.prisma.stores.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, clientId: true },
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (
      userRole === Role.admin &&
      !userStores.some((s) => s.storeId === storeId)
    ) {
      throw new ForbiddenException('No access to this store');
    }

    const existingInvite = await this.prisma.inviteLinks.findFirst({
      where: {
        email,
        userId,
        status: Status.pending,
      },
      select: { id: true },
    });
    if (existingInvite) {
      throw new BadRequestException(
        'Active invite already exists for this email',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');

    const invite = await this.prisma.inviteLinks.create({
      data: {
        token,
        email,
        role,
        userId,
        status: Status.pending,
      },
      select: { id: true, token: true },
    });

    const inviteLink = `${process.env.FRONTEND_URL}/invite?token=${token}`;
    try {
      await this.mailService.sendMail({
        to: email,
        subject: `Invitation to join ${store.name} as ${role}`,
        html: `<p>Click <a href="${inviteLink}">here</a> to create your account.</p>`,
      });
    } catch (error) {
      await this.prisma.inviteLinks.delete({ where: { id: invite.id } });
      throw new BadRequestException('Failed to send invitation email');
    }

    await this.prisma.auditLogs.create({
      data: {
        userId,
        action: 'invite_sent',
        resource: 'auth',
        details: { email, role, storeId },
      },
    });

    return { message: 'Invite link generated', inviteLink };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const { token, firstName, lastName, password } = dto;

    const invite = await this.prisma.inviteLinks.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        userId: true,
      },
    });
    if (!invite) {
      throw new BadRequestException('Invalid invite link');
    }
    if (invite.status !== Status.pending) {
      throw new BadRequestException('Invite link already used or invalid');
    }

    const existingUser = await this.prisma.users.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const inviter = await this.prisma.users.findUnique({
      where: { id: invite.userId },
      select: { id: true, clientId: true },
    });
    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.users.create({
      data: {
        firstName,
        lastName,
        email: invite.email,
        passwordHash,
        role: invite.role,
        clientId: inviter.clientId,
        status: Status.active,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    await this.prisma.userStoreMap.create({
      data: {
        userId: user.id,
        storeId: invite.userId, // Assuming userId is storeId; adjust if needed
      },
    });

    if (invite.role === Role.employee) {
      await this.prisma.employees.create({
        data: {
          name: `${firstName} ${lastName}`,
          email: invite.email,
          storeId: invite.userId, // Adjust if storeId is stored elsewhere
          status: Status.active,
        },
      });

      await this.prisma.notifications.create({
        data: {
          userId: invite.userId,
          title: 'Account Created',
          message: `${firstName} ${lastName} has created an account as an employee.`,
          read: false,
        },
      });
    }

    await this.prisma.inviteLinks.update({
      where: { token },
      data: { status: Status.active },
    });

    await this.prisma.auditLogs.create({
      data: {
        userId: user.id,
        action: 'user_created',
        resource: 'auth',
        details: { role: invite.role, email: invite.email },
      },
    });

    return {
      message: 'Account created successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getPermissions(userId: string, storeId: string) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        stores: { select: { storeId: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const storeAccess = user.stores.find((s) => s.storeId === storeId);
    if (!storeAccess) {
      throw new ForbiddenException('No access to this store');
    }

    if (user.role === Role.super_admin || user.role === Role.admin) {
      const permissions = await this.prisma.permissions.findMany({
        where: { userId },
        select: { id: true, action: true, resource: true },
      });
      return {
        role: user.role,
        permissions,
        permissionGroups: [],
      };
    }

    const employee = await this.prisma.employees.findFirst({
      where: {
        email: user.email,
        storeId: storeId,
      },
      select: { id: true },
    });
    if (!employee) {
      throw new ForbiddenException('No employee record for this store');
    }

    const [permissions, permissionGroups] = await Promise.all([
      this.prisma.employeePermissions.findMany({
        where: { employeeId: employee.id },
        select: {
          id: true,
          action: true,
          resource: true,
        },
      }),
      this.prisma.employeePermissionGroups.findMany({
        where: { employeeId: employee.id },
        select: {
          permissionGroup: {
            select: {
              id: true,
              name: true,
              items: {
                select: {
                  id: true,
                  action: true,
                  resource: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      role: user.role,
      permissions,
      permissionGroups: permissionGroups.map((pg) => ({
        name: pg.permissionGroup.name,
        permissions: pg.permissionGroup.items,
      })),
    };
  }

  async getGoogleUserInfo(user: any) {
    try {
      // Check if the user has a Google access token stored
      if (!user.googleAccessToken) {
        throw new UnauthorizedException(
          'No Google access token available. Please re-authenticate with Google.',
        );
      }

      // Make request to Google's userinfo endpoint with the access token
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${user.googleAccessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new UnauthorizedException(
            'Google access token is invalid or expired. Please re-authenticate.',
          );
        }
        throw new BadRequestException(
          `Failed to fetch Google user info: ${response.statusText}`,
        );
      }

      const googleUserInfo = await response.json();

      return {
        message: 'Google user information retrieved successfully',
        data: googleUserInfo,
        tokenUsed: user.googleAccessToken.substring(0, 10) + '...', // Show first 10 chars for debugging
      };
    } catch (error) {
      console.error('Error fetching Google user info:', error);

      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to retrieve Google user information',
      );
    }
  }

  async refreshGoogleToken(userId: string): Promise<string | null> {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: { googleRefreshToken: true },
      } as any); // Temporary type assertion

      if (!(user as any)?.googleRefreshToken) {
        return null;
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL ||
          'http://localhost:4000/api/v1/auth/google/callback',
      );

      oauth2Client.setCredentials({
        refresh_token: (user as any).googleRefreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      // If a new refresh token is provided, update it in the database
      if (credentials.refresh_token) {
        await this.prisma.users.update({
          where: { id: userId },
          data: { googleRefreshToken: credentials.refresh_token },
        } as any); // Temporary type assertion
      }

      return credentials.access_token || null;
    } catch (error) {
      console.error('Error refreshing Google token:', error);
      return null;
    }
  }

  /**
   * Alternative approach: Handle different Google user scenarios
   * You can configure this behavior based on your needs
   */
  private async handleGoogleUserCreation(googleUser: GoogleProfileDto) {
    // Strategy 1: Create with default client (current implementation)
    // Strategy 2: Require invitation (uncomment the line below)
    // throw new BadRequestException('Google authentication requires an invitation. Please contact your administrator.');

    // Strategy 3: Allow self-registration with limited permissions
    // Create user with a specific "guest" client

    const defaultClient = await this.getOrCreateDefaultClient();

    return await this.prisma.users.create({
      data: {
        googleId: googleUser.id,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        email: googleUser.email,
        passwordHash: '', // Empty for Google users
        googleRefreshToken: googleUser.refreshToken || null,
        role: 'employee', // You can change this to 'guest' or another role
        clientId: defaultClient.id,
        status: 'active',
      },
      include: { client: true },
    } as any);
  }

  private async getOrCreateDefaultClient() {
    let defaultClient = await this.prisma.clients.findFirst({
      where: { email: 'default@accurack.com' },
    });

    if (!defaultClient) {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new InternalServerErrorException(
          'Database URL is not configured',
        );
      }

      defaultClient = await this.prisma.clients.create({
        data: {
          name: 'Default Client',
          email: 'default@accurack.com',
          tier: 'free',
          databaseUrl: databaseUrl,
        },
      });
    }

    return defaultClient;
  }
}
