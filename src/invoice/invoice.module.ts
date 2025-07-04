import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { PrismaClientModule } from 'src/prisma-client/prisma-client.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { PermissionsService, ResponseService } from 'src/common';
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
    // TenantContextService, MultiTenantService, and PrismaService are provided by TenantModule
  ],
  exports: [InvoiceService],
})
export class InvoiceModule {}
