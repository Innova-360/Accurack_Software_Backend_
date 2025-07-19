import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaClientModule } from '../prisma-client/prisma-client.module';
import { CommonModule } from '../common/common.module';
import { TenantContextService } from '../tenant/tenant-context.service';
import { MultiTenantService } from '../database/multi-tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseService } from '../common';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [
    PrismaClientModule,
    CommonModule,
    PermissionsModule,
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    TenantContextService,
    MultiTenantService,
    PrismaService,
    ResponseService,
  ],
  exports: [DashboardService],
})
export class DashboardModule {} 