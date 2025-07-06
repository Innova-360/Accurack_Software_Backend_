import { Module } from '@nestjs/common';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { ResponseService } from '../common/services/response.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { MultiTenantService } from '../database/multi-tenant.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [DriverController],
  providers: [
    DriverService,
    PrismaClientService,
    ResponseService,        // Required by BaseDriverController
    TenantContextService,   // Add tenant context
    MultiTenantService,     // Required by TenantContextService
    PrismaService,          // Required by TenantContextService
  ],
})
export class DriverModule {}