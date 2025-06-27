import { Module } from '@nestjs/common';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { PrismaClientModule } from '../prisma-client/prisma-client.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CommonModule } from '../common/common.module';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { MultiTenantService } from 'src/database/multi-tenant.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { PermissionsService, ResponseService } from 'src/common';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PrismaClientModule,
    PermissionsModule,
    CommonModule,
  ],
  controllers: [SaleController],
  providers: [
    SaleService,
    TenantContextService, // Add tenant context
    MultiTenantService, // Required by TenantContextService
    PrismaService,
    JwtService,
    PermissionsService,
    ResponseService
  ],
})
export class SaleModule {}
