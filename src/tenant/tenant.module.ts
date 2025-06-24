import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { MultiTenantService } from '../database/multi-tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseService } from '../common';
import { TenantContextService } from './tenant-context.service';
import { TenantContextInterceptor } from './tenant-context.interceptor';

@Module({
  controllers: [TenantController],
  providers: [
    TenantService,
    MultiTenantService,
    PrismaService,
    ResponseService,
    TenantContextService,
    TenantContextInterceptor,
  ],
  exports: [
    TenantService, 
    MultiTenantService, 
    TenantContextService,
    TenantContextInterceptor,
  ],
})
export class TenantModule {}
