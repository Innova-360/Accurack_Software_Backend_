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
import { PermissionsService } from '../permissions/permissions.service';
import {
  GoogleProfileDto,
  AuthResponseDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  SignupSuperAdminDto,
  CreateClientWithSuperAdminDto,
  LoginDto,
  ResetPasswordDto,
  InviteDto,
  AcceptInviteDto,
} from './dto/auth.dto';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { MultiTenantService } from '../database/multi-tenant.service';
import { Role, Status } from '@prisma/client';

import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly permissionsService: PermissionsService,
    private readonly multiTenantService: MultiTenantService,
  ) {}
  async googleLogin(googleUser: GoogleProfileDto): Promise<AuthResponseDto> {
    try {
      // Try to find user by Google ID or email across all databases
      let user = await this.findUserAcrossDatabases(googleUser.email, {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        clientId: true,
        googleId: true,
        stores: { select: { storeId: true } },
      });

      // If not found by googleId, check by email and link googleId if needed
      if (!user) {
        user = await this.findUserAcrossDatabases(googleUser.email, {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
          clientId: true,
          googleId: true,
          stores: { select: { storeId: true } },
        });
        // If user exists with same email but no googleId, link the accounts
        if (user && !user.googleId) {
          await this.prisma.users.update({
            where: { id: user.id },
            data: {
              googleId: googleUser.id,
              googleRefreshToken: googleUser.refreshToken || null,
            },
          });
          user.googleId = googleUser.id;
        }
      }

      // If no user exists, throw error (or handle creation if desired)
      if (!user) {
        throw new BadRequestException('Failed to create or find user');
      }

      // Update refresh token if provided
      if (googleUser.refreshToken && user) {
        await this.prisma.users.update({
          where: { id: user.id },
          data: { googleRefreshToken: googleUser.refreshToken },
        });
      }

      // Fix stores property handling
      const stores =
        user.role === Role.super_admin
          ? ['*']
          : Array.isArray(user.stores)
            ? user.stores.map((s: any) => (typeof s === 'string' ? s : s.storeId))
            : [];

      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        stores: stores,
        googleId: user.googleId, // Optionally include for Google-specific logic
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

      // Fetch user permissions (same logic as normal login)
      let userPermissions: any = null;
      try {
        if (user.clientId) {
          // For tenant users, get permissions from their tenant database
          const credentials = await this.multiTenantService['getTenantCredentials'](user.clientId);
          if (credentials) {
            const tenantDatabaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${credentials.databaseName}`;
            const tenantPrisma = new PrismaClient({
              datasources: { db: { url: tenantDatabaseUrl } },
            });
            try {
              await tenantPrisma.$connect();
              const permissions = await this.permissionsService.getUserPermissionsWithClient(
                tenantPrisma,
                user.id,
              );
              userPermissions = permissions;
            } finally {
              await tenantPrisma.$disconnect();
            }
          }
        } else {
          // For master database users (super_admin, admin), get permissions from master database
          userPermissions = await this.permissionsService.getUserPermissions(user.id);
        }
      } catch (error) {
        console.error('Failed to get user permissions during Google login:', error);
        userPermissions = {
          userId: user.id,
          permissions: [],
          roleTemplates: [],
        };
      }

      // Audit log (same as normal login)
      try {
        if (user.clientId) {
          const credentials = await this.multiTenantService['getTenantCredentials'](user.clientId);
          if (credentials) {
            const tenantDatabaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${credentials.databaseName}`;
            const tenantPrisma = new PrismaClient({
              datasources: { db: { url: tenantDatabaseUrl } },
            });
            try {
              await tenantPrisma.$connect();
              await tenantPrisma.auditLogs.create({
                data: {
                  userId: user.id,
                  action: 'google_login',
                  resource: 'auth',
                  details: { email: user.email },
                },
              });
            } finally {
              await tenantPrisma.$disconnect();
            }
          }
        } else {
          await this.prisma.auditLogs.create({
            data: {
              userId: user.id,
              action: 'google_login',
              resource: 'auth',
              details: { email: user.email },
            },
          });
        }
      } catch (error) {
        console.error('Failed to create audit log for Google login:', error);
      }

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role || undefined,
          clientId: user.clientId,
          stores: stores,
          permissions: userPermissions,
          provider: 'google',
          googleId: user.googleId,
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
    const { firstName, lastName, email, password, clientId } = dto;

    if (!firstName || !lastName || !email || !password || !clientId) {
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

    // Validate UUID format for clientId
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clientId)) {
      throw new BadRequestException('Invalid client ID format');
    }
  }

  async signupSuperAdmin(dto: SignupSuperAdminDto) {
    try {
      // Validate input
      await this.validateInput(dto);

      const { firstName, lastName, email, password, clientId } = dto;

      // Check if the client/tenant exists
      const client = await this.prisma.clients.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, status: true },
      });

      if (!client) {
        throw new BadRequestException('Invalid client ID - tenant not found');
      }

      if (client.status !== 'active') {
        throw new BadRequestException('Client/tenant is not active');
      }

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

      // Create user only (client already exists)
      const user = await this.prisma.users.create({
        data: {
          firstName,
          lastName,
          email,
          passwordHash,
          role: Role.super_admin,
          clientId: clientId, // Use provided clientId
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

      if (!user) {
        throw new InternalServerErrorException('Failed to create user');
      }
      await this.permissionsService.assignDefaultPermissions(user.id);

      // Send OTP email
      await this.mailService.sendMail({
        to: email,
        subject: 'Your OTP Code - Accurack',
        html: `<p>Your OTP code is: <strong>${otp}</strong></p>`,
      });

      // Assign default permissions for super admin
      try {
        await this.permissionsService.assignDefaultPermissions(user.id);
      } catch (error) {
        console.error(
          'Failed to assign default permissions to super admin:',
          error,
        );
      }

      // Create audit log
      await this.prisma.auditLogs.create({
        data: {
          userId: user.id,
          action: 'user_created',
          resource: 'auth',
          details: {
            role: Role.super_admin,
            email,
            clientId,
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
          clientId: clientId,
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

  async resendOtp(email: string): Promise<{ message: string }> {
    try {
      // Validate email
      if (!email) {
        throw new BadRequestException('Email is required');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new BadRequestException('Invalid email format');
      }

      // Find user with this email
      const user = await this.prisma.users.findUnique({
        where: { email },
        select: {
          id: true,
          firstName: true,
          email: true,
          status: true,
          isOtpUsed: true,
        },
      });

      if (!user) {
        // Silently return to prevent email enumeration
        return {
          message:
            'If an account exists, a new OTP has been sent to your email.',
        };
      }

      if (user.status !== Status.active) {
        throw new BadRequestException('User account is not active');
      }

      // Check if OTP is already verified
      if (user.isOtpUsed) {
        throw new BadRequestException(
          'Account is already verified. Please login instead.',
        );
      }

      // Generate new OTP
      const otp = this.generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration

      // Update user with new OTP
      await this.prisma.users.update({
        where: { id: user.id },
        data: {
          otp,
          otpExpiresAt,
          isOtpUsed: false,
        },
      });

      // Send OTP email
      await this.mailService.sendMail({
        to: email,
        subject: 'Your New OTP Code - Accurack',
        html: `
          <h2>Your New OTP Code</h2>
          <p>Hi ${user.firstName},</p>
          <p>You requested a new OTP code. Here is your verification code:</p>
          <h3 style="color: #007bff; font-size: 24px; letter-spacing: 2px;">${otp}</h3>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });

      // Create audit log
      await this.prisma.auditLogs.create({
        data: {
          userId: user.id,
          action: 'otp_resent',
          resource: 'auth',
          details: {
            email,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return { message: 'A new OTP has been sent to your email address.' };
    } catch (error) {
      // Log error for debugging
      console.error('Resend OTP error:', error);

      // Handle specific errors
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to resend OTP');
    }
  }

  /**
   * Helper method to find user across master and tenant databases
   */
  private async findUserAcrossDatabases(
    email: string,
    selectFields: any = {},
  ): Promise<any | null> {
    // First, try to find user in master database
    let user = await this.prisma.users.findUnique({
      where: { email },
      select: selectFields,
    });

    // If user not found in master database, search in tenant databases
    if (!user) {
      console.log(
        `User ${email} not found in master database, searching tenant databases...`,
      );

      // Get all active clients from master database
      const clients = await this.prisma.clients.findMany({
        where: { status: 'active' },
        select: { id: true, name: true },
      });

      // Search each tenant database for the user
      for (const client of clients) {
        try {
          const credentials = await this.multiTenantService[
            'getTenantCredentials'
          ](client.id);
          if (!credentials) continue;

          const tenantDatabaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${credentials.databaseName}`;

          const tenantPrisma = new PrismaClient({
            datasources: { db: { url: tenantDatabaseUrl } },
          });

          try {
            await tenantPrisma.$connect();

            const tenantUser = await tenantPrisma.users.findUnique({
              where: { email },
              select: selectFields,
            });

            if (tenantUser) {
              user = tenantUser;
              console.log(
                `Found user ${email} in tenant database for client: ${client.name}`,
              );
              break;
            }
          } finally {
            await tenantPrisma.$disconnect();
          }
        } catch (error) {
          console.error(
            `Error searching tenant database for client ${client.id}:`,
            error,
          );
          continue;
        }
      }
    }

    return user;
  }

  /**
   * Helper method to find user by ID across master and tenant databases
   */
  private async findUserByIdAcrossDatabases(
    userId: string,
    clientId?: string,
    selectFields: any = {},
  ): Promise<any | null> {
    // First, try to find user in master database
    let user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: selectFields,
    });

    // If user not found in master database and has clientId, check tenant database
    if (!user && clientId) {
      try {
        const credentials =
          await this.multiTenantService['getTenantCredentials'](clientId);
        if (credentials) {
          const tenantDatabaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${credentials.databaseName}`;

          const tenantPrisma = new PrismaClient({
            datasources: { db: { url: tenantDatabaseUrl } },
          });

          try {
            await tenantPrisma.$connect();

            user = await tenantPrisma.users.findUnique({
              where: { id: userId },
              select: selectFields,
            });
          } finally {
            await tenantPrisma.$disconnect();
          }
        }
      } catch (error) {
        console.error('Error finding user in tenant database:', error);
      }
    }

    return user;
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      stores: { storeId: string }[] | string[];
      permissions: any;
    };
  }> {
    const { email, password } = dto;

    // First, try to find user in master database (for super_admin, admin, etc.)
    let user = await this.findUserAcrossDatabases(email, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      clientId: true,
      stores: { select: { storeId: true } },
    });

    // Add type guard
    if (Array.isArray(user)) {
      throw new Error('Unexpected: findUserAcrossDatabases returned an array');
    }

    if (!user || user.status !== Status.active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    // Fix stores property handling
    const stores =
      user.role === Role.super_admin
        ? ['*']
        : Array.isArray(user.stores)
          ? user.stores.map((s: any) => (typeof s === 'string' ? s : s.storeId))
          : [];

    const payload = {
      id: user.id,
      role: user.role,
      email: user.email,
      clientId: user.clientId,
      stores: stores,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '24h',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
    console.log('🔍 JWT TOKENS:', accessToken);
    console.log('🔍 JWT payload:', payload);

    // Create audit log in the appropriate database
    try {
      if (user.clientId) {
        // User is from tenant database, create audit log there
        const credentials = await this.multiTenantService[
          'getTenantCredentials'
        ](user.clientId);
        if (credentials) {
          const tenantDatabaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${credentials.databaseName}`;
          const tenantPrisma = new PrismaClient({
            datasources: { db: { url: tenantDatabaseUrl } },
          });

          try {
            await tenantPrisma.$connect();
            await tenantPrisma.auditLogs.create({
              data: {
                userId: user.id,
                action: 'login',
                resource: 'auth',
                details: { email },
              },
            });
          } finally {
            await tenantPrisma.$disconnect();
          }
        }
      } else {
        // User is from master database
        await this.prisma.auditLogs.create({
          data: {
            userId: user.id,
            action: 'login',
            resource: 'auth',
            details: { email },
          },
        });
      }
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't fail login if audit log fails
    }

    // Get user permissions for all stores they have access to
    let userPermissions: any = null;
    try {
      if (user.clientId) {
        // For tenant users, get permissions from their tenant database
        const credentials = await this.multiTenantService[
          'getTenantCredentials'
        ](user.clientId);
        if (credentials) {
          const tenantDatabaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${credentials.databaseName}`;
          const tenantPrisma = new PrismaClient({
            datasources: { db: { url: tenantDatabaseUrl } },
          });

          try {
            await tenantPrisma.$connect();
            // Get permissions for all stores the user has access to
            const permissions =
              await this.permissionsService.getUserPermissionsWithClient(
                tenantPrisma,
                user.id,
              );
            userPermissions = permissions;
          } finally {
            await tenantPrisma.$disconnect();
          }
        }
      } else {
        // For master database users (super_admin, admin), get permissions from master database
        userPermissions = await this.permissionsService.getUserPermissions(
          user.id,
        );
      }
    } catch (error) {
      console.error('Failed to get user permissions during login:', error);
      // Don't fail login if permissions fetch fails, just set to empty
      userPermissions = {
        userId: user.id,
        permissions: [],
        roleTemplates: [],
      };
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role ?? 'employee',
        stores: stores,
        permissions: userPermissions,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const { refreshToken } = dto;
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET, // Use same secret as access token
      });

      // First, try to find user in master database
      let user = await this.findUserByIdAcrossDatabases(
        decoded.id,
        decoded.clientId,
        {
          id: true,
          role: true,
          email: true,
          clientId: true,
          status: true,
          stores: { select: { storeId: true } },
        },
      );

      // Add type guard
      if (Array.isArray(user)) {
        throw new Error(
          'Unexpected: findUserByIdAcrossDatabases returned an array',
        );
      }

      if (!user || user.status !== Status.active) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Fix stores property handling
      const stores =
        user.role === Role.super_admin
          ? ['*']
          : Array.isArray(user.stores)
            ? user.stores.map((s: any) =>
                typeof s === 'string' ? s : s.storeId,
              )
            : [];

      const payload = {
        id: user.id,
        role: user.role,
        email: user.email,
        clientId: user.clientId,
        stores: stores,
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

    // First, try to find user in master database
    let user = await this.findUserAcrossDatabases(email, {
      id: true,
      firstName: true,
      email: true,
      clientId: true,
      role: true,
    });

    // Add type guard
    if (Array.isArray(user)) {
      throw new Error('Unexpected: findUserAcrossDatabases returned an array');
    }

    if (!user) {
      // Silently return to prevent email enumeration
      return { message: 'If an account exists, a reset link has been sent.' };
    }

    console.log(
      `Password reset requested for user: ${user.email} (role: ${user.role}, clientId: ${user.clientId})`,
    );

    // Create password reset token in the appropriate database
    try {
      // Check if user is from tenant database (employees, managers) vs master database (super_admin, admin)
      const isTenantUser =
        user.role === Role.employee || user.role === Role.manager;

      if (isTenantUser && user.clientId) {
        // User is from tenant database (employee/manager), create reset token there
        const credentials = await this.multiTenantService[
          'getTenantCredentials'
        ](user.clientId);
        if (credentials) {
          const tenantDatabaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${credentials.databaseName}`;
          const tenantPrisma = new PrismaClient({
            datasources: { db: { url: tenantDatabaseUrl } },
          });

          try {
            await tenantPrisma.$connect();

            // Invalidate existing tokens
            await tenantPrisma.passwordResetTokens.updateMany({
              where: { userId: user.id, usedAt: null },
              data: { usedAt: new Date() },
            });

            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            await tenantPrisma.passwordResetTokens.create({
              data: {
                token,
                userId: user.id,
                expiresAt,
              },
            });

            const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
            console.log(`Reset link: ${resetLink}`);

            await this.mailService.sendMail({
              to: user.email,
              subject: 'Password Reset Request',
              html: `<p>Hi ${user.firstName},</p>
                     <p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset your password. The link expires in 1 hour.</p>
                     <p>If you didn't request this, please ignore this email.</p>`,
            });

            await tenantPrisma.auditLogs.create({
              data: {
                userId: user.id,
                action: 'password_reset_requested',
                resource: 'auth',
                details: { email },
              },
            });
          } finally {
            await tenantPrisma.$disconnect();
          }
        }
      } else {
        // User is from master database (super_admin, admin)
        console.log(
          `Creating reset token in master database for ${user.role} user`,
        );

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

        await this.mailService.sendMail({
          to: user.email,
          subject: 'Password Reset Request',
          html: `<p>Hi ${user.firstName},</p>
                 <p>You requested a password reset. Click <a href="${resetLink}">here</a> to reset your password. The link expires in 1 hour.</p>
                 <p>If you didn't request this, please ignore this email.</p>`,
        });

        await this.prisma.auditLogs.create({
          data: {
            userId: user.id,
            action: 'password_reset_requested',
            resource: 'auth',
            details: { email },
          },
        });
      }
    } catch (error) {
      console.error('Failed to process password reset:', error);
      // Don't expose internal errors to user
    }

    return { message: 'If an account exists, a reset link has been sent.' };
  }

  /**
   * Helper method to find reset token across master and tenant databases
   */
  private async findResetTokenAcrossDatabases(token: string): Promise<{
    resetToken: any;
    user: any;
    isTenantUser: boolean;
    clientId?: string;
  } | null> {
    // First, try to find reset token in master database
    let resetToken = await this.prisma.passwordResetTokens.findUnique({
      where: { token },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (resetToken) {
      // Token found in master database, get user info
      const user = await this.prisma.users.findUnique({
        where: { id: resetToken.userId },
        select: { id: true, email: true, clientId: true, role: true },
      });

      if (user) {
        return {
          resetToken,
          user,
          isTenantUser: false,
        };
      }
    }

    // If token not found in master database, search in tenant databases
    console.log(
      `Reset token ${token} not found in master database, searching tenant databases...`,
    );

    // Get all active clients from master database
    const clients = await this.prisma.clients.findMany({
      where: { status: 'active' },
      select: { id: true, name: true },
    });

    // Search each tenant database for the reset token
    for (const client of clients) {
      try {
        const credentials = await this.multiTenantService[
          'getTenantCredentials'
        ](client.id);
        if (!credentials) continue;

        const tenantDatabaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${credentials.databaseName}`;

        const tenantPrisma = new PrismaClient({
          datasources: { db: { url: tenantDatabaseUrl } },
        });

        try {
          await tenantPrisma.$connect();

          const tenantResetToken =
            await tenantPrisma.passwordResetTokens.findUnique({
              where: { token },
              select: { id: true, userId: true, expiresAt: true, usedAt: true },
            });

          if (tenantResetToken) {
            // Token found in tenant database, get user info
            const tenantUser = await tenantPrisma.users.findUnique({
              where: { id: tenantResetToken.userId },
              select: { id: true, email: true, clientId: true, role: true },
            });

            if (tenantUser) {
              console.log(
                `Found reset token ${token} in tenant database for client: ${client.name}`,
              );
              return {
                resetToken: tenantResetToken,
                user: tenantUser,
                isTenantUser: true,
                clientId: client.id,
              };
            }
          }
        } finally {
          await tenantPrisma.$disconnect();
        }
      } catch (error) {
        console.error(
          `Error searching tenant database for client ${client.id}:`,
          error,
        );
        continue;
      }
    }

    return null;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { token, password } = dto;

    // Find reset token across all databases
    const tokenData = await this.findResetTokenAcrossDatabases(token);

    if (!tokenData) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const { resetToken, user, isTenantUser, clientId } = tokenData;

    // Validate token
    if (resetToken.usedAt) {
      throw new BadRequestException('Reset token already used');
    }
    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Reset token expired');
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      // Check if user is from tenant database (employees, managers) vs master database (super_admin, admin)
      const isActuallyTenantUser =
        user.role === Role.employee || user.role === Role.manager;

      if (isActuallyTenantUser && clientId) {
        // User is from tenant database (employee/manager), update password there
        console.log(
          `Updating password in tenant database for ${user.role} user`,
        );
        const credentials =
          await this.multiTenantService['getTenantCredentials'](clientId);
        if (credentials) {
          const tenantDatabaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${credentials.databaseName}`;
          const tenantPrisma = new PrismaClient({
            datasources: { db: { url: tenantDatabaseUrl } },
          });

          try {
            await tenantPrisma.$connect();

            // Update password in tenant database
            await tenantPrisma.users.update({
              where: { id: user.id },
              data: { passwordHash },
            });

            // Mark token as used in tenant database
            await tenantPrisma.passwordResetTokens.update({
              where: { id: resetToken.id },
              data: { usedAt: new Date() },
            });

            // Create audit log in tenant database
            await tenantPrisma.auditLogs.create({
              data: {
                userId: user.id,
                action: 'password_reset',
                resource: 'auth',
                details: { email: user.email },
              },
            });
          } finally {
            await tenantPrisma.$disconnect();
          }
        }
      } else {
        // User is from master database (super_admin, admin)
        console.log(
          `Updating password in master database for ${user.role} user`,
        );

        // Update password in master database
        await this.prisma.users.update({
          where: { id: user.id },
          data: { passwordHash },
        });

        // Mark token as used in master database
        await this.prisma.passwordResetTokens.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        });

        // Create audit log in master database
        await this.prisma.auditLogs.create({
          data: {
            userId: user.id,
            action: 'password_reset',
            resource: 'auth',
            details: { email: user.email },
          },
        });
      }

      return { message: 'Password reset successfully' };
    } catch (error) {
      console.error('Failed to reset password:', error);
      throw new InternalServerErrorException('Failed to reset password');
    }
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
        storeId: invite.userId, // This should be the actual storeId from the invite
      },
    });

    // Assign default permissions using the new permission system
    try {
      await this.permissionsService.assignDefaultPermissions(
        user.id,
        invite.userId, // This should be the actual storeId
      );
    } catch (error) {
      console.error('Failed to assign default permissions:', error);
      // Continue without throwing error since user is already created
    }

    if (invite.role === Role.employee) {
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

  async getUserWithPermissions(reqUser: any) {
    try {
      // First, try to find user in master database
      const user = await this.findUserByIdAcrossDatabases(
        reqUser?.id,
        reqUser?.clientId,
        {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          clientId: true,
          googleId: true,
          status: true,
          stores: { select: { storeId: true } },
        },
      );

      // Add type guard
      if (Array.isArray(user)) {
        throw new Error(
          'Unexpected: findUserByIdAcrossDatabases returned an array',
        );
      }
      console.log('user', user);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Fix stores property handling
      const stores =
        user.role === Role.super_admin
          ? ['*']
          : Array.isArray(user.stores)
            ? user.stores.map((s: any) =>
                typeof s === 'string' ? s : s.storeId,
              )
            : [];

      // Get user permissions
      let userPermissions: any = null;
      try {
        if (user.clientId) {
          // For tenant users, get permissions from their tenant database
          const credentials = await this.multiTenantService[
            'getTenantCredentials'
          ](user.clientId);
          if (credentials) {
            const tenantDatabaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${credentials.databaseName}`;
            const tenantPrisma = new PrismaClient({
              datasources: { db: { url: tenantDatabaseUrl } },
            });

            try {
              await tenantPrisma.$connect();
              // Get permissions for all stores the user has access to
              const permissions =
                await this.permissionsService.getUserPermissionsWithClient(
                  tenantPrisma,
                  user.id,
                );
              userPermissions = permissions;
            } finally {
              await tenantPrisma.$disconnect();
            }
          }
        } else {
          // For master database users (super_admin, admin), get permissions from master database
          userPermissions = await this.permissionsService.getUserPermissions(
            user.id,
          );
        }
      } catch (error) {
        console.error('Failed to get user permissions:', error);
        // Don't fail if permissions fetch fails, just set to empty
        userPermissions = {
          userId: user.id,
          permissions: [],
          roleTemplates: [],
        };
      }

      return {
        ...user,
        stores: stores,
        permissions: userPermissions,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to get user with permissions',
      );
    }
  }

  async getPermissions(userId: string, storeId: string) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        include: {
          stores: { select: { storeId: true } },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const storeAccess = user.stores.find((s) => s.storeId === storeId);
      if (!storeAccess && user.role !== Role.super_admin) {
        throw new ForbiddenException('No access to this store');
      }

      // Use the new PermissionsService to get user permissions
      const userPermissions = await this.permissionsService.getUserPermissions(
        userId,
        storeId,
      );

      // For super_admin and admin, they have broader access
      if (user.role === Role.super_admin || user.role === Role.admin) {
        return {
          role: user.role,
          permissions: userPermissions.permissions,
          roleTemplates: userPermissions.roleTemplates,
          hasFullAccess: true,
        };
      }

      // For employees and managers, use user data directly since employee fields are now in User model
      // Check if user has access to this store
      const userStoreAccess = await this.prisma.userStoreMap.findFirst({
        where: {
          userId: user.id,
          storeId: storeId,
        },
      });

      if (!userStoreAccess) {
        throw new ForbiddenException('No access to this store');
      }

      if (user.status !== Status.active) {
        throw new ForbiddenException('User account is not active');
      }

      return {
        role: user.role,
        permissions: userPermissions.permissions,
        roleTemplates: userPermissions.roleTemplates,
        userInfo: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          status: user.status,
          employeeCode: (user as any).employeeCode,
          position: (user as any).position,
          department: (user as any).department,
        },
        hasFullAccess: false,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to get user permissions');
    }
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
      });

      if (!user?.googleRefreshToken) {
        return null;
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL ||
          'http://localhost:4000/api/v1/auth/google/callback',
      );

      oauth2Client.setCredentials({
        refresh_token: user.googleRefreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      // If a new refresh token is provided, update it in the database
      if (credentials.refresh_token) {
        await this.prisma.users.update({
          where: { id: userId },
          data: { googleRefreshToken: credentials.refresh_token },
        });
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

    const newUser = await this.prisma.users.create({
      data: {
        googleId: googleUser.id,
        firstName: googleUser.firstName || '', // Handle missing first name
        lastName: googleUser.lastName || '', // Handle missing last name
        email: googleUser.email,
        passwordHash: '', // Empty for Google users
        googleRefreshToken: googleUser.refreshToken || null,
        role: Role.employee, // You can change this to 'guest' or another role
        clientId: defaultClient.id,
        status: Status.active,
      },
      include: { client: true },
    });

    // Assign default permissions for new Google user
    try {
      await this.permissionsService.assignDefaultPermissions(newUser.id);
    } catch (error) {
      console.error(
        'Failed to assign default permissions to Google user:',
        error,
      );
      // Continue without throwing error since user is created
    }

    return newUser;
  }

  private async getOrCreateDefaultClient() {
    let defaultClient = await this.prisma.clients.findFirst({
      where: { email: 'default@accurack.com' },
    });

    if (!defaultClient) {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        console.error('Database URL is not configured');
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

  async createClientWithSuperAdmin(dto: CreateClientWithSuperAdminDto) {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
      } = dto;

      // 1. Check for existing user in all databases (master and tenants)
      const existingUserAnywhere = await this.findUserAcrossDatabases(email, { id: true, status: true });
      if (existingUserAnywhere) {
        throw new BadRequestException('User email already exists in the system');
      }

      // 2. Check for existing client
      const clientEmailToUse = companyEmail || email;
      const existingClient = await this.prisma.clients.findUnique({
        where: { email: clientEmailToUse },
        select: { id: true, name: true },
      });

      if (existingClient) {
        throw new BadRequestException(
          `Company email '${clientEmailToUse}' already exists for client '${existingClient.name}'`,
        );
      }

      // 3. Create client record
      const client = await this.prisma.clients.create({
        data: {
          name: companyName,
          email: clientEmailToUse,
          phone: companyPhone,
          address: companyAddress,
          status: Status.active,
          tier: 'free',
        },
      });

      let user;
      try {
        // 4. Create user record as 'pending'
        const passwordHash = await bcrypt.hash(password, 10);
        const otp = this.generateOtp();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        user = await this.prisma.users.create({
          data: {
            firstName,
            lastName,
            email,
            passwordHash,
            role: 'super_admin',
            clientId: client.id,
            status: 'pending', // <-- key change
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
            clientId: true,
            status: true,
          },
        });

        // 5. Create tenant database (outside transaction)
        await this.multiTenantService.createTenantDatabase(client.id, {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          status: client.status,
          tier: client.tier,
        });

        // 6. Sync both client and user records to tenant database
        await this.multiTenantService.ensureClientRecordExists(client.id, {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          status: client.status,
          tier: client.tier,
          createdAt: new Date(),
        });

        await this.multiTenantService.ensureUserRecordExists(client.id, {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          passwordHash,
          role: user.role,
          clientId: user.clientId,
          status: user.status,
          otp,
          otpExpiresAt,
          isOtpUsed: false,
          createdAt: new Date(),
        });

        // 7. Assign permissions, send email, etc.
        await this.permissionsService.assignDefaultPermissions(user.id);

        await this.mailService.sendMail({
          to: email,
          subject: 'Welcome to Accurack - Complete Your Setup',
          html: `
            <h2>Welcome to Accurack!</h2>
            <p>Your account has been created successfully for <strong>${companyName}</strong>.</p>
            <p>To complete your setup, please verify your email with this OTP code:</p>
            <h3 style="color: #007bff; font-size: 24px; letter-spacing: 2px;">${otp}</h3>
            <p>This code will expire in 10 minutes.</p>
            <p>Once verified, you can start managing your business with Accurack!</p>
          `,
        });

        // 8. Mark user as 'active' after all steps succeed
        await this.prisma.users.update({
          where: { id: user.id },
          data: { status: Status.active },
        });

        return {
          success: true,
          message:
            'Client and super admin account created successfully. Please check your email for OTP verification.',
          data: {
            client: {
              id: client.id,
              name: client.name,
              email: client.email,
            },
            user: { ...user, status: Status.active },
          },
        };
      } catch (dbError) {
        // If any step fails after user creation, clean up user and client
        console.error('Failed to complete signup, cleaning up:', dbError);
        try {
          await this.prisma.users.delete({ where: { id: user?.id } });
        } catch (cleanupUserError) {
          console.error('Failed to cleanup user after error:', cleanupUserError);
        }
        try {
          await this.prisma.clients.delete({ where: { id: client.id } });
        } catch (cleanupClientError) {
          console.error('Failed to cleanup client after error:', cleanupClientError);
        }
        throw new InternalServerErrorException(
          'Failed to create client and user account. Please try again.',
        );
      }
    } catch (error) {
      console.error('Create client with super admin error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to create client and user account: ' + error.message,
      );
    }
  }

  /**
   * Fix permissions for existing super admin users who don't have them
   * This is a one-time fix method
   */
  async fixSuperAdminPermissions(email: string) {
    try {
      const user = await this.prisma.users.findUnique({
        where: { email },
        select: { id: true, role: true, email: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role !== 'super_admin') {
        throw new BadRequestException('User is not a super admin');
      }

      // Assign default permissions
      await this.permissionsService.assignDefaultPermissions(user.id);

      return {
        success: true,
        message: `Permissions successfully assigned to super admin ${user.email}`,
        data: {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      console.error('Fix super admin permissions error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to fix super admin permissions: ' + error.message,
      );
    }
  }

  /**
   * Fix missing client record in tenant database
   */
  async fixClientRecord(clientId: string) {
    try {
      // Get client data from master database
      const client = await this.prisma.clients.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          status: true,
          tier: true,
        },
      });

      if (!client) {
        throw new NotFoundException(`Client with ID ${clientId} not found`);
      }

      // Ensure client record exists in tenant database
      await this.multiTenantService.ensureClientRecordExists(clientId, client);

      return {
        success: true,
        message: `Client record synchronized successfully for ${client.name}`,
        data: {
          clientId: client.id,
          clientName: client.name,
          email: client.email,
        },
      };
    } catch (error) {
      console.error('Fix client record error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to fix client record: ' + error.message,
      );
    }
  }

  /**
   * Fix missing user record in tenant database
   */
  async fixUserRecord(userId: string) {
    try {
      // Validate userId parameter
      if (!userId || typeof userId !== 'string') {
        throw new BadRequestException('Valid userId is required');
      }

      // Get user data from master database
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          passwordHash: true,
          role: true,
          clientId: true,
          status: true,
          otp: true,
          otpExpiresAt: true,
          isOtpUsed: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Check if user exists in tenant database first
      const userExists = await this.multiTenantService.validateUserExists(
        user.clientId,
        user.id,
      );

      if (userExists) {
        return {
          success: true,
          message: `User record already exists in tenant database for ${user.firstName} ${user.lastName}`,
          data: {
            userId: user.id,
            email: user.email,
            clientId: user.clientId,
            alreadyExists: true,
          },
        };
      }

      // Ensure user record exists in tenant database
      await this.multiTenantService.ensureUserRecordExists(user.clientId, user);

      // Verify the user was actually inserted
      const userExistsAfter = await this.multiTenantService.validateUserExists(
        user.clientId,
        user.id,
      );

      return {
        success: true,
        message: `User record synchronized successfully for ${user.firstName} ${user.lastName}`,
        data: {
          userId: user.id,
          email: user.email,
          clientId: user.clientId,
          wasInserted: userExistsAfter,
        },
      };
    } catch (error) {
      console.error('Fix user record error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to fix user record: ' + error.message,
      );
    }
  }

  /**
   * Test method to verify super admin can access all stores in tenant
   */
  async testSuperAdminAccess(user: any) {
    try {
      // Get the tenant context to see which DB we're connected to
      let tenantInfo = 'No tenant context';
      try {
        if (user.clientId) {
          const tenantConnection =
            await this.multiTenantService.getTenantConnection(user.clientId);
          tenantInfo = tenantConnection
            ? 'Tenant context available'
            : 'No tenant context';
        }
      } catch (error) {
        tenantInfo = 'Tenant context unavailable';
      }

      // This would use tenant-specific Prisma client via TenantContextService
      // For now, let's just return user info and JWT token contents
      return {
        success: true,
        message: 'Super admin access test completed',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            clientId: user.clientId,
            stores: user.stores, // Should be ['*'] for super admin
          },
          tenantInfo,
          canAccessAllStores:
            user.role === 'super_admin' || user.stores?.includes('*'),
          instructions: [
            'Super admin should have stores: ["*"]',
            'This allows access to any store ID in the tenant database',
            'Try calling /stores endpoint to see all stores in tenant',
            'Try calling /products/create with any storeId from tenant DB',
          ],
        },
      };
    } catch (error) {
      console.error('Test super admin access error:', error);
      throw new InternalServerErrorException(
        'Failed to test super admin access: ' + error.message,
      );
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    try {
      // Validate that new passwords match
      if (newPassword !== confirmPassword) {
        throw new BadRequestException(
          'New password and confirm password do not match',
        );
      }

      // Validate new password strength
      if (newPassword.length < 8) {
        throw new BadRequestException(
          'New password must be at least 8 characters long',
        );
      }

      if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        throw new BadRequestException(
          'New password must contain at least one uppercase letter and one number',
        );
      }

      // Get user with current password hash
      const user = await this.prisma.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          status: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.status !== Status.active) {
        throw new ForbiddenException('User account is not active');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash,
      );
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Check if new password is different from current password
      const isSamePassword = await bcrypt.compare(
        newPassword,
        user.passwordHash,
      );
      if (isSamePassword) {
        throw new BadRequestException(
          'New password must be different from current password',
        );
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password in database
      await this.prisma.users.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      // Create audit log
      await this.prisma.auditLogs.create({
        data: {
          userId: user.id,
          action: 'password_changed',
          resource: 'auth',
          details: {
            email: user.email,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        message: 'Password changed successfully',
        success: true,
      };
    } catch (error) {
      // Log error for debugging
      console.error('Change password error:', error);

      // Handle specific errors
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to change password');
    }
  }

  /**
   * Test method to verify multi-tenant authentication
   */
  async testMultiTenantAuth(email: string) {
    console.log(`🔍 Testing multi-tenant authentication for: ${email}`);

    const user = await this.findUserAcrossDatabases(email, {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      clientId: true,
      status: true,
    });

    if (user) {
      console.log(`✅ User found:`, {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        status: user.status,
        database: user.clientId ? `tenant_${user.clientId}` : 'master',
      });
      return user;
    } else {
      console.log(`❌ User not found: ${email}`);
      return null;
    }
  }
}
