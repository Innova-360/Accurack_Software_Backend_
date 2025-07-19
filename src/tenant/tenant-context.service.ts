import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { MultiTenantService } from '../database/multi-tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { getTenantPrismaClient } from './prisma-tenant-cache';

@Injectable() // Default singleton scope
export class TenantContextService {
  private shouldUseMasterDB: boolean;
  private clientId?: string;
  constructor(
    @Inject(REQUEST) private readonly request: any,
    private readonly multiTenantService: MultiTenantService,
    private readonly masterPrisma: PrismaService,
  ) {
    // Don't extract tenant context here - do it lazily when needed
  }

  /**
   * Extract tenant context from request (called when needed, not in constructor)
   */
  private extractTenantContext(): void {
    const url = this.request.url || '';
    const user = this.request.user;
    this.clientId = user?.clientId;
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
    this.extractTenantContext();
    if (this.shouldUseMasterDB) {
      return this.masterPrisma;
    }
    try {
      const credentials = await this.multiTenantService['getTenantCredentials'](
        this.clientId!,
      );
      if (credentials) {
        const tenantDatabaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${credentials.databaseName}`;
        return getTenantPrismaClient(this.clientId!, tenantDatabaseUrl);
      }
    } catch (error) {
      console.error('Failed to initialize tenant context:', error);
    }
    // Fallback to master database
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
    this.extractTenantContext();
    return {
      clientId: this.clientId,
      useMasterDB: this.shouldUseMasterDB,
    };
  }
}
