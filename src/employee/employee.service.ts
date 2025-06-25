import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { Status } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateEmployeePermissionsDto } from './dto/update-employee-permissions.dto';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import * as bcrypt from 'bcrypt';
import { generateRandomPassword } from 'src/common';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService, // Keep for fallback/master DB operations
    private readonly tenantContext: TenantContextService, // Add tenant context
    private readonly mailService: MailService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto, req: any) {
    const {
      email,
      firstName,
      lastName,
      phone,
      position,
      department,
      permissions,
      storeIds,
    } = createEmployeeDto;

    // Get the tenant-specific Prisma client
    const clientdb = await this.tenantContext.getPrismaClient();

    // Check if employee with email already exists
    const existingEmployee = await clientdb.users.findUnique({
      where: { email },
    });

    if (existingEmployee) {
      throw new BadRequestException('Employee with this email already exists');
    }

    // Generate a random password
    const password = generateRandomPassword();

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with employee role and details in a transaction
    const employee = await clientdb.$transaction(async (prisma) => {
      // Create user with employee details
      const user = await prisma.users.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          phone,
          position,
          department,
          role: 'employee',
          status: 'active',
          clientId: req.user.clientId,
        },
      });

      // Assign permissions using the many-to-many relation
      if (permissions && permissions.length > 0) {
        // Validate storeIds in permissions if present
        const storeIdsInPermissions = permissions
          .filter((p) => p.storeId)
          .map((p) => p.storeId as string)
          .filter(Boolean);

        let validStoreIds: string[] = [];
        if (storeIdsInPermissions.length > 0) {
          const existingStores = await prisma.stores.findMany({
            where: {
              id: {
                in: storeIdsInPermissions,
              },
            },
            select: {
              id: true,
            },
          });
          validStoreIds = existingStores.map((store) => store.id);
        }

        // Create an array of individual permission objects for each action
        const permissionEntries = permissions.flatMap((permission) => {
          // Skip invalid storeIds
          if (
            permission.storeId &&
            !validStoreIds.includes(permission.storeId as string)
          ) {
            console.warn(
              `Skipping permission for invalid storeId: ${permission.storeId}`,
            );
            return [];
          }

          return permission.actions.map((action) => ({
            resource: permission.resource,
            action,
            scope: permission.scope,
            storeId: permission.storeId,
          }));
        });

        if (permissionEntries.length > 0) {
          // Pass the prisma client from the transaction to ensure same database context
          await this.permissionsService.bulkAssignPermissionsWithClient(
            prisma, // Pass the transaction's prisma client
            {
              userIds: [user.id],
              permissions: permissionEntries,
            },
            req.user.id, // Use the current user's ID as performer
          );
        }
      }

      // Assign stores to the employee if provided
      if (storeIds && storeIds.length > 0) {
        // Validate store IDs before attempting to create mappings
        const existingStores = await prisma.stores.findMany({
          where: {
            id: {
              in: storeIds,
            },
          },
          select: {
            id: true,
          },
        });

        const validStoreIds = existingStores.map((store) => store.id);

        if (validStoreIds.length > 0) {
          // Only create mappings for valid store IDs
          const storeAssignments = validStoreIds.map((storeId) => ({
            userId: user.id,
            storeId,
          }));

          // Create store assignments one by one to avoid transaction issues
          for (const assignment of storeAssignments) {
            try {
              await prisma.userStoreMap.create({
                data: assignment,
              });
            } catch (error) {
              // Log error but continue with other assignments
              console.error(
                `Failed to assign store ${assignment.storeId} to user ${assignment.userId}: ${error.message}`,
              );
            }
          }
        }
      }

      return user;
    });

    // Send welcome email with credentials
    await this.mailService.sendMail({
      to: email,
      subject: 'Welcome to Accurack - Your Employee Account',
      html: `
        <p>Hi ${firstName},</p>
        <p>Your employee account has been created successfully. Here are your login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Password:</strong> ${password}</li>
        </ul>
        <p><strong>Important:</strong> For your security, you will be required to update your password after your first login.</p>
        <p>If you have any questions, please contact your administrator.</p>
      `,
    });

    // Remove sensitive data from response
    const { passwordHash: _, ...employeeData } = employee;
    return employeeData;
  }

  async findAll() {
    // Get the tenant-specific Prisma client
    const clientdb = await this.tenantContext.getPrismaClient();

    const employees = await clientdb.users.findMany({
      where: {
        role: 'employee',
        status: 'active',
      },
      include: {
        permissions: true,
        stores: {
          include: {
            store: true,
          },
        },
      },
    });

    // Remove sensitive data from response
    return employees.map((emp) => {
      const {
        passwordHash,
        googleRefreshToken,
        otp,
        otpExpiresAt,
        ...employeeData
      } = emp;
      return employeeData;
    });
  }

  async findOne(id: string) {
    // Get the tenant-specific Prisma client
    const clientdb = await this.tenantContext.getPrismaClient();

    const employee = await clientdb.users.findFirst({
      where: {
        id,
        role: 'employee',
      },
      include: {
        permissions: true,
        stores: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Remove sensitive data from response
    const {
      passwordHash,
      googleRefreshToken,
      otp,
      otpExpiresAt,
      ...employeeData
    } = employee;
    return employeeData;
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
    currentUserId: string,
  ) {
    // Get the tenant-specific Prisma client
    const clientdb = await this.tenantContext.getPrismaClient();

    // Check if employee exists first
    const existingEmployee = await clientdb.users.findUnique({
      where: { id, role: 'employee' },
    });

    if (!existingEmployee) {
      throw new NotFoundException('Employee not found');
    }

    const { permissions, ...updateData } = updateEmployeeDto;

    // Update employee in a transaction
    const updatedEmployee = await clientdb.$transaction(async (prisma) => {
      // Prepare data for update with proper type casting
      const data: any = { ...updateData };

      // Handle enum conversions
      if (data.role && typeof data.role === 'string') {
        data.role = data.role.toLowerCase() as any;
      }
      if (data.status && typeof data.status === 'string') {
        data.status = data.status.toLowerCase() as any;
      }

      // Update user information
      const updated = await prisma.users.update({
        where: { id },
        data,
      });

      return updated;
    });

    // Update permissions separately (outside transaction to avoid conflicts)
    if (permissions && permissions.length > 0) {
      // Validate storeIds in permissions if present
      const storeIdsInPermissions = permissions
        .filter((p) => p.storeId)
        .map((p) => p.storeId as string)
        .filter(Boolean);

      let validStoreIds: string[] = [];
      if (storeIdsInPermissions.length > 0) {
        const existingStores = await clientdb.stores.findMany({
          where: {
            id: {
              in: storeIdsInPermissions,
            },
          },
          select: {
            id: true,
          },
        });
        validStoreIds = existingStores.map((store) => store.id);
      }

      // Create an array of individual permission objects for each action
      const permissionEntries = permissions.flatMap((permission) => {
        // Skip invalid storeIds
        if (
          permission.storeId &&
          !validStoreIds.includes(permission.storeId as string)
        ) {
          console.warn(
            `Skipping permission for invalid storeId: ${permission.storeId}`,
          );
          return [];
        }

        return permission.actions.map((action) => ({
          resource: permission.resource as any,
          action: action as any,
          scope: permission.scope as any,
          storeId: permission.storeId,
        }));
      });

      if (permissionEntries.length > 0) {
        // Pass the tenant-specific client to the permissions service
        await this.permissionsService.bulkAssignPermissionsWithClient(
          clientdb,
          {
            userIds: [id],
            permissions: permissionEntries,
          },
          currentUserId,
        );
      }
    }

    // Remove sensitive data from response
    const {
      passwordHash,
      googleRefreshToken,
      otp,
      otpExpiresAt,
      ...employeeData
    } = updatedEmployee;
    return employeeData;
  }

  async remove(id: string) {
    await this.findOne(id);

    // Get the tenant-specific Prisma client
    const clientdb = await this.tenantContext.getPrismaClient();

    // Soft delete by setting status to inactive
    const deleted = await clientdb.users.update({
      where: { id },
      data: { status: 'inactive' },
    });

    // Remove sensitive data from response
    const {
      passwordHash,
      googleRefreshToken,
      otp,
      otpExpiresAt,
      ...employeeData
    } = deleted;
    return employeeData;
  }

  async deactivate(id: string) {
    // Get the tenant-specific Prisma client
    const clientdb = await this.tenantContext.getPrismaClient();

    const employee = await clientdb.users.findUnique({
      where: { id, role: 'employee' },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const updatedEmployee = await clientdb.users.update({
      where: { id },
      data: { status: 'inactive' as Status },
    });

    const { passwordHash, ...result } = updatedEmployee;
    return result;
  }

  async updatePermissions(
    id: string,
    { permissions }: UpdateEmployeePermissionsDto,
  ) {
    // Get the tenant-specific Prisma client
    const clientdb = await this.tenantContext.getPrismaClient();

    const employee = await clientdb.users.findUnique({
      where: { id, role: 'employee' },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Update permissions using bulk assign
    // Validate storeIds in permissions if present
    const storeIdsInPermissions = permissions
      .filter((p) => p.storeId)
      .map((p) => p.storeId as string)
      .filter(Boolean);

    let validStoreIds: string[] = [];
    if (storeIdsInPermissions.length > 0) {
      const existingStores = await clientdb.stores.findMany({
        where: {
          id: {
            in: storeIdsInPermissions,
          },
        },
        select: {
          id: true,
        },
      });
      validStoreIds = existingStores.map((store) => store.id);
    }

    // Create an array of individual permission objects for each action
    const permissionEntries = permissions.flatMap((permission) => {
      // Skip invalid storeIds
      if (
        permission.storeId &&
        !validStoreIds.includes(permission.storeId as string)
      ) {
        console.warn(
          `Skipping permission for invalid storeId: ${permission.storeId}`,
        );
        return [];
      }

      return permission.actions.map((action) => ({
        resource: permission.resource as any,
        action: action as any,
        scope: permission.scope as any,
        storeId: permission.storeId,
      }));
    });

    if (permissionEntries.length > 0) {
      // Pass the tenant-specific client to the permissions service
      await this.permissionsService.bulkAssignPermissionsWithClient(
        clientdb,
        {
          userIds: [id],
          permissions: permissionEntries,
        },
        id, // Using the employee's own ID as performer for now
      );
    }

    return this.findOne(id);
  }

  async invite(inviteDto: InviteEmployeeDto, userId: string) {
    const { email, firstName, lastName, position, department, storeIds, note } =
      inviteDto;

    // Get the tenant-specific Prisma client
    const clientdb = await this.tenantContext.getPrismaClient();

    // Check if user already exists
    const existingUser = await clientdb.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Generate a temporary password
    const temporaryPassword = generateRandomPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    // Create user with pending status
    const user = await clientdb.$transaction(async (prisma) => {
      // Create the user
      const newUser = await prisma.users.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          position,
          department,
          role: 'employee',
          status: 'pending',
          clientId: userId.split('-')[0], // Get clientId from the user's ID
        },
      });

      // Assign stores to the employee if provided
      if (storeIds && storeIds.length > 0) {
        // Validate store IDs before attempting to create mappings
        const existingStores = await prisma.stores.findMany({
          where: {
            id: {
              in: storeIds,
            },
          },
          select: {
            id: true,
          },
        });

        const validStoreIds = existingStores.map((store) => store.id);

        if (validStoreIds.length > 0) {
          // Only create mappings for valid store IDs
          const storeAssignments = validStoreIds.map((storeId) => ({
            userId: newUser.id,
            storeId,
          }));

          // Create store assignments one by one to avoid transaction issues
          for (const assignment of storeAssignments) {
            try {
              await prisma.userStoreMap.create({
                data: assignment,
              });
            } catch (error) {
              // Log error but continue with other assignments
              console.error(
                `Failed to assign store ${assignment.storeId} to user ${assignment.userId}: ${error.message}`,
              );
            }
          }
        }
      }

      return newUser;
    });

    // Assign default permissions based on role if needed
    await this.permissionsService.assignDefaultPermissionsWithClient(
      clientdb,
      user.id,
      'employee',
    );

    // Send invitation email
    await this.mailService.sendMail({
      to: email,
      subject: 'Invitation to Join Accurack - Employee Account',
      html: `
        <p>Hi ${firstName},</p>
        <p>You have been invited to join Accurack as an employee. Your account has been created with the following details:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Position:</strong> ${position}</li>
          <li><strong>Department:</strong> ${department}</li>
          <li><strong>Temporary Password:</strong> ${temporaryPassword}</li>
        </ul>
        <p><strong>Important:</strong> Please log in and change your password immediately after your first login for security.</p>
        ${note ? `<p><strong>Note from Admin:</strong> ${note}</p>` : ''}
        <p>Welcome to the team!</p>
      `,
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async resetPassword(id: string) {
    // Get the tenant-specific Prisma client
    const clientdb = await this.tenantContext.getPrismaClient();

    const employee = await clientdb.users.findUnique({
      where: { id, role: 'employee' },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Generate new password
    const newPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await clientdb.users.update({
      where: { id },
      data: { passwordHash },
    });

    // Send password reset email
    await this.mailService.sendMail({
      to: employee.email,
      subject: 'Accurack - Password Reset Successful',
      html: `
        <p>Hi ${employee.firstName},</p>
        <p>Your password has been successfully reset by an administrator.</p>
        <p><strong>Your new temporary password is:</strong> ${newPassword}</p>
        <p><strong>Important Security Notice:</strong></p>
        <ul>
          <li>Please log in immediately and change this password</li>
          <li>Do not share this password with anyone</li>
          <li>Choose a strong password for your security</li>
        </ul>
        <p>If you did not request this password reset, please contact your administrator immediately.</p>
        <p>Thank you,<br>Accurack Team</p>
      `,
    });

    return {
      message:
        "Password reset successful. New password has been sent to employee's email.",
    };
  }

  async updateStoreAssignments(employeeId: string, storeIds: string[]) {
    // Get the tenant-specific Prisma client
    const clientdb = await this.tenantContext.getPrismaClient();

    // Check if employee exists
    const employee = await clientdb.users.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // First remove all existing store assignments
    await clientdb.userStoreMap.deleteMany({
      where: { userId: employeeId },
    });

    // Then create new store assignments if any store IDs are provided
    if (storeIds && storeIds.length > 0) {
      // Validate store IDs before attempting to create mappings
      const existingStores = await clientdb.stores.findMany({
        where: {
          id: {
            in: storeIds,
          },
        },
        select: {
          id: true,
        },
      });

      const validStoreIds = existingStores.map((store) => store.id);

      if (validStoreIds.length > 0) {
        // Create store assignments one by one
        for (const storeId of validStoreIds) {
          try {
            await clientdb.userStoreMap.create({
              data: {
                userId: employeeId,
                storeId,
              },
            });
          } catch (error) {
            console.error(
              `Failed to assign store ${storeId} to employee ${employeeId}: ${error.message}`,
            );
          }
        }
      }
    }

    // Return the updated employee with store assignments
    return clientdb.users.findUnique({
      where: { id: employeeId },
      include: {
        stores: {
          include: {
            store: true,
          },
        },
      },
    });
  }
}
