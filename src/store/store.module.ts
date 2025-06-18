import { Module } from '@nestjs/common';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [StoreController],
  providers: [StoreService, PrismaClientService, JwtStrategy],
})
export class StoreModule {}
