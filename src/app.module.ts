import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaClientModule } from './prisma-client/prisma-client.module';
import { JwtModule } from '@nestjs/jwt';
import { StoreModule } from './store/store.module';
import { InventoryModule } from './inventory/inventory.module';
import { SupplierModule } from './supplier/supplier.module';

@Module({
  imports: [
    AuthModule,
    PrismaClientModule,
    StoreModule,
    InventoryModule,
    SupplierModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
})
export class AppModule {}
