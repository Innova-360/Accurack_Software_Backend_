import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { MultiTenantService } from '../database/multi-tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseService } from '../common/services/response.service';
import { PermissionsService } from 'src/common';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [SupplierController],
  providers: [
    SupplierService,
    JwtStrategy,
    PrismaClientService,
    TenantContextService, // Add tenant context
    MultiTenantService,   // Required by TenantContextService
    PrismaService,        // Required by TenantContextService
    ResponseService,
    PermissionsService,
  ],
})
export class SupplierModule {}
