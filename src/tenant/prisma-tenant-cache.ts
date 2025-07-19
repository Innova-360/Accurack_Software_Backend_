import { PrismaClient } from '@prisma/client';

// Global cache for tenant-specific PrismaClient instances
const tenantPrismaCache = new Map<string, PrismaClient>();

/**
 * Get or create a PrismaClient for a tenant
 * @param tenantId - Unique tenant identifier
 * @param dbUrl - Tenant database connection string
 */
export function getTenantPrismaClient(tenantId: string, dbUrl: string): PrismaClient {
  if (!tenantPrismaCache.has(tenantId)) {
    const client = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    tenantPrismaCache.set(tenantId, client);
  }
  return tenantPrismaCache.get(tenantId)!;
}

/**
 * Disconnect all tenant PrismaClients (for graceful shutdown)
 */
export async function disconnectAllTenantPrismaClients() {
  for (const client of tenantPrismaCache.values()) {
    await client.$disconnect();
  }
  tenantPrismaCache.clear();
} 