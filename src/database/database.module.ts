import { Module } from '@nestjs/common';
import { DatabaseController } from './database.controller';
import { MultiTenantService } from './multi-tenant.service';
import { PrismaClientModule } from '../prisma-client/prisma-client.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaClientModule, CommonModule],
  controllers: [DatabaseController],
  providers: [MultiTenantService],
  exports: [MultiTenantService],
})
export class DatabaseModule {}
