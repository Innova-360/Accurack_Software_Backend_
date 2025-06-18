import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaClientModule } from './prisma-client/prisma-client.module';
import { JwtModule } from '@nestjs/jwt';
import { StoreModule } from './store/store.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    CommonModule, // Global module for response handling
    AuthModule,
    PrismaClientModule,
    StoreModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
})
export class AppModule {}
