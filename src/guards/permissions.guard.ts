import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PermissionRequirement,
} from '../auth/decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Skip permission checks for public routes
    }

    const requiredPermissions = this.reflector.getAllAndOverride(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No permissions required
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user; // From JWT auth guard

    this.logger.debug(
      `User from JWT: ${JSON.stringify({
        id: user?.id,
        role: user?.role,
        stores: user?.stores,
        email: user?.email,
      })}`,
    );

    const storeId = this.extractStoreId(request);

    this.logger.debug(`Extracted storeId: ${storeId}`);

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    try {
      // Handle different permission requirement formats
      if (requiredPermissions.type === 'any') {
        return await this.checkAnyPermission(
          user,
          storeId,
          requiredPermissions.permissions,
        );
      }

      if (requiredPermissions.type === 'all') {
        return await this.checkAllPermissions(
          user,
          storeId,
          requiredPermissions.permissions,
        );
      }

      // Handle single permission or array of permissions
      if (Array.isArray(requiredPermissions)) {
        return await this.checkAnyPermission(
          user,
          storeId,
          requiredPermissions,
        );
      }

      // Single permission requirement
      this.logger.debug(
        `Checking permission for user ${user.id}: ${requiredPermissions.resource}.${requiredPermissions.action} ${
          storeId ? `for store ${storeId}` : '(checking all accessible stores)'
        }`,
      );

      return await this.checkPermission(user, storeId, requiredPermissions);
    } catch (error) {
      this.logger.error(
        `Permission check failed for user ${user.id}, storeId: ${storeId}, required: ${JSON.stringify(requiredPermissions)}:`,
        error.stack || error.message,
      );

      // Provide more specific error message
      if (error instanceof ForbiddenException) {
        throw error; // Re-throw with original message
      }

      throw new ForbiddenException(
        `Permission check failed: ${error.message || 'Unknown error'}`,
      );
    }
  }  private extractStoreId(request: any): string | undefined {
    const user = request.user;

    // First, try to get storeId from request (for specific store operations)
    const requestedStoreId =
      request.params?.id || // For /store/:id endpoints
      request.params?.storeId || // For explicit storeId param
      request.query?.storeId || // From query parameters
      request.body?.storeId || // From request body
      request.headers?.['x-store-id']; // From custom header

    // If a specific storeId is requested, validate user has access to it
    if (requestedStoreId) {
      // Super admins have access to all stores (stores array contains ['*'])
      if (user?.role === 'super_admin' || user?.stores?.includes('*')) {
        return requestedStoreId;
      }

      // For other roles, check if they have access to the specific store
      if (user?.stores?.includes(requestedStoreId)) {
        return requestedStoreId;
      } else {
        // User doesn't have access to the requested store
        throw new ForbiddenException(
          `Access denied to store: ${requestedStoreId}. User ${user?.email} (${user?.role}) has access to stores: [${user?.stores?.join(', ')}]`
        );
      }
    }

    // For operations that don't specify a storeId (like "get all stores"),
    // return undefined so permission checks can work across all user's stores
    // The service layer will handle filtering based on user's accessible stores
    return undefined;
  }private async checkPermission(
    user: any,
    storeId: string | undefined,
    permission: PermissionRequirement,
  ): Promise<boolean> {
    // Super admin role bypass - they have access to everything
    if (user.role === 'super_admin') {
      this.logger.debug(
        `Permission granted: User ${user.id} is super_admin - bypassing permission checks`,
      );
      return true;
    }

    // If storeId is specified, check permission for that specific store
    if (storeId) {
      const hasPermission = await this.permissionsService.hasPermission(
        user.id,
        permission.resource,
        permission.action,
        storeId,
      );

      if (!hasPermission) {
        this.logger.warn(
          `Permission denied: User ${user.id} does not have ${permission.resource}.${permission.action} permission for store ${storeId}`,
        );
        throw new ForbiddenException(
          `Insufficient permissions: ${permission.resource}.${permission.action}`,
        );
      }
      return true;
    }

    // Check for global permissions first (no storeId)
    try {
      const hasGlobalPermission = await this.permissionsService.hasPermission(
        user.id,
        permission.resource,
        permission.action,
        undefined, // Global permission
      );

      if (hasGlobalPermission) {
        this.logger.debug(
          `Permission granted: User ${user.id} has global ${permission.resource}.${permission.action} permission`,
        );
        return true;
      }
    } catch (error) {
      this.logger.debug(
        `Global permission check failed for user ${user.id}: ${error.message}`,
      );
    }

    // If no global permission and user has stores, check permission in their accessible stores
    if (user.stores && user.stores.length > 0) {
      this.logger.debug(
        `Checking ${permission.resource}.${permission.action} permission across ${user.stores.length} stores for user ${user.id}: [${user.stores.join(', ')}]`,
      );

      for (const userStoreId of user.stores) {
        try {
          const hasPermission = await this.permissionsService.hasPermission(
            user.id,
            permission.resource,
            permission.action,
            userStoreId,
          );

          this.logger.debug(
            `Permission check for store ${userStoreId}: ${hasPermission}`,
          );

          if (hasPermission) {
            this.logger.debug(
              `Permission granted: User ${user.id} has ${permission.resource}.${permission.action} permission in store ${userStoreId}`,
            );
            return true;
          }
        } catch (error) {
          this.logger.debug(
            `Permission check failed for store ${userStoreId}: ${error.message}`,
          );
          // Continue checking other stores if one fails
          continue;
        }
      }
    }

    // If we reach here, user has no permission
    this.logger.warn(
      `Permission denied: User ${user.id} does not have ${permission.resource}.${permission.action} permission globally or in any accessible store`,
    );
    throw new ForbiddenException(
      `Insufficient permissions: ${permission.resource}.${permission.action}`,
    );
  }
  private async checkAnyPermission(
    user: any,
    storeId: string | undefined,
    permissions: PermissionRequirement[],
  ): Promise<boolean> {
    for (const permission of permissions) {
      try {
        // Try to check this permission - if it succeeds, return true
        await this.checkPermission(user, storeId, permission);
        return true;
      } catch (error) {
        this.logger.debug(
          `Permission check failed for ${permission.resource}.${permission.action}:`,
          error,
        );
        continue;
      }
    }

    throw new ForbiddenException(
      'Insufficient permissions: None of the required permissions found',
    );
  }

  private async checkAllPermissions(
    user: any,
    storeId: string | undefined,
    permissions: PermissionRequirement[],
  ): Promise<boolean> {
    for (const permission of permissions) {
      try {
        await this.checkPermission(user, storeId, permission);
      } catch (error) {
        throw new ForbiddenException(
          `Insufficient permissions: Missing ${permission.resource}.${permission.action}`,
        );
      }
    }

    return true;
  }
}
