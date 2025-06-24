import { Module } from '@nestjs/common';
import { SaleAdjustmentsController } from './sale-adjustments.controller';
import { SaleAdjustmentsService } from './sale-adjustments.service';
import { PrismaService } from '../prisma/prisma.service'; // Assumed Prisma service

@Module({
  controllers: [SaleAdjustmentsController],
  providers: [SaleAdjustmentsService, PrismaService],
})
export class SaleAdjustmentsModule {}