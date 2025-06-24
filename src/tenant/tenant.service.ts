import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MultiTenantService } from '../database/multi-tenant.service';
import {
  CreateTenantDto,
  TenantResponseDto,
  TenantStatusDto,
} from './dto/tenant.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private prisma: PrismaService,
    private multiTenantService: MultiTenantService,
  ) {}
  async createTenant(
    createTenantDto: CreateTenantDto,
  ): Promise<TenantResponseDto> {
    const tenantId = uuidv4();

    try {
      // Check if email already exists
      const existingTenant = await this.prisma.clients.findUnique({
        where: { email: createTenantDto.email },
      });

      if (existingTenant) {
        throw new ConflictException('Tenant with this email already exists');
      } // Store tenant in master database first
      const tenant = await this.prisma.clients.create({
        data: {
          id: tenantId,
          name: createTenantDto.name,
          email: createTenantDto.email,
          phone: createTenantDto.phone,
          tier: 'free',
          status: 'active',
        },
      });

      // Create tenant database with client data
      const databaseName = await this.multiTenantService.createTenantDatabase(
        tenantId,
        {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone,
          address: null,
          status: tenant.status,
          tier: tenant.tier,
        },
      );

      // Update tenant with database name
      await this.prisma.clients.update({
        where: { id: tenantId },
        data: { databaseName },
      });

      this.logger.log(
        `Tenant ${tenant.name} created successfully with ID: ${tenantId}`,
      );

      return {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        contactName: createTenantDto.contactName,
        phone: tenant.phone || undefined,
        databaseName: tenant.databaseName || databaseName,
        status: tenant.status as 'active' | 'inactive' | 'provisioning',
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to create tenant: ${error.message}`);

      // Cleanup on failure
      try {
        await this.multiTenantService.deleteTenantDatabase(tenantId);
      } catch (cleanupError) {
        this.logger.error(
          `Failed to cleanup tenant database: ${cleanupError.message}`,
        );
      }

      throw error;
    }
  }

  async getTenant(tenantId: string): Promise<TenantResponseDto> {
    const tenant = await this.prisma.clients.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    return {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      contactName: tenant.contactName || undefined,
      phone: tenant.phone || undefined,
      databaseName: tenant.databaseName || `client_${tenant.id}_db`,
      status: tenant.status as 'active' | 'inactive' | 'provisioning',
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
  async getAllTenants(): Promise<TenantResponseDto[]> {
    const tenants = await this.prisma.clients.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      contactName: tenant.contactName || undefined,
      phone: tenant.phone || undefined,
      databaseName: tenant.databaseName || `client_${tenant.id}_db`,
      status: tenant.status as 'active' | 'inactive' | 'provisioning',
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    }));
  }

  async getTenantStatus(tenantId: string): Promise<TenantStatusDto> {
    const tenant = await this.prisma.clients.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const dbStatus =
      await this.multiTenantService.checkTenantDatabaseStatus(tenantId);

    // Verify schema is properly initialized
    const schemaStatus =
      await this.multiTenantService.verifyTenantSchema(tenantId);

    return {
      id: tenant.id,
      databaseName: tenant.databaseName || `client_${tenant.id}_db`,
      status: dbStatus.status,
      databaseSize: dbStatus.databaseSize,
      connectionCount: dbStatus.connectionCount,
      schemaInitialized: schemaStatus.hasSchema,
      tableCount: schemaStatus.tableCount,
      lastChecked: new Date(),
    };
  }
  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.prisma.clients.findUnique({
      where: { id: tenantId },
      include: {
        users: true,
        stores: true,
        products: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    this.logger.log(
      `Starting deletion process for tenant: ${tenant.name} (ID: ${tenantId})`,
    );
    this.logger.log(
      `Found ${tenant.users?.length || 0} users, ${tenant.stores?.length || 0} stores, ${tenant.products?.length || 0} products to clean up`,
    );

    try {
      // Delete tenant database first (this contains all the tenant-specific data)
      await this.multiTenantService.deleteTenantDatabase(tenantId);
      this.logger.log(
        `Tenant database deleted successfully for: ${tenant.name}`,
      );

      // Delete related records from master database in correct order (respecting foreign keys)
      await this.prisma.$transaction(async (prisma) => {
        // Delete users first (they reference clients)
        if (tenant.users && tenant.users.length > 0) {
          const deleteUsersResult = await prisma.users.deleteMany({
            where: { clientId: tenantId },
          });
          this.logger.log(
            `Deleted ${deleteUsersResult.count} users from master database`,
          );
        }

        // Delete stores (they reference clients)
        if (tenant.stores && tenant.stores.length > 0) {
          const deleteStoresResult = await prisma.stores.deleteMany({
            where: { clientId: tenantId },
          });
          this.logger.log(
            `Deleted ${deleteStoresResult.count} stores from master database`,
          );
        }

        // Delete products (they reference clients)
        if (tenant.products && tenant.products.length > 0) {
          const deleteProductsResult = await prisma.products.deleteMany({
            where: { clientId: tenantId },
          });
          this.logger.log(
            `Deleted ${deleteProductsResult.count} products from master database`,
          );
        }

        // Finally delete the client record
        await prisma.clients.delete({
          where: { id: tenantId },
        });
        this.logger.log(`Deleted client record from master database`);
      });

      this.logger.log(
        `Tenant ${tenant.name} deleted successfully with all related data`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete tenant ${tenant.name}: ${error.message}`,
      );

      // If master DB cleanup failed but tenant DB was deleted, we have a problem
      // Log this for manual cleanup
      this.logger.error(
        `CRITICAL: Tenant database was deleted but master DB cleanup failed. Manual intervention required for tenant ID: ${tenantId}`,
      );

      throw error;
    }
  }

  /**
   * Initialize schema for an existing tenant (useful for existing tenants or recovery)
   */
  async initializeTenantSchema(tenantId: string): Promise<{
    success: boolean;
    schemaInitialized: boolean;
    tableCount: number;
    message: string;
  }> {
    const tenant = await this.prisma.clients.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    try {
      // Get tenant credentials and initialize schema
      const credentials =
        await this.multiTenantService['getTenantCredentials'](tenantId);

      if (!credentials) {
        throw new Error('Tenant credentials not found');
      }

      // Initialize schema
      await this.multiTenantService['initializeTenantSchema'](
        credentials.databaseName,
        credentials.userName,
        credentials.password,
      );

      // Verify schema was created
      const schemaStatus =
        await this.multiTenantService.verifyTenantSchema(tenantId);

      return {
        success: true,
        schemaInitialized: schemaStatus.hasSchema,
        tableCount: schemaStatus.tableCount,
        message: `Schema initialized successfully for tenant ${tenant.name}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to initialize schema for tenant ${tenantId}: ${error.message}`,
      );
      throw error;
    }
  }
  async updateTenantStatus(
    tenantId: string,
    status: 'active' | 'inactive' | 'suspended',
  ): Promise<TenantResponseDto & { usersUpdated: number }> {
    // First, check if the tenant exists
    const existingTenant = await this.prisma.clients.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { users: true } } },
    });

    if (!existingTenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    this.logger.log(
      `Starting status update for tenant ${existingTenant.name} to ${status}`,
    );
    this.logger.log(`Found ${existingTenant._count.users} users to update`);

    // Use transaction to ensure both tenant and users are updated atomically
    const [updateUsersResult, tenant] = await this.prisma.$transaction([
      // Update all users of this tenant to the same status
      this.prisma.users.updateMany({
        where: {
          clientId: tenantId,
          // Only update users if their status is different
          NOT: { status },
        },
        data: {
          status,
          updatedAt: new Date(),
        },
      }),

      // Update the tenant status
      this.prisma.clients.update({
        where: { id: tenantId },
        data: {
          status,
          updatedAt: new Date(),
        },
      }),
    ]);

    this.logger.log(
      `Successfully updated status to ${status} for tenant ${tenant.name} and ${updateUsersResult.count} users`,
    );

    if (status === 'inactive') {
      this.logger.warn(
        `Tenant ${tenant.name} and ${updateUsersResult.count} users have been deactivated and cannot log in`,
      );
    }

    return {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      contactName: tenant.contactName || undefined,
      phone: tenant.phone || undefined,
      databaseName: tenant.databaseName || `client_${tenant.id}_db`,
      status: tenant.status as 'active' | 'inactive' | 'provisioning',
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      usersUpdated: updateUsersResult.count,
    };
  }

  /**
   * Test tenant permissions for debugging
   */
  async testTenantPermissions(tenantId: string): Promise<{
    canCreateTables: boolean;
    canCreateEnums: boolean;
    schemaPrivileges: string[];
    error?: string;
  }> {
    return await this.multiTenantService.testTenantPermissions(tenantId);
  }

  /**
   * Get tenant database connection details for Prisma Studio
   */
  async getTenantConnectionDetails(tenantId: string): Promise<{
    tenantId: string;
    databaseName: string;
    username: string;
    host: string;
    port: number;
    databaseUrl: string;
    prismaStudioInstructions: string[];
  }> {
    const tenant = await this.prisma.clients.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    // Get credentials (Note: In production, limit access to this endpoint)
    const credentials =
      await this.multiTenantService['getTenantCredentials'](tenantId);

    if (!credentials) {
      throw new NotFoundException('Tenant credentials not found');
    }

    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '5432');
    const databaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${host}:${port}/${credentials.databaseName}`;

    return {
      tenantId,
      databaseName: credentials.databaseName,
      username: credentials.userName,
      host,
      port,
      databaseUrl,
      prismaStudioInstructions: [
        '1. Copy the databaseUrl below',
        '2. Temporarily replace DATABASE_URL in your .env file',
        '3. Run: npx prisma studio',
        '4. Restore original .env when done',
        '5. Alternative: Use scripts/get-tenant-connection.js',
      ],
    };
  }

  /**
   * Safer tenant deletion with validation and optional soft delete
   */
  async deleteTenantSafe(
    tenantId: string,
    options?: {
      softDelete?: boolean;
      force?: boolean;
    },
  ): Promise<{
    success: boolean;
    message: string;
    deletedRecords?: {
      users: number;
      stores: number;
      products: number;
    };
  }> {
    const { softDelete = false, force = false } = options || {};

    const tenant = await this.prisma.clients.findUnique({
      where: { id: tenantId },
      include: {
        users: true,
        stores: true,
        products: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    // Check if tenant has active data and warn if not forced
    const hasActiveData =
      tenant.users?.length > 0 ||
      tenant.stores?.length > 0 ||
      tenant.products?.length > 0;

    if (hasActiveData && !force) {
      return {
        success: false,
        message: `Tenant has active data (${tenant.users?.length || 0} users, ${tenant.stores?.length || 0} stores, ${tenant.products?.length || 0} products). Use force: true to proceed with deletion.`,
        deletedRecords: {
          users: tenant.users?.length || 0,
          stores: tenant.stores?.length || 0,
          products: tenant.products?.length || 0,
        },
      };
    }
    if (softDelete) {
      // Soft delete - just deactivate the tenant
      await this.updateTenantStatus(tenantId, 'inactive');
      return {
        success: true,
        message: `Tenant ${tenant.name} has been deactivated (soft delete). Use hard delete to permanently remove.`,
      };
    }
    // Proceed with hard delete
    try {
      await this.deleteTenant(tenantId);

      return {
        success: true,
        message: `Tenant ${tenant.name} has been permanently deleted with all data.`,
        deletedRecords: {
          users: tenant.users?.length || 0,
          stores: tenant.stores?.length || 0,
          products: tenant.products?.length || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete tenant: ${error.message}`,
      };
    }
  }

  /**
   * Preview what would be deleted when deleting a tenant (dry run)
   */
  async previewTenantDeletion(tenantId: string): Promise<{
    tenantInfo: {
      id: string;
      name: string;
      email: string;
      status: string;
      databaseName: string;
    };
    dataToDelete: {
      users: number;
      stores: number;
      products: number;
      estimatedTenantDbSize: string;
    };
    warnings: string[];
    canDelete: boolean;
  }> {
    const tenant = await this.prisma.clients.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            stores: true,
            products: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    // Get tenant database size
    const dbStatus =
      await this.multiTenantService.checkTenantDatabaseStatus(tenantId);

    const warnings: string[] = [];
    let canDelete = true;

    // Check for active users
    if (tenant._count.users > 0) {
      warnings.push(
        `${tenant._count.users} user(s) will be permanently deleted from master database`,
      );
    }

    // Check for stores with data
    if (tenant._count.stores > 0) {
      warnings.push(
        `${tenant._count.stores} store(s) will be permanently deleted from master database`,
      );
    }

    // Check for products
    if (tenant._count.products > 0) {
      warnings.push(
        `${tenant._count.products} product(s) will be permanently deleted from master database`,
      );
    }

    // Check if tenant database exists
    if (dbStatus.status !== 'connected') {
      warnings.push(
        'Tenant database is not accessible - only master database records will be deleted',
      );
      canDelete = false;
    }

    // Check tenant status
    if (tenant.status === 'active') {
      warnings.push('Tenant is currently ACTIVE - consider deactivating first');
    }

    return {
      tenantInfo: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        status: tenant.status,
        databaseName: tenant.databaseName || `client_${tenant.id}_db`,
      },
      dataToDelete: {
        users: tenant._count.users,
        stores: tenant._count.stores,
        products: tenant._count.products,
        estimatedTenantDbSize: dbStatus.databaseSize || 'Unknown',
      },
      warnings,
      canDelete,
    };
  }
}
