import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import { MultiTenantService } from '../database/multi-tenant.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/dto.store';
import { Role, Status } from '@prisma/client';

@Injectable()
export class StoreService {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly multiTenantService: MultiTenantService,
  ) {}

  async createStore(user: any, dto: CreateStoreDto) {
    // Only super_admin and admin can create stores
    if (user.role !== Role.super_admin && user.role !== Role.admin) {
      throw new ForbiddenException('Only admins can create stores');
    }

    const {
      name,
      email,
      address,
      phone,
      currency = 'USD',
      timezone = 'UTC',
      logoUrl

    } = dto;

    try {
      // Get the tenant-specific Prisma client
      const prisma = await this.tenantContext.getPrismaClient();

      // Validate that client record exists in tenant database
      await this.validateClientExists(user.clientId);

      // Validate that user record exists in tenant database
      await this.validateUserExists(user.clientId, user.id);

      // Create store and store settings in a transaction
      const result = await prisma.$transaction(async (prisma) => {
        // Create the store
        const store = await prisma.stores.create({
          data: {
            name,
            email,
            address,
            phone,
            clientId: user.clientId,
            status: Status.active,
            logoUrl
          },
          select: {
            id: true,
            name: true,
            email: true,
            address: true,
            phone: true,
            logoUrl: true,
            clientId: true,
            status: true,
            createdAt: true,
          },
        });

        // Create store settings
        const storeSettings = await prisma.storeSettings.create({
          data: {
            storeId: store.id,
            currency,
            timezone,
          },
          select: {
            id: true,
            storeId: true,
            currency: true,
            timezone: true,
            taxRate: true,
            taxMode: true,
            lowStockAlert: true,
            enableNotifications: true,
          },
        });

        // Add user to store mapping if they're not already mapped
        await prisma.userStoreMap.create({
          data: {
            userId: user.id,
            storeId: store.id,
          },
        });

        return {
          store,
          settings: storeSettings,
        };
      });

      return {
        store: result.store,
        settings: result.settings,
      };
    } catch (error) {
      console.error('Create store error:', error);
      throw new BadRequestException('Failed to create store: ' + error.message);
    }
  }

  async getStores(user: any) {
    try {
      // Get the tenant-specific Prisma client
      const prisma = await this.tenantContext.getPrismaClient();

      const stores = await prisma.stores.findMany({
        where: {
          ...(user.role === Role.super_admin
            ? {} // Super admin sees ALL stores in tenant
            : user.role === Role.employee
              ? {
                  users: {
                    some: {
                      userId: user.id,
                    },
                  },
                }
              : { 
                  clientId: user.clientId,
                  users: {
                    some: {
                      userId: user.id,
                    },
                  },
                }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          address: true,
          phone: true,
          logoUrl: true,
          status: true,
          createdAt: true,
          settings: {
            select: {
              currency: true,
              timezone: true,
              taxRate: true,
              taxMode: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return stores;
    } catch (error) {
      console.error('Get stores error:', error);
      throw new BadRequestException(
        'Failed to retrieve stores: ' + error.message,
      );
    }
  }

  async findStoreById(user: any, storeId: string) {
    try {
      // Get the tenant-specific Prisma client
      const prisma = await this.tenantContext.getPrismaClient();

      const store = await prisma.stores.findFirst({
        where: {
          id: storeId,
          ...(user.role === Role.super_admin
            ? {}
            : user.role === Role.employee
              ? {}
              : { clientId: user.clientId }),
          users: {
            some: {
              userId: user.id,
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          address: true,
          phone: true,
          logoUrl: true,
          status: true,
          createdAt: true,
          settings: {
            select: {
              currency: true,
              timezone: true,
              taxRate: true,
              taxMode: true,
            },
          },
        },
      });

      if (!store) {
        throw new BadRequestException('Store not found or access denied');
      }

      return store;
    } catch (error) {
      console.error('Get store by ID error:', error);
      throw new BadRequestException(
        'Failed to retrieve store: ' + error.message,
      );
    }
  }

  /**
   * Validate that client record exists in tenant database
   */
  private async validateClientExists(clientId: string): Promise<void> {
    try {
      const tenantInfo = this.tenantContext.getTenantInfo();
      
      if (!tenantInfo.clientId) {
        throw new BadRequestException('No client ID found in request context');
      }

      // Check if client exists in tenant database
      const exists = await this.multiTenantService.validateClientExists(tenantInfo.clientId, clientId);
      
      if (!exists) {
        throw new NotFoundException(
          `Client record not found in tenant database. Please contact support to fix this issue.`
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to validate client record');
    }
  }

  /**
   * Validate that user record exists in tenant database
   */
  private async validateUserExists(clientId: string, userId: string): Promise<void> {
    try {
      const tenantInfo = this.tenantContext.getTenantInfo();
      
      if (!tenantInfo.clientId) {
        throw new BadRequestException('No client ID found in request context');
      }

      // Check if user exists in tenant database
      const exists = await this.multiTenantService.validateUserExists(tenantInfo.clientId, userId);
      
      if (!exists) {
        throw new NotFoundException(
          `User record not found in tenant database. Please contact support to fix this issue.`
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to validate user record');
    }
  }
}
