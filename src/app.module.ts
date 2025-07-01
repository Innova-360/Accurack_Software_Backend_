import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { PrismaClientModule } from './prisma-client/prisma-client.module';
import { StoreModule } from './store/store.module';
import { CommonModule } from './common/common.module';
import { SupplierModule } from './supplier/supplier.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductModule } from './product/product.module';
import { TenantModule } from './tenant/tenant.module';
import { DatabaseModule } from './database/database.module';
import { EmployeeModule } from './employee/employee.module';
import { TenantContextInterceptor } from './tenant/tenant-context.interceptor';
import { SaleModule } from './sale/sale.module';
import { TaxModule } from './tax/tax.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    PrismaClientModule,
    StoreModule,
    ProductModule,
    SupplierModule,
    PermissionsModule,
    TenantModule,
    DatabaseModule,
    SaleModule,
    EmployeeModule,
    TaxModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
  controllers: [HealthController],
})
export class AppModule {}
