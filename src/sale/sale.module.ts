import { Module } from '@nestjs/common';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { PrismaClientModule } from '../prisma-client/prisma-client.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaClientModule, PermissionsModule, CommonModule],
  controllers: [SaleController],
  providers: [SaleService],
  exports: [SaleService],
})
export class SaleModule {}