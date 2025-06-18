import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [InventoryController],
  providers: [InventoryService, JwtStrategy, PrismaClientService],
})
export class InventoryModule {}
