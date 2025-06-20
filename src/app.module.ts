import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaClientModule } from './prisma-client/prisma-client.module';
import { StoreModule } from './store/store.module';
import { CommonModule } from './common/common.module';
import { SupplierModule } from './supplier/supplier.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    PrismaClientModule,
    StoreModule,
    ProductModule,
    SupplierModule,
    PermissionsModule, // Add permissions module
  ],
})
export class AppModule {}
