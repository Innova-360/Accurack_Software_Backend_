import { Module } from '@nestjs/common';
import { SaleAdjustmentsController } from './sale-adjustments.controller';
import { SaleAdjustmentsService } from './sale-adjustments.service';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { PrismaClientModule } from '../prisma-client/prisma-client.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaClientModule, PermissionsModule, CommonModule],
  controllers: [SaleAdjustmentsController, SaleController],
  providers: [SaleAdjustmentsService, SaleService],
  exports: [SaleAdjustmentsService, SaleService],
})
export class SaleModule {}