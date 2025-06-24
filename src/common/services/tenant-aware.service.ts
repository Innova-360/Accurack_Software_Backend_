import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../../tenant/tenant-context.service';

/**
 * Base class for tenant-aware services
 * Provides easy access to tenant-specific database
 */
@Injectable()
export abstract class TenantAwareService {
  constructor(protected readonly tenantContext: TenantContextService) {}

  /**
   * Get tenant-specific Prisma client
   */
  protected async getPrisma(): Promise<PrismaClient> {
    return await this.tenantContext.getPrismaClient();
  }

  /**
   * Force master database access (for specific operations)
   */
  protected async getMasterPrisma(): Promise<PrismaClient> {
    return await this.tenantContext.getMasterPrismaClient();
  }
  /**
   * Get tenant information
   */
  protected getTenantInfo() {
    return this.tenantContext.getTenantInfo();
  }

  /**
   * Convenience method to execute operations with tenant-specific Prisma client
   */
  protected async withTenantPrisma<T>(
    operation: (prisma: PrismaClient) => Promise<T>,
  ): Promise<T> {
    const prisma = await this.getPrisma();
    return await operation(prisma);
  }
}
