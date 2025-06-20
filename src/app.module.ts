import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaClientModule } from './prisma-client/prisma-client.module';
import { JwtModule } from '@nestjs/jwt';
import { StoreModule } from './store/store.module';
import { CommonModule } from './common/common.module';
import { InventoryModule } from './inventory/inventory.module';
import { SupplierModule } from './supplier/supplier.module';
import { PermissionsModule } from './permissions/permissions.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    PrismaClientModule,
    StoreModule,
    InventoryModule,
    SupplierModule,
    PermissionsModule, // Add permissions module
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
})
export class AppModule {}
