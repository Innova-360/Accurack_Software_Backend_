import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaClientModule } from './prisma-client/prisma-client.module';
import { JwtModule } from '@nestjs/jwt';
import { StoreModule } from './store/store.module';

@Module({
  imports: [
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
