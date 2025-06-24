import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PermissionsModule } from '../permissions/permissions.module';
import { TenantModule } from '../tenant/tenant.module';
import { PrismaClientModule } from '../prisma-client/prisma-client.module';
import { MultiTenantService } from '../database/multi-tenant.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PermissionsModule,
    TenantModule, // Import TenantModule to get TenantContextService
    PrismaClientModule, // Import PrismaClientModule for JwtStrategy (uses master DB)
  ],
  controllers: [StoreController],
  providers: [StoreService, JwtStrategy, MultiTenantService], // JwtStrategy needs PrismaClientService from PrismaClientModule
})
export class StoreModule {}
