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
    EmployeeModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
})
export class AppModule {}
