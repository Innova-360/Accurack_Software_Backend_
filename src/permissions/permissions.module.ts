import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PermissionsInitializationService } from './permissions.initialization.service';
import { PrismaClientModule } from '../prisma-client/prisma-client.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaClientModule, CommonModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsInitializationService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
