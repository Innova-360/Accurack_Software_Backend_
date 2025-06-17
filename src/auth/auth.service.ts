import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  GoogleProfileDto,
  AuthResponseDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  SignupSuperAdminDto,
} from './dto/auth.dto';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { MailerService } from '@nestjs-modules/mailer';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}
  async googleLogin(googleUser: GoogleProfileDto): Promise<AuthResponseDto> {
    const payload = {
      sub: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      provider: 'google',
      role: 'USER', // Default role for Google users
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        provider: 'google',
      },
      message: 'Google authentication successful',
    };
  }

  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      return null;
    }
  }

  async signupSuperAdmin(dto: SignupSuperAdminDto) {
    const { firstName, lastName, email, password } = dto;

    const existingUser = await this.prisma.users.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const client = await this.prisma.clients.create({
      data: {
        name: `${firstName} ${lastName}'s Organization`,
        email,
      },
      select: { id: true },
    });

    const user = await this.prisma.users.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: Role.super_admin,
        clientId: client.id,
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

    await this.prisma.auditLogs.create({
      data: {
        userId: user.id,
        action: 'user_created',
        resource: 'auth',
        details: { role: Role.super_admin, email },
      },
    });

    return {
      message: 'Super Admin created successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email,
        role: user.role,
      },
    };
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
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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
      secret: process.env.JWT_REFRESH_SECRET,
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
        secret: process.env.JWT_REFRESH_SECRET,
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

    const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`;
    console.log(`Reset link: ${resetLink}`);
    try {
      await this.mailerService.sendMail({
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

    const inviteLink = `${process.env.APP_URL}/invite?token=${token}`;
    try {
      await this.mailerService.sendMail({
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
}
