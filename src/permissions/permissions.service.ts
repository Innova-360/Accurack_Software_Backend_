import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import {
  CreatePermissionDto,
  BulkAssignPermissionsDto,
  CreateRoleTemplateDto,
  AssignRoleTemplateDto,
  CheckPermissionDto,
  RevokePermissionDto,
  UpdateRoleTemplateDto,
  UserPermissionsResponseDto,
  PermissionCheckResponseDto,
  UserStorePermissionResponseDto,
  GroupedPermissionDto,
} from './dto/permission.dto';
import {
  PermissionResource,
  PermissionAction,
  DEFAULT_ROLE_TEMPLATES,
  RESOURCE_PERMISSIONS,
} from './enums/permission.enum';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly CACHE_TTL = 15 * 60; // 15 minutes
  private readonly CACHE_PREFIX = 'user_permissions:';
  constructor(
    private prisma: PrismaClientService,
    private readonly tenantContext: TenantContextService,
  ) {}

  // Helper to normalize actions to string array
  private normalizeActions(action: string | string[] | '*'): string[] {
    if (action === '*') {
      return ['create', 'read', 'update', 'delete'];
    }
    return Array.isArray(action) ? action : [action];
  }

  // Helper to validate action strings
  private validateActionStrings(actions: string[]): boolean {
    const validActions = ['create', 'read', 'update', 'delete'];
    return actions.every((action) => validActions.includes(action));
  }
  // Initialize default role templates
  async initializeDefaultRoles(createdBy?: string): Promise<void> {
    try {
      const clientdb = await this.tenantContext.getPrismaClient();
      // If no createdBy provided, try to find the first super admin user
      let createdByUserId = createdBy;
      if (!createdByUserId) {
        const superAdminUser = await clientdb.users.findFirst({
          where: { role: 'super_admin' },
          select: { id: true },
        });
        createdByUserId = superAdminUser?.id || 'system';
      }

      for (const [key, template] of Object.entries(DEFAULT_ROLE_TEMPLATES)) {
        const existing = await clientdb.roleTemplate.findUnique({
          where: { name: template.name },
        });

        // if (!existing) {
        //   await clientdb.roleTemplate.create({
        //     data: {
        //       name: template.name,
        //       description: template.description,
        //       permissions: template.permissions,
        //       isDefault: template.isDefault,
        //       priority: template.priority,
        //       createdBy: createdByUserId,
        //     },
        //   });
        //   this.logger.log(`Created default role template: ${template.name}`);
        // }
      }
    } catch (error) {
      this.logger.error('Failed to initialize default roles:', error);
      throw error; // Re-throw to handle in bootstrap
    }
  }

  // Check if user has specific permission
  async hasPermission(
    userId: string,
    resource: string,
    action: string,
    storeId?: string,
  ): Promise<boolean> {
    try {
      // Check direct permission first
      const hasDirectPermission = await this.checkDirectPermission(
        userId,
        resource,
        action,
        storeId,
      );
      if (hasDirectPermission) return true;

      // Check role-based permissions
      const hasRolePermission = await this.checkRolePermissions(
        userId,
        resource,
        action,
        storeId,
      );
      return hasRolePermission;
    } catch (error) {
      this.logger.error(`Permission check failed for user ${userId}:`, error);
      return false;
    }
  }
  // Tenant-aware version of hasPermission
  async hasPermissionWithClient(
    clientdb: any,
    userId: string,
    resource: string,
    action: string,
    storeId?: string,
  ): Promise<boolean> {
    try {
      // Check direct permission first
      const hasDirectPermission = await this.checkDirectPermissionWithClient(
        clientdb,
        userId,
        resource,
        action,
        storeId,
      );
      if (hasDirectPermission) return true;

      // Check role-based permissions
      const hasRolePermission = await this.checkRolePermissionsWithClient(
        clientdb,
        userId,
        resource,
        action,
        storeId,
      );
      return hasRolePermission;
    } catch (error) {
      this.logger.error(`Permission check failed for user ${userId}:`, error);
      return false;
    }
  }

  // Check direct permission in database
  private async checkDirectPermission(
    userId: string,
    resource: string,
    action: string,
    storeId?: string,
  ): Promise<boolean> {
    // Handle wildcard permissions
    const clientdb = await this.tenantContext.getPrismaClient();
    if (resource === '*' || action === '*') {
      const wildcardPermission = await clientdb.permission.findFirst({
        where: {
          userId,
          OR: [
            { storeId },
            { storeId: null }, // Global permission
          ],
          resource: resource === '*' ? undefined : resource,
          actions: action === '*' ? undefined : { has: action },
          granted: true,
        },
      });

      if (wildcardPermission) return true;
    }

    const permission = await clientdb.permission.findFirst({
      where: {
        userId,
        OR: [
          { storeId },
          { storeId: null }, // Global permission takes precedence
        ],
        resource,
        actions: { has: action }, // PostgreSQL array contains operator
        granted: true,
        AND: [
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        ],
      },
    });

    return !!permission;
  }

  // Tenant-aware version of checkDirectPermission
  private async checkDirectPermissionWithClient(
    clientdb: any,
    userId: string,
    resource: string,
    action: string,
    storeId?: string,
  ): Promise<boolean> {
    // Handle wildcard permissions
    if (resource === '*' || action === '*') {
      const wildcardPermission = await clientdb.permission.findFirst({
        where: {
          userId,
          OR: [
            { storeId },
            { storeId: null }, // Global permission
          ],
          resource: resource === '*' ? undefined : resource,
          actions: action === '*' ? undefined : { has: action },
          granted: true,
        },
      });

      if (wildcardPermission) return true;
    }

    const permission = await clientdb.permission.findFirst({
      where: {
        userId,
        OR: [
          { storeId },
          { storeId: null }, // Global permission takes precedence
        ],
        resource,
        actions: { has: action }, // PostgreSQL array contains operator
        granted: true,
        AND: [
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        ],
      },
    });

    return !!permission;
  }

  // Check role-based permissions
  private async checkRolePermissions(
    userId: string,
    resource: string,
    action: string,
    storeId?: string,
  ): Promise<boolean> {
    const clientdb = await this.tenantContext.getPrismaClient();
    const userRoles = await clientdb.userRole.findMany({
      where: {
        userId,
        OR: [{ storeId }, { storeId: null }],
        isActive: true,
      },
      include: {
        roleTemplate: true,
      },
    });

    for (const userRole of userRoles) {
      const permissions = userRole.roleTemplate.permissions as any[];

      for (const permission of permissions) {
        if (
          (permission.resource === resource || permission.resource === '*') &&
          (permission.action === action || permission.action === '*')
        ) {
          return true;
        }
      }
    }

    return false;
  }
  // Tenant-aware version of checkRolePermissions
  private async checkRolePermissionsWithClient(
    clientdb: any,
    userId: string,
    resource: string,
    action: string,
    storeId?: string,
  ): Promise<boolean> {
    const userRoles = await clientdb.userRole.findMany({
      where: {
        userId,
        OR: [{ storeId }, { storeId: null }],
        isActive: true,
      },
      include: {
        roleTemplate: true,
      },
    });

    for (const userRole of userRoles) {
      const permissions = userRole.roleTemplate.permissions as any[];

      for (const permission of permissions) {
        if (
          (permission.resource === resource || permission.resource === '*') &&
          (permission.action === action || permission.action === '*')
        ) {
          return true;
        }
      }
    }

    return false;
  }
  // Assign individual permission
  async assignPermission(
    dto: CreatePermissionDto,
    grantedBy: string,
  ): Promise<void> {
    try {
      // Normalize actions to array
      const actionsArray = this.normalizeActions(dto.action);

      // Validate actions
      if (!this.validateActionStrings(actionsArray)) {
        throw new BadRequestException('Invalid action provided');
      }

      this.logger.log(
        `Assigning permissions: [${actionsArray.join(', ')}] for resource ${dto.resource} to user ${dto.userId}`,
      );

      // Validate resource-action combination
      for (const action of actionsArray) {
        this.validatePermission(dto.resource, action);
      }

      // Convert storeId and resourceId to null if they are undefined or empty
      const normalizedStoreId =
        dto.storeId && dto.storeId.trim() !== '' ? dto.storeId : null;
      const normalizedResourceId =
        dto.resourceId && dto.resourceId.trim() !== '' ? dto.resourceId : null;

      // If this is a store-specific permission, ensure user is added to UserStoreMap
      if (normalizedStoreId) {
        await this.addUserToStore(dto.userId, normalizedStoreId);
      }

      // Check for existing permission with same criteria (excluding actions)

      const clientdb = await this.tenantContext.getPrismaClient();
      const existingPermission = await clientdb.permission.findFirst({
        where: {
          userId: dto.userId,
          resource: dto.resource,
          storeId: normalizedStoreId,
          resourceId: normalizedResourceId,
        },
      });
      if (existingPermission) {
        // Merge actions with existing ones
        const existingActions = ((existingPermission as any).actions ||
          []) as string[];
        const mergedActions = Array.from(
          new Set([...existingActions, ...actionsArray]),
        );
        await clientdb.permission.update({
          where: { id: existingPermission.id },
          data: {
            actions: mergedActions,
            granted: dto.granted ?? true,
            grantedBy,
            grantedAt: new Date(),
            conditions: dto.conditions,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            updatedAt: new Date(),
          },
        });

        this.logger.log(
          `Updated existing permission for ${dto.resource} - merged actions: [${mergedActions.join(', ')}] for user ${dto.userId}`,
        );
      } else {
        // Create new permission with actions array
        const newPermission = await clientdb.permission.create({
          data: {
            userId: dto.userId,
            storeId: normalizedStoreId,
            resource: dto.resource,
            actions: actionsArray,
            resourceId: normalizedResourceId,
            granted: dto.granted ?? true,
            grantedBy,
            grantedAt: new Date(),
            conditions: dto.conditions,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          },
        });

        this.logger.log(
          `Created new permission ${dto.resource} with actions [${actionsArray.join(', ')}] for user ${dto.userId} (ID: ${newPermission.id})`,
        );
      }

      this.logger.log(`Permission assignment completed for user ${dto.userId}`);
    } catch (error) {
      this.logger.error('Failed to assign permission:', {
        error: error.message,
        dto: {
          ...dto,
          action: Array.isArray(dto.action) ? dto.action : [dto.action],
        },
        grantedBy,
      });
      throw error;
    }
  }
  // Revoke permission
  async revokePermission(
    dto: RevokePermissionDto,
    revokedBy: string,
  ): Promise<void> {
    try {
      // Normalize actions to array
      const actionsToRevoke = this.normalizeActions(dto.action);

      this.logger.log(
        `Revoking permissions: [${actionsToRevoke.join(', ')}] for resource ${dto.resource} from user ${dto.userId}`,
      );

      // Convert storeId and resourceId to null if they are undefined or empty
      const normalizedStoreId =
        dto.storeId && dto.storeId.trim() !== '' ? dto.storeId : null;
      const normalizedResourceId =
        dto.resourceId && dto.resourceId.trim() !== '' ? dto.resourceId : null;

      // Find existing permission

      const clientdb = await this.tenantContext.getPrismaClient();
      const existingPermission = await clientdb.permission.findFirst({
        where: {
          userId: dto.userId,
          resource: dto.resource,
          storeId: normalizedStoreId,
          resourceId: normalizedResourceId,
        },
      });

      if (!existingPermission) {
        this.logger.warn(
          `No permission found to revoke for user ${dto.userId}, resource ${dto.resource}`,
        );
        return;
      }
      const currentActions = ((existingPermission as any).actions ||
        []) as string[];
      const remainingActions = currentActions.filter(
        (action) => !actionsToRevoke.includes(action),
      );

      if (remainingActions.length === 0) {
        // No actions left, delete the entire permission
        await clientdb.permission.delete({
          where: { id: existingPermission.id },
        });

        this.logger.log(
          `Deleted permission ${dto.resource} for user ${dto.userId} - no actions remaining`,
        );
      } else {
        // Update permission with remaining actions
        await clientdb.permission.update({
          where: { id: existingPermission.id },
          data: {
            actions: remainingActions,
            updatedAt: new Date(),
          },
        });

        this.logger.log(
          `Updated permission ${dto.resource} for user ${dto.userId} - remaining actions: [${remainingActions.join(', ')}]`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to revoke permission:', error);
      throw error;
    }
  }

  // Bulk assign permissions
  async bulkAssignPermissions(
    dto: BulkAssignPermissionsDto,
    assignedBy: string,
  ): Promise<void> {
    try {
      for (const userId of dto.userIds) {
        for (const permission of dto.permissions) {
          // Use the refactored assignPermission method
          await this.assignPermission(
            {
              userId,
              storeId: dto.storeId,
              resource: permission.resource,
              action: permission.action,
              granted: true,
            },
            assignedBy,
          );
        }
      }

      this.logger.log(
        `Bulk assigned permissions to ${dto.userIds.length} users`,
      );
    } catch (error) {
      this.logger.error('Failed to bulk assign permissions:', error);
      throw error;
    }
  }

  // New method to handle permissions with client DB
  async bulkAssignPermissionsWithClient(
    clientdb: any,
    dto: BulkAssignPermissionsDto,
    performedBy: string,
  ): Promise<void> {
    // Use the provided client DB instance instead of clientdb
    const { userIds, permissions } = dto;

    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('At least one user ID is required');
    }

    if (!permissions || permissions.length === 0) {
      throw new BadRequestException('At least one permission is required');
    }

    // Process each user
    for (const userId of userIds) {
      // Check if user exists
      const user = await clientdb.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        this.logger.warn(
          `User with ID ${userId} not found, skipping permission assignment`,
        );
        continue;
      }

      // Process each permission
      for (const permission of permissions) {
        try {
          // Create permission record using the client DB
          await clientdb.permission.create({
            data: {
              userId,
              resource: permission.resource,
              actions: [permission.action], // Employee service passes action as a single value
              storeId: (permission as any).storeId, // Use type assertion to access custom properties
              resourceId: null, // Resource ID is handled separately
              granted: true,
              grantedBy: performedBy,
            },
          });
        } catch (error) {
          this.logger.error(
            `Failed to assign permission for user ${userId}: ${error.message}`,
            error.stack,
          );
          // Continue with other permissions rather than failing the whole operation
        }
      }
    }
  }

  // New method to assign default permissions with client DB
  async assignDefaultPermissionsWithClient(
    clientdb: any,
    userId: string,
    role: string,
  ): Promise<void> {
    // Find default role template for the given role
    const defaultTemplate = await clientdb.roleTemplate.findFirst({
      where: {
        name: { contains: role, mode: 'insensitive' },
        isDefault: true,
      },
    });

    if (!defaultTemplate) {
      this.logger.warn(`No default role template found for role: ${role}`);
      return;
    }

    // Assign the template permissions
    const templatePermissions = defaultTemplate.permissions as any[];

    // Process each permission
    for (const permission of templatePermissions) {
      try {
        // Create permission record using the client DB
        await clientdb.permission.create({
          data: {
            userId,
            resource: permission.resource,
            actions: Array.isArray(permission.action)
              ? permission.action
              : [permission.action],
            storeId: permission.storeId, // Template may pass storeId directly
            resourceId: null, // Resource ID is handled separately
            granted: true,
            grantedBy: userId, // Self-assigned from template
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to assign default permission for user ${userId}: ${error.message}`,
          error.stack,
        );
        // Continue with other permissions rather than failing the whole operation
      }
    }
  }

  // Get user permissions
  async getUserPermissions(
    userId: string,
    storeId?: string,
  ): Promise<UserPermissionsResponseDto> {
    try {
      // Get direct permissions

      const clientdb = await this.tenantContext.getPrismaClient();
      const directPermissions = await clientdb.permission.findMany({
        where: {
          userId,
          OR: [
            { storeId },
            { storeId: null },
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
          granted: true,
        },
      }); // Get role permissions
      const userRoles = await clientdb.userRole.findMany({
        where: {
          userId,
          OR: [{ storeId }, { storeId: null }],
          isActive: true,
        },
        include: {
          roleTemplate: true,
        },
      });
      const rolePermissions: any[] = [];
      const roleTemplateNames: string[] = [];

      for (const userRole of userRoles) {
        roleTemplateNames.push(userRole.roleTemplate.name);
        const permissions = userRole.roleTemplate.permissions as any[];
        rolePermissions.push(...permissions);
      }

      // Group permissions by resource/store/resourceId combination
      const permissionMap = new Map<
        string,
        {
          resource: string;
          storeId?: string;
          resourceId?: string;
          actions: Set<string>;
          conditions?: Record<string, any>;
          expiresAt?: string;
        }
      >();

      // Process direct permissions (already have actions as arrays)
      for (const p of directPermissions) {
        const actions = (p as any).actions || [];
        const key = `${p.resource}-${p.storeId || 'global'}-${p.resourceId || 'none'}`;
        if (!permissionMap.has(key)) {
          permissionMap.set(key, {
            resource: p.resource,
            storeId: p.storeId || undefined,
            resourceId: p.resourceId || undefined,
            actions: new Set<string>(),
            conditions: (p.conditions as Record<string, any>) || undefined,
            expiresAt: p.expiresAt?.toISOString(),
          });
        }

        const permission = permissionMap.get(key)!;
        actions.forEach((action: string) => permission.actions.add(action));
      }

      // Process role permissions (single action each)
      for (const p of rolePermissions) {
        const key = `${p.resource}-${p.storeId || 'global'}-${p.resourceId || 'none'}`;
        if (!permissionMap.has(key)) {
          permissionMap.set(key, {
            resource: p.resource,
            storeId: p.storeId || undefined,
            resourceId: p.resourceId || undefined,
            actions: new Set<string>(),
            conditions: (p.conditions as Record<string, any>) || undefined,
            expiresAt: p.expiresAt,
          });
        }

        const permission = permissionMap.get(key)!;
        permission.actions.add(p.action);
      }

      // Convert to final format
      const groupedPermissions = Array.from(permissionMap.values()).map(
        (p) => ({
          resource: p.resource as PermissionResource,
          actions: Array.from(p.actions),
          storeId: p.storeId,
          resourceId: p.resourceId,
          conditions: p.conditions,
          expiresAt: p.expiresAt,
        }),
      );

      return {
        userId,
        storeId,
        permissions: groupedPermissions,
        roleTemplates: roleTemplateNames,
      };
    } catch (error) {
      this.logger.error('Failed to get user permissions:', error);
      throw error;
    }
  }

  // Tenant-aware version of getUserPermissions
  async getUserPermissionsWithClient(
    clientdb: any,
    userId: string,
    storeId?: string,
  ): Promise<UserPermissionsResponseDto> {
    try {
      // Get direct permissions using client DB
      const directPermissions = await clientdb.permission.findMany({
        where: {
          userId,
          OR: [
            { storeId },
            { storeId: null },
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
          granted: true,
        },
      });

      // Get role permissions using client DB
      const userRoles = await clientdb.userRole.findMany({
        where: {
          userId,
          OR: [{ storeId }, { storeId: null }],
          isActive: true,
        },
        include: {
          roleTemplate: true,
        },
      });

      const rolePermissions: any[] = [];
      const roleTemplateNames: string[] = [];

      for (const userRole of userRoles) {
        roleTemplateNames.push(userRole.roleTemplate.name);
        const permissions = userRole.roleTemplate.permissions as any[];
        rolePermissions.push(...permissions);
      }

      // Group permissions by resource/store/resourceId combination
      const permissionMap = new Map<
        string,
        {
          resource: string;
          storeId?: string;
          resourceId?: string;
          actions: Set<string>;
          conditions?: Record<string, any>;
          expiresAt?: string;
        }
      >();

      // Process direct permissions (already have actions as arrays)
      for (const p of directPermissions) {
        const actions = (p as any).actions || [];
        const key = `${p.resource}-${p.storeId || 'global'}-${p.resourceId || 'none'}`;
        if (!permissionMap.has(key)) {
          permissionMap.set(key, {
            resource: p.resource,
            storeId: p.storeId || undefined,
            resourceId: p.resourceId || undefined,
            actions: new Set<string>(),
            conditions: (p.conditions as Record<string, any>) || undefined,
            expiresAt: p.expiresAt?.toISOString(),
          });
        }

        const permission = permissionMap.get(key)!;
        actions.forEach((action: string) => permission.actions.add(action));
      }

      // Process role permissions (single action each)
      for (const p of rolePermissions) {
        const key = `${p.resource}-${p.storeId || 'global'}-${p.resourceId || 'none'}`;
        if (!permissionMap.has(key)) {
          permissionMap.set(key, {
            resource: p.resource,
            storeId: p.storeId || undefined,
            resourceId: p.resourceId || undefined,
            actions: new Set<string>(),
            conditions: (p.conditions as Record<string, any>) || undefined,
            expiresAt: p.expiresAt,
          });
        }

        const permission = permissionMap.get(key)!;
        permission.actions.add(p.action);
      }

      // Convert to final format
      const groupedPermissions = Array.from(permissionMap.values()).map(
        (p) => ({
          resource: p.resource as PermissionResource,
          actions: Array.from(p.actions),
          storeId: p.storeId,
          resourceId: p.resourceId,
          conditions: p.conditions,
          expiresAt: p.expiresAt,
        }),
      );

      return {
        userId,
        storeId,
        permissions: groupedPermissions,
        roleTemplates: roleTemplateNames,
      };
    } catch (error) {
      this.logger.error(
        'Failed to get user permissions with client DB:',
        error,
      );
      throw error;
    }
  }

  // Create role template
  async createRoleTemplate(
    dto: CreateRoleTemplateDto,
    createdBy: string,
  ): Promise<any> {
    try {
      // Validate permissions
      for (const permission of dto.permissions) {
        this.validatePermission(permission.resource, permission.action);
      }
      const clientdb = await this.tenantContext.getPrismaClient();
      const roleTemplate = await clientdb.roleTemplate.create({
        data: {
          name: dto.name,
          description: dto.description,
          permissions: dto.permissions as any,
          inheritsFrom: dto.inheritsFrom,
          isDefault: dto.isDefault ?? false,
          priority: dto.priority ?? 0,
          createdBy,
        },
      });

      this.logger.log(`Role template '${dto.name}' created`);
      return roleTemplate;
    } catch (error) {
      this.logger.error('Failed to create role template:', error);
      throw error;
    }
  }

  // Assign role template to users
  async assignRoleTemplate(
    dto: AssignRoleTemplateDto,
    assignedBy: string,
  ): Promise<void> {
    try {
      const clientdb = await this.tenantContext.getPrismaClient();
      const roleTemplate = await clientdb.roleTemplate.findUnique({
        where: { id: dto.roleTemplateId },
      });

      if (!roleTemplate) {
        throw new NotFoundException('Role template not found');
      }

      const operations = dto.userIds.map((userId) =>
        clientdb.userRole.upsert({
          where: {
            userId_roleTemplateId_storeId: {
              userId,
              roleTemplateId: dto.roleTemplateId,
              storeId: dto.storeId || '',
            },
          },
          update: {
            isActive: true,
            assignedBy,
            assignedAt: new Date(),
          },
          create: {
            userId,
            roleTemplateId: dto.roleTemplateId,
            storeId: dto.storeId || null,
            assignedBy,
          },
        }),
      );

      await clientdb.$transaction(operations);

      this.logger.log(
        `Role template '${roleTemplate.name}' assigned to ${dto.userIds.length} users`,
      );
    } catch (error) {
      this.logger.error('Failed to assign role template:', error);
      throw error;
    }
  }

  // Auto-assign default permissions to new user
  async assignDefaultPermissions(
    userId: string,
    storeId?: string,
  ): Promise<void> {
    try {
      const clientdb = await this.tenantContext.getPrismaClient();
      // First check if user is super admin
      const user = await clientdb.users.findUnique({
        where: { id: userId },
        select: { role: true, email: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // For super admins, assign the Super Admin role template directly
      if (user.role === 'super_admin') {
        const superAdminRole = await clientdb.roleTemplate.findFirst({
          where: { name: 'Super Admin' },
        });

        if (superAdminRole) {
          await this.assignRoleTemplate(
            {
              userIds: [userId],
              roleTemplateId: superAdminRole.id,
              storeId,
            },
            userId, // Use the user's own ID instead of 'system'
          );

          this.logger.log(
            `Super Admin role assigned to user ${userId} (${user.email})`,
          );
          return;
        } else {
          // If Super Admin role template doesn't exist, create it first
          await this.initializeDefaultRoles(userId); // Pass user ID

          const newSuperAdminRole = await clientdb.roleTemplate.findFirst({
            where: { name: 'Super Admin' },
          });

          if (newSuperAdminRole) {
            await this.assignRoleTemplate(
              {
                userIds: [userId],
                roleTemplateId: newSuperAdminRole.id,
                storeId,
              },
              userId, // Use the user's own ID instead of 'system'
            );

            this.logger.log(
              `Super Admin role created and assigned to user ${userId} (${user.email})`,
            );
            return;
          }
        }
      }

      // For other users, look for default role
      const defaultRole = await clientdb.roleTemplate.findFirst({
        where: { isDefault: true, isActive: true },
      });
      if (defaultRole) {
        await this.assignRoleTemplate(
          {
            userIds: [userId],
            roleTemplateId: defaultRole.id,
            storeId,
          },
          userId, // Use the user's own ID instead of 'system'
        );

        this.logger.log(
          `Default role '${defaultRole.name}' assigned to new user ${userId}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to assign default permissions:', error);
    }
  }

  // Get all role templates
  async getRoleTemplates(): Promise<any[]> {
    const clientdb = await this.tenantContext.getPrismaClient();
    return clientdb.roleTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });
  }

  // Update role template
  async updateRoleTemplate(
    id: string,
    dto: UpdateRoleTemplateDto,
    updatedBy: string,
  ): Promise<any> {
    try {
      const clientdb = await this.tenantContext.getPrismaClient();
      const existing = await clientdb.roleTemplate.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException('Role template not found');
      }

      if (dto.permissions) {
        for (const permission of dto.permissions) {
          this.validatePermission(permission.resource, permission.action);
        }
      }
      const updateData: any = {
        ...dto,
        updatedAt: new Date(),
      };

      if (dto.permissions) {
        updateData.permissions = dto.permissions as any;
      }

      const updated = await clientdb.roleTemplate.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`Role template '${existing.name}' updated`);
      return updated;
    } catch (error) {
      this.logger.error('Failed to update role template:', error);
      throw error;
    }
  }

  // Delete role template
  async deleteRoleTemplate(id: string, deletedBy: string): Promise<void> {
    try {
      const clientdb = await this.tenantContext.getPrismaClient();
      const roleTemplate = await clientdb.roleTemplate.findUnique({
        where: { id },
      });

      if (!roleTemplate) {
        throw new NotFoundException('Role template not found');
      }

      // Check if role template is in use
      const userRolesCount = await clientdb.userRole.count({
        where: { roleTemplateId: id, isActive: true },
      });

      if (userRolesCount > 0) {
        throw new BadRequestException(
          `Cannot delete role template '${roleTemplate.name}' - it is assigned to ${userRolesCount} users`,
        );
      }

      await clientdb.roleTemplate.update({
        where: { id },
        data: { isActive: false },
      });

      this.logger.log(`Role template '${roleTemplate.name}' deleted`);
    } catch (error) {
      this.logger.error('Failed to delete role template:', error);
      throw error;
    }
  }

  // Check specific permission
  async checkPermission(
    dto: CheckPermissionDto,
    userId: string,
  ): Promise<PermissionCheckResponseDto> {
    try {
      const hasPermission = await this.hasPermission(
        userId,
        dto.resource,
        dto.action,
        dto.storeId,
      );

      // Determine source of permission
      let source: 'direct' | 'role' | 'inherited' = 'direct';

      if (hasPermission) {
        const directPermission = await this.checkDirectPermission(
          userId,
          dto.resource,
          dto.action,
          dto.storeId,
        );

        if (!directPermission) {
          source = 'role';
        }
      }

      return {
        hasPermission,
        resource: dto.resource,
        action: dto.action,
        storeId: dto.storeId,
        source,
      };
    } catch (error) {
      this.logger.error('Failed to check permission:', error);
      throw error;
    }
  }

  // Tenant-aware version of checkPermission
  async checkPermissionWithClient(
    clientdb: any,
    dto: CheckPermissionDto,
    userId: string,
  ): Promise<PermissionCheckResponseDto> {
    try {
      const hasPermission = await this.hasPermissionWithClient(
        clientdb,
        userId,
        dto.resource,
        dto.action,
        dto.storeId,
      );

      // Determine source of permission
      let source: 'direct' | 'role' | 'inherited' = 'direct';

      if (hasPermission) {
        const directPermission = await this.checkDirectPermissionWithClient(
          clientdb,
          userId,
          dto.resource,
          dto.action,
          dto.storeId,
        );

        if (!directPermission) {
          source = 'role';
        }
      }

      return {
        hasPermission,
        resource: dto.resource,
        action: dto.action,
        storeId: dto.storeId,
        source,
      };
    } catch (error) {
      this.logger.error('Failed to check permission with client DB:', error);
      throw error;
    }
  }

  // Check if user has specific permission for specific store
  async checkUserStorePermission(
    userId: string,
    storeId: string,
    resource: string,
    action: string,
  ): Promise<UserStorePermissionResponseDto> {
    try {
      const clientdb = await this.tenantContext.getPrismaClient();
      // Step 1: Check if user has access to this store
      const hasStoreAccess = await this.hasStoreAccess(userId, storeId);
      if (!hasStoreAccess) {
        return {
          hasPermission: false,
          source: 'none',
          userId,
          storeId,
          resource,
          action,
        };
      }

      // Step 2: Check permissions in order of precedence      // Check GLOBAL permission (can do anywhere)
      const globalPermission = await (clientdb.permission as any).findFirst({
        where: {
          userId,
          storeId: null, // global permission
          resource,
          actions: { has: action }, // Use actions array
          granted: true,
          AND: [
            {
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          ],
        },
      });

      if (globalPermission) {
        return {
          hasPermission: true,
          source: 'global',
          userId,
          storeId,
          resource,
          action,
        };
      } // Check STORE-SPECIFIC permission
      const storePermission = await (clientdb.permission as any).findFirst({
        where: {
          userId,
          storeId, // specific store
          resource,
          actions: { has: action }, // Use actions array
          granted: true,
          AND: [
            {
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
          ],
        },
      });

      if (storePermission) {
        return {
          hasPermission: true,
          source: 'store',
          userId,
          storeId,
          resource,
          action,
        };
      }

      // Check role-based permissions
      const hasRolePermission = await this.checkRolePermissions(
        userId,
        resource,
        action,
        storeId,
      );

      if (hasRolePermission) {
        return {
          hasPermission: true,
          source: 'store',
          userId,
          storeId,
          resource,
          action,
        };
      }

      return {
        hasPermission: false,
        source: 'none',
        userId,
        storeId,
        resource,
        action,
      };
    } catch (error) {
      this.logger.error('Failed to check user store permission:', error);
      throw error;
    }
  }

  // Helper: Check if user has access to store
  private async hasStoreAccess(
    userId: string,
    storeId: string,
  ): Promise<boolean> {
    const clientdb = await this.tenantContext.getPrismaClient();
    const storeMap = await clientdb.userStoreMap.findUnique({
      where: {
        userId_storeId: { userId, storeId },
      },
    });

    return !!storeMap;
  }

  // Validate permission resource-action combination
  private validatePermission(resource: string, action: string): void {
    // Allow wildcard permissions
    if (resource === '*' || action === '*') {
      return;
    }

    // Check if resource exists in enum
    if (
      !Object.values(PermissionResource).includes(
        resource as PermissionResource,
      )
    ) {
      throw new BadRequestException(`Invalid resource: ${resource}`);
    }

    // Check if action exists in enum
    if (!Object.values(PermissionAction).includes(action as PermissionAction)) {
      throw new BadRequestException(`Invalid action: ${action}`);
    }

    // Check if resource-action combination is valid
    const validActions = RESOURCE_PERMISSIONS[resource as PermissionResource];
    if (validActions && !validActions.includes(action as PermissionAction)) {
      throw new BadRequestException(
        `Invalid action '${action}' for resource '${resource}'. Valid actions: ${validActions.join(
          ', ',
        )}`,
      );
    }
  }

  // Add user to store mapping (for store access)
  async addUserToStore(userId: string, storeId: string): Promise<void> {
    try {
      // Check if mapping already exists
      const clientdb = await this.tenantContext.getPrismaClient();
      const existingMapping = await clientdb.userStoreMap.findUnique({
        where: {
          userId_storeId: { userId, storeId },
        },
      });

      if (existingMapping) {
        this.logger.log(
          `User ${userId} already has access to store ${storeId}`,
        );
        return;
      }

      // Create the mapping
      await clientdb.userStoreMap.create({
        data: {
          userId,
          storeId,
        },
      });

      this.logger.log(`Added user ${userId} to store ${storeId}`);
    } catch (error) {
      this.logger.error('Failed to add user to store:', error);
      throw error;
    }
  }

  // Convenience method: Assign CRUD permissions
  async assignCrudPermissions(
    userId: string,
    resource: PermissionResource,
    storeId?: string,
    grantedBy?: string,
    options?: {
      resourceId?: string;
      conditions?: Record<string, any>;
      expiresAt?: string;
    },
  ): Promise<void> {
    try {
      const crudActions = [
        PermissionAction.CREATE,
        PermissionAction.READ,
        PermissionAction.UPDATE,
        PermissionAction.DELETE,
      ];
      for (const action of crudActions) {
        await this.assignPermission(
          {
            userId,
            storeId,
            resource,
            action,
            resourceId: options?.resourceId,
            granted: true,
            conditions: options?.conditions,
            expiresAt: options?.expiresAt,
          },
          grantedBy || 'system',
        );
      }

      this.logger.log(
        `Assigned CRUD permissions for ${resource} to user ${userId}`,
      );
    } catch (error) {
      this.logger.error('Failed to assign CRUD permissions:', error);
      throw error;
    }
  }

  // Helper method: Setup store access with basic permissions
  async setupStoreAccessWithPermissions(
    userId: string,
    storeId: string,
    permissions: Array<{
      resource: PermissionResource;
      actions: PermissionAction[] | '*';
    }>,
    grantedBy: string,
  ): Promise<void> {
    try {
      // First, add user to store
      await this.addUserToStore(userId, storeId);

      // Then assign permissions
      for (const perm of permissions) {
        const actions =
          perm.actions === '*' ? Object.values(PermissionAction) : perm.actions;
        for (const action of actions) {
          await this.assignPermission(
            {
              userId,
              storeId,
              resource: perm.resource,
              action: action as PermissionAction,
              granted: true,
            },
            grantedBy,
          );
        }
      }

      this.logger.log(
        `Setup store access and permissions for user ${userId} in store ${storeId}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to setup store access with permissions:',
        error,
      );
      throw error;
    }
  }

  // Debug method to check for existing permissions
  async debugCheckExistingPermission(
    userId: string,
    storeId: string | null,
    resource: string,
    action: string,
    resourceId?: string | null,
  ): Promise<any> {
    try {
      // Action is now used directly as string (no conversion needed)
      const actionString = action;

      // Normalize values
      const normalizedStoreId =
        storeId && storeId.trim() !== '' ? storeId : null;
      const normalizedResourceId =
        resourceId && resourceId.trim() !== '' ? resourceId : null;
      const whereClause = {
        userId,
        resource,
        actions: { has: actionString }, // Use actions array contains
        storeId: normalizedStoreId,
        resourceId: normalizedResourceId,
      };

      this.logger.log(
        `[DEBUG] Searching for permission with exact criteria:`,
        JSON.stringify(whereClause, null, 2),
      );

      const clientdb = await this.tenantContext.getPrismaClient();
      const existing = await clientdb.permission.findFirst({
        where: whereClause,
      });

      // Also find all permissions for this user/store/resource for comparison
      const allRelated = await clientdb.permission.findMany({
        where: {
          userId,
          resource,
          ...(normalizedStoreId && { storeId: normalizedStoreId }),
        },
      });

      this.logger.log(
        `[DEBUG] Found existing permission:`,
        existing ? `ID: ${existing.id}` : 'None',
      );
      this.logger.log(
        `[DEBUG] All related permissions (${allRelated.length}):`,
        allRelated.map((p) => ({
          id: p.id,
          actions: p.actions, // Use actions array
          storeId: p.storeId,
          resourceId: p.resourceId,
          granted: p.granted,
        })),
      );

      return {
        searchCriteria: whereClause,
        existing,
        allRelated,
      };
    } catch (error) {
      this.logger.error('[DEBUG] Error checking existing permission:', error);
      throw error;
    }
  }

  // Check if user still has permissions for a store, remove from UserStoreMap if not
  private async checkAndRemoveUserFromStore(
    userId: string,
    storeId: string,
  ): Promise<void> {
    const clientdb = await this.tenantContext.getPrismaClient();
    try {
      // Check if user still has any permissions for this store
      const remainingPermissions = await clientdb.permission.findFirst({
        where: {
          userId,
          storeId,
          granted: true,
        },
      });

      // If no permissions remain, remove user from store
      if (!remainingPermissions) {
        await clientdb.userStoreMap.deleteMany({
          where: {
            userId,
            storeId,
          },
        });
        this.logger.log(
          `Removed user ${userId} from store ${storeId} (no remaining permissions)`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to check and remove user from store:', error);
      // Don't throw error - this is cleanup, main operation should still succeed
    }
  }
}
