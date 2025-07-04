import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { PrismaClientModule } from 'src/prisma-client/prisma-client.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { PermissionsService, ResponseService } from 'src/common';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { MultiTenantService } from 'src/database/multi-tenant.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantModule } from 'src/tenant/tenant.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PrismaClientModule,
    TenantModule,
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    PrismaClientService,
    JwtStrategy,
    ResponseService,
    PermissionsService,
    TenantContextService, // Add tenant context
    MultiTenantService, // Required by TenantContextService
    PrismaService, // Required by TenantContextService,
  ],
  exports: [InvoiceService],
})
export class InvoiceModule {}
