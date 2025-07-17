import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { InvoiceDraftController } from './invoice-draft.controller';
import { InvoiceDraftService } from './invoice-draft.service';
import { InvoiceDraftVersionService } from './invoice-draft-version.service';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { PrismaClientModule } from '../prisma-client/prisma-client.module';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { PermissionsService, ResponseService } from '../common';
import { TenantModule } from '../tenant/tenant.module';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PrismaClientModule,
    TenantModule,
    InvoiceModule, // Import InvoiceModule to access InvoiceService
  ],
  controllers: [InvoiceDraftController],
  providers: [
    InvoiceDraftService,
    InvoiceDraftVersionService,
    PrismaClientService,
    JwtStrategy,
    ResponseService,
    PermissionsService,
    // TenantContextService, MultiTenantService, and PrismaService are provided by TenantModule
  ],
  exports: [InvoiceDraftService, InvoiceDraftVersionService],
})
export class InvoiceDraftModule {}
