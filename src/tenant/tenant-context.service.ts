import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { MultiTenantService } from '../database/multi-tenant.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private tenantClient: PrismaClient | null = null;
  private isInitialized = false;
  private shouldUseMasterDB: boolean;
  private clientId?: string;
  constructor(
    @Inject(REQUEST) private readonly request: any,
    private readonly multiTenantService: MultiTenantService,
    private readonly masterPrisma: PrismaService,
  ) {
    // Don't extract tenant context here - do it lazily when needed
    // this.extractTenantContext();
  }

  /**
   * Extract tenant context from request (called when needed, not in constructor)
   */
  private extractTenantContext(): void {
    const url = this.request.url || '';
    const user = this.request.user;
    
    console.log('🔍 TENANT CONTEXT EXTRACTION:', { 
      url, 
      hasUser: !!user,
      userClientId: user?.clientId,
      userRole: user?.role,
      extractionTime: 'LAZY_LOAD'
    });

    this.clientId = user?.clientId;

    // Determine if should use master database
    this.shouldUseMasterDB =
      url.includes('/tenant') ||
      url.includes('/auth') ||
      url.includes('/health') ||
      url.includes('/swagger') ||
      this.request._useMasterDB ||
      !user?.clientId;
  }
  /**
   * Get the appropriate Prisma client (master or tenant)
   * This is the ONLY method services need to call
   */
  async getPrismaClient(): Promise<PrismaClient> {
    // Extract tenant context NOW (when user is available)
    if (!this.isInitialized) {
      this.extractTenantContext();
    }

    if (this.isInitialized) {
      return this.tenantClient || this.masterPrisma;
    }

    this.isInitialized = true;

    // Use master database
    if (this.shouldUseMasterDB) {
      this.tenantClient = this.masterPrisma;
      return this.masterPrisma;
    }

    // Use tenant database
    try {
      const credentials = await this.multiTenantService['getTenantCredentials'](
        this.clientId!,
      );
      if (credentials) {
        const tenantDatabaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${credentials.databaseName}`;

        this.tenantClient = new PrismaClient({
          datasources: {
            db: { url: tenantDatabaseUrl },
          },
        });

        await this.tenantClient.$connect();
        return this.tenantClient;
      }
    } catch (error) {
      console.error('Failed to initialize tenant context:', error);
    }

    // Fallback to master database
    this.tenantClient = this.masterPrisma;
    return this.masterPrisma;
  }

  /**
   * Force master database usage (for specific operations)
   */
  async getMasterPrismaClient(): Promise<PrismaClient> {
    return this.masterPrisma;
  }
  /**
   * Get tenant info
   */
  getTenantInfo() {
    // Ensure context is extracted before returning info
    if (!this.isInitialized) {
      this.extractTenantContext();
    }
    
    return {
      clientId: this.clientId,
      useMasterDB: this.shouldUseMasterDB,
    };
  }

  /**
   * Cleanup on request end
   */
  async onModuleDestroy() {
    if (this.tenantClient && this.tenantClient !== this.masterPrisma) {
      await this.tenantClient.$disconnect();
    }
  }
}
