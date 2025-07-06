import { Module } from '@nestjs/common';
import { ValidatorController } from './validator.controller';
import { ValidatorService } from './validator.service';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { MultiTenantService } from 'src/database/multi-tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseService } from '../common/services/response.service';

@Module({
  controllers: [ValidatorController],
  providers: [
    ValidatorService,
    PrismaClientService,
    TenantContextService,   // Add tenant context
    MultiTenantService,     // Required by TenantContextService
    PrismaService,          // Required by TenantContextService
    ResponseService,        // Required by BaseValidatorController
  ],
})
export class ValidatorModule {}