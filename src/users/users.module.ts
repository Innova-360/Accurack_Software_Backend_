import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaClientModule } from 'src/prisma-client/prisma-client.module';
import { TenantModule } from 'src/tenant/tenant.module';
import { PermissionsModule } from 'src/permissions/permissions.module';

@Module({
  imports: [PrismaClientModule, TenantModule, PermissionsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
