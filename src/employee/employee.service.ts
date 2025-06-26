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
      roleTemplateId,
      password,
      permissions,
      storeIds,
    } = createEmployeeDto;

    // Get the tenant-specific Prisma client
    const clientdb = await this.tenantContext.getPrismaClient();

    // Validate role template first (before any user creation)
    const roleTemplate = await this.validateRoleTemplate(
      clientdb,
      roleTemplateId,
    );

    // Check if employee with email already exists
    const existingEmployee = await clientdb.users.findUnique({
      where: { email },
    });

    if (existingEmployee) {
      throw new BadRequestException('Employee with this email already exists');
    }

    // Handle password: use provided password or generate random one
    let finalPassword: string;
    let isPasswordGenerated = false;

    if (password) {
      finalPassword = password;
      isPasswordGenerated = false;
    } else {
      finalPassword = generateRandomPassword();
      isPasswordGenerated = true;
      console.log(`Generated password for new employee: ${finalPassword}`);
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(finalPassword, 10);

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
          role: 'employee', // Store role template name for compatibility
          status: 'active',
          clientId: req.user.clientId,
        },
      });

      // Create UserRole record for advanced role management
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleTemplateId: roleTemplate.id,
          assignedBy: req.user.id,
        },
      });

      // Handle permissions assignment with role template integration
      let finalPermissions: any[] = [];

      // 1. Get role template permissions (always get them since role is validated)
      const roleTemplatePermissions = await this.getRoleTemplatePermissions(
        prisma,
        roleTemplate.id,
      );
      finalPermissions = [...roleTemplatePermissions];

      // 2. Merge with explicit permissions if provided
      if (permissions && permissions.length > 0) {
        // Validate and prepare explicit permissions
        const validatedExplicitPermissions = await this.validatePermissions(
          prisma,
          permissions,
        );

        if (finalPermissions.length > 0) {
          // Merge role template + explicit permissions
          finalPermissions = this.mergeRoleAndExplicitPermissions(
            finalPermissions,
            validatedExplicitPermissions,
          );
        } else {
          // Only explicit permissions
          finalPermissions = validatedExplicitPermissions.map((p) => ({
            ...p,
            source: 'explicit',
          }));
        }
      }

      // 3. Assign final merged permissions
      if (finalPermissions.length > 0) {
        const permissionData = finalPermissions.map((permission) => ({
          userId: user.id,
          resource: permission.resource,
          actions: [permission.action],
          storeId: permission.storeId || null,
          granted: true,
          grantedBy: req.user.id,
        }));

        // Use createMany for better performance
        await prisma.permission.createMany({
          data: permissionData,
          skipDuplicates: true,
        });
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
    const emailSubject = 'Welcome to Accurack - Your Employee Account';
    const passwordSection = isPasswordGenerated
      ? `
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Password:</strong> ${finalPassword}</li>
        </ul>
        <p><strong>Important:</strong> This is a temporary password. For your security, you will be required to update your password after your first login.</p>
      `
      : `
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Password:</strong> ${finalPassword}</li>
        </ul>
        <p><strong>Important:</strong> Please use the password provided to you by your administrator to log in.</p>
      `;

    await this.mailService.sendMail({
      to: email,
      subject: emailSubject,
      html: `
        <p>Hi ${firstName},</p>
        <p>Your employee account has been created successfully. Here are your login credentials:</p>
        ${passwordSection}
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

    const { permissions, storeIds, roleTemplateId, ...updateData } =
      updateEmployeeDto;

    // Detect if role is changing and validate role template
    let newRoleTemplate: any = null;
    let isRoleChanging = false;

    if (roleTemplateId) {
      // Get current user's role template ID
      const currentUserRole = await clientdb.userRole.findFirst({
        where: { userId: id },
        include: { roleTemplate: true },
      });

      isRoleChanging =
        !currentUserRole || currentUserRole.roleTemplateId !== roleTemplateId;

      if (isRoleChanging) {
        newRoleTemplate = await this.validateRoleTemplate(
          clientdb,
          roleTemplateId,
        );
      }
    }

    // Validate unique constraints before transaction
    await this.validateUniqueConstraints(clientdb, id, updateData);

    // Validate store IDs if provided
    const validatedStoreIds = storeIds
      ? await this.validateStoreIds(clientdb, storeIds)
      : null;

    // Validate permissions if provided OR if role is changing
    const validatedPermissions = permissions
      ? await this.validatePermissions(clientdb, permissions)
      : null;

    // Determine final permissions strategy
    let permissionStrategy:
      | 'keep'
      | 'replace_with_role'
      | 'merge_with_role'
      | 'replace_explicit' = 'keep';

    if (isRoleChanging && !permissions) {
      permissionStrategy = 'replace_with_role';
    } else if (isRoleChanging && permissions) {
      permissionStrategy = 'merge_with_role';
    } else if (!isRoleChanging && permissions) {
      permissionStrategy = 'replace_explicit';
    }

    // Update employee in a single comprehensive transaction
    const updatedEmployee = await clientdb.$transaction(async (prisma) => {
      // 1. Update basic employee information and role template
      let updated = existingEmployee;

      // Update basic user data if provided
      if (Object.keys(updateData).length > 0) {
        const data: any = { ...updateData };

        // Handle enum conversions
        if (data.status && typeof data.status === 'string') {
          data.status = data.status.toLowerCase() as any;
        }

        // Update user information
        updated = await prisma.users.update({
          where: { id },
          data,
        });
      }

      // Update role template and Users.role if role is changing
      if (isRoleChanging && newRoleTemplate) {
        // Update the Users.role field with the new role template name
        updated = await prisma.users.update({
          where: { id },
          data: { role: newRoleTemplate.name },
        });

        // Update UserRole record (delete existing and create new to handle unique constraint)
        await prisma.userRole.deleteMany({
          where: { userId: id },
        });

        await prisma.userRole.create({
          data: {
            userId: id,
            roleTemplateId: newRoleTemplate.id,
            assignedBy: currentUserId,
          },
        });
      }

      // 2. Handle permissions update with role template integration
      if (permissionStrategy !== 'keep') {
        // Remove ALL existing permissions first
        await prisma.permission.deleteMany({
          where: { userId: id },
        });

        let finalPermissions: any[] = [];

        if (permissionStrategy === 'replace_with_role') {
          // Role changed, no explicit permissions - use new role template
          finalPermissions = await this.getRoleTemplatePermissions(
            prisma,
            newRoleTemplate!.id,
          );
        } else if (permissionStrategy === 'merge_with_role') {
          // Role changed + explicit permissions - merge role template with explicit
          const roleTemplatePermissions = await this.getRoleTemplatePermissions(
            prisma,
            newRoleTemplate!.id,
          );
          finalPermissions = this.mergeRoleAndExplicitPermissions(
            roleTemplatePermissions,
            validatedPermissions!,
          );
        } else if (permissionStrategy === 'replace_explicit') {
          // Role same, explicit permissions provided - check if we should merge with existing role
          const currentUserRole = await prisma.userRole.findFirst({
            where: { userId: id },
          });

          if (currentUserRole) {
            const roleTemplatePermissions =
              await this.getRoleTemplatePermissions(
                prisma,
                currentUserRole.roleTemplateId,
              );

            if (roleTemplatePermissions.length > 0) {
              // Merge with current role template
              finalPermissions = this.mergeRoleAndExplicitPermissions(
                roleTemplatePermissions,
                validatedPermissions!,
              );
            } else {
              // No role template, use only explicit permissions
              finalPermissions = validatedPermissions!.map((p) => ({
                ...p,
                source: 'explicit',
              }));
            }
          } else {
            // No current role, use only explicit permissions
            finalPermissions = validatedPermissions!.map((p) => ({
              ...p,
              source: 'explicit',
            }));
          }
        }

        // Add new permissions if any
        if (finalPermissions.length > 0) {
          const permissionData = finalPermissions.map((permission) => ({
            userId: id,
            resource: permission.resource,
            actions: [permission.action], // Store as array for consistency
            storeId: permission.storeId || null,
            granted: true,
            grantedBy: currentUserId,
          }));

          // Use createMany for better performance and avoid duplicates
          await prisma.permission.createMany({
            data: permissionData,
            skipDuplicates: true,
          });
        }
      }

      // 3. Handle store assignments update (REPLACE strategy)
      if (validatedStoreIds !== null) {
        // Remove ALL existing store assignments first
        await prisma.userStoreMap.deleteMany({
          where: { userId: id },
        });

        // Add new store assignments if any
        if (validatedStoreIds.length > 0) {
          const storeAssignmentData = validatedStoreIds.map((storeId) => ({
            userId: id,
            storeId,
          }));

          // Use createMany for better performance
          await prisma.userStoreMap.createMany({
            data: storeAssignmentData,
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });

    // Return updated employee with relations
    const result = await clientdb.users.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            store: {
              select: { id: true, name: true },
            },
          },
        },
        stores: {
          include: {
            store: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Remove sensitive data from response
    if (result) {
      const {
        passwordHash,
        googleRefreshToken,
        otp,
        otpExpiresAt,
        ...employeeData
      } = result as any; // Type assertion to handle complex Prisma types

      return employeeData;
    }

    return result;
  }

  // Helper method to validate unique constraints
  private async validateUniqueConstraints(
    clientdb: any,
    employeeId: string,
    updateData: any,
  ): Promise<void> {
    const checks: Promise<void>[] = [];

    // Check email uniqueness
    if (updateData.email) {
      checks.push(
        clientdb.users
          .findFirst({
            where: {
              email: updateData.email,
              id: { not: employeeId },
            },
          })
          .then((existing: any) => {
            if (existing) {
              throw new BadRequestException('Email already exists');
            }
          }),
      );
    }

    // Check employee code uniqueness
    if (updateData.employeeCode) {
      checks.push(
        clientdb.users
          .findFirst({
            where: {
              employeeCode: updateData.employeeCode,
              id: { not: employeeId },
            },
          })
          .then((existing: any) => {
            if (existing) {
              throw new BadRequestException('Employee code already exists');
            }
          }),
      );
    }

    await Promise.all(checks);
  }

  // Helper method to validate store IDs
  private async validateStoreIds(
    clientdb: any,
    storeIds: string[],
  ): Promise<string[]> {
    if (!storeIds || storeIds.length === 0) return [];

    const existingStores = await clientdb.stores.findMany({
      where: {
        id: { in: storeIds },
      },
      select: { id: true },
    });

    const validStoreIds = existingStores.map((store) => store.id);
    const invalidStoreIds = storeIds.filter(
      (id) => !validStoreIds.includes(id),
    );

    if (invalidStoreIds.length > 0) {
      throw new BadRequestException(
        `Invalid store IDs: ${invalidStoreIds.join(', ')}`,
      );
    }

    return validStoreIds;
  }

  // Helper method to validate and prepare permissions
  private async validatePermissions(
    clientdb: any,
    permissions: any[],
  ): Promise<any[]> {
    if (!permissions || permissions.length === 0) return [];

    // Extract unique store IDs from permissions that have storeId
    const storeIdsInPermissions = [
      ...new Set(permissions.filter((p) => p.storeId).map((p) => p.storeId)),
    ];

    // Validate store IDs if any exist
    if (storeIdsInPermissions.length > 0) {
      await this.validateStoreIds(clientdb, storeIdsInPermissions);
    }

    // Transform permissions to individual action entries and remove duplicates
    const permissionEntries = permissions.flatMap((permission) => {
      return permission.actions.map((action: string) => ({
        resource: permission.resource,
        action: action,
        storeId: permission.storeId || null,
      }));
    });

    // Remove duplicates based on resource, action, and storeId
    const uniquePermissions = permissionEntries.filter(
      (permission, index, self) => {
        const key = `${permission.resource}-${permission.action}-${permission.storeId}`;
        return (
          index ===
          self.findIndex(
            (p) => `${p.resource}-${p.action}-${p.storeId}` === key,
          )
        );
      },
    );

    return uniquePermissions;
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
    const {
      email,
      firstName,
      lastName,
      position,
      department,
      roleTemplateId,
      storeIds,
      note,
    } = inviteDto;

    // Get the tenant-specific Prisma client
    const clientdb = await this.tenantContext.getPrismaClient();

    // Get default role template if not provided, otherwise validate the provided one
    let roleTemplate: any;
    if (roleTemplateId) {
      roleTemplate = await this.validateRoleTemplate(clientdb, roleTemplateId);
    } else {
      // Get default employee role template
      roleTemplate = await clientdb.roleTemplate.findFirst({
        where: {
          name: { contains: 'employee' },
          isDefault: true,
        },
      });

      if (!roleTemplate) {
        throw new BadRequestException(
          'Default employee role template not found',
        );
      }
    }

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
          role: roleTemplate.name, // Store role template name for compatibility
          status: 'pending',
          clientId: userId.split('-')[0], // Get clientId from the user's ID
        },
      });

      // Create UserRole record
      await prisma.userRole.create({
        data: {
          userId: newUser.id,
          roleTemplateId: roleTemplate.id,
          assignedBy: userId,
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

    // Assign default permissions based on validated role template
    const roleTemplatePermissions = await this.getRoleTemplatePermissions(
      clientdb,
      roleTemplate.id,
    );

    if (roleTemplatePermissions.length > 0) {
      const permissionData = roleTemplatePermissions.map((permission) => ({
        userId: user.id,
        resource: permission.resource,
        actions: [permission.action],
        storeId: permission.storeId || null,
        granted: true,
        grantedBy: userId,
      }));

      await clientdb.permission.createMany({
        data: permissionData,
        skipDuplicates: true,
      });
    }

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

  // Helper method to get role template permissions
  private async getRoleTemplatePermissions(
    clientdb: any,
    roleTemplateId: string,
    throwOnNotFound: boolean = false,
  ): Promise<any[]> {
    try {
      // Find role template by ID
      const roleTemplate = await clientdb.roleTemplate.findUnique({
        where: {
          id: roleTemplateId,
          isActive: true,
        },
      });

      if (!roleTemplate || !roleTemplate.permissions) {
        if (throwOnNotFound) {
          throw new BadRequestException(
            `Role template not found with ID: '${roleTemplateId}'. Please ensure the role template exists and is active.`,
          );
        }
        return [];
      }

      // Transform role template permissions to individual action entries
      const templatePermissions = roleTemplate.permissions as any[];
      const permissionEntries = templatePermissions.flatMap((permission) => {
        const actions = this.normalizeActions(
          permission.action || permission.actions,
        );
        return actions.map((action: string) => ({
          resource: permission.resource,
          action: action,
          storeId: permission.storeId || null,
          source: 'role_template',
        }));
      });

      return permissionEntries;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.warn(
        `Failed to get role template permissions for role template ID ${roleTemplateId}:`,
        error.message,
      );
      return [];
    }
  }

  // Helper method to normalize actions (handle both string and array formats)
  private normalizeActions(action: string | string[] | '*'): string[] {
    if (action === '*') {
      return ['create', 'read', 'update', 'delete'];
    }
    return Array.isArray(action) ? action : [action];
  }

  // Helper method to merge role template and explicit permissions
  private mergeRoleAndExplicitPermissions(
    rolePermissions: any[],
    explicitPermissions: any[],
  ): any[] {
    // Start with role template permissions
    const mergedPermissions = [...rolePermissions];

    // Add explicit permissions (they can override role permissions)
    explicitPermissions.forEach((explicitPerm) => {
      explicitPerm.source = 'explicit';

      // Check if this exact permission already exists from role template
      const existingIndex = mergedPermissions.findIndex(
        (rolePerm) =>
          rolePerm.resource === explicitPerm.resource &&
          rolePerm.action === explicitPerm.action &&
          rolePerm.storeId === explicitPerm.storeId,
      );

      if (existingIndex >= 0) {
        // Override role permission with explicit permission
        mergedPermissions[existingIndex] = explicitPerm;
      } else {
        // Add new explicit permission
        mergedPermissions.push(explicitPerm);
      }
    });

    return mergedPermissions;
  }

  // Helper method to detect if role has changed
  // Helper method to check if role template has changed
  private hasRoleTemplateChanged(
    oldRoleTemplateId: string,
    newRoleTemplateId: string,
  ): boolean {
    return oldRoleTemplateId !== newRoleTemplateId;
  }

  // Helper method to validate role template exists by ID
  private async validateRoleTemplate(
    clientdb: any,
    roleTemplateId: string,
  ): Promise<any> {
    try {
      const roleTemplate = await clientdb.roleTemplate.findUnique({
        where: {
          id: roleTemplateId,
          isActive: true,
        },
      });
      // Fetch all active role templates for logging/debugging purposes
      const roleTemplates = await clientdb.roleTemplate.findMany();

      if (!roleTemplate) {
        console.warn(
          `Role template with ID '${roleTemplateId}' not found. Available templates: ${JSON.stringify(
            roleTemplates,
          )}`,
        );
      }
      console.log(`Validating role template with ID: '${roleTemplateId}'`);
      console.log(`Role template found: ${JSON.stringify(roleTemplate)}`);
      if (!roleTemplate) {
        throw new BadRequestException(
          `Role template not found with ID: '${roleTemplateId}'. Please ensure the role template exists and is active.`,
        );
      }

      return roleTemplate;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to validate role template with ID: '${roleTemplateId}'. ${error.message}`,
      );
    }
  }
}
