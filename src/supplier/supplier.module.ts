import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { ResponseService } from '../common/services/response.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [SupplierController],
  providers: [SupplierService, JwtStrategy, PrismaClientService, ResponseService],
})
export class SupplierModule {}
