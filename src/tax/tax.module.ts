import { Module } from '@nestjs/common';
import { TaxService } from './tax.service';
import { TaxCalculationService } from './services/tax-calculation.service';
import { TaxController } from './tax.controller';
import { TenantModule } from '../tenant/tenant.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [TenantModule, CommonModule],
  controllers: [TaxController],
  providers: [TaxService, TaxCalculationService],
  exports: [TaxService, TaxCalculationService],
})
export class TaxModule {}
