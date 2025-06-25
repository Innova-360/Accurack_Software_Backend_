import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';

import { MailModule } from '../mail/mail.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { ResponseService, PermissionsService } from 'src/common';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { MultiTenantService } from 'src/database/multi-tenant.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaClientModule } from 'src/prisma-client/prisma-client.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PrismaClientModule,
    MailModule,
    PermissionsModule,
    CommonModule,
  ],
  controllers: [EmployeeController],
  providers: [
    EmployeeService,
    JwtStrategy,
    ResponseService,
    PermissionsService,
    TenantContextService,
    MultiTenantService,
    PrismaService,
  ],
  exports: [EmployeeService],
})
export class EmployeeModule {}
