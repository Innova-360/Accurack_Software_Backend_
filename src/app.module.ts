import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaClientService } from './prisma-client/prisma-client.service';
import { JwtModule } from '@nestjs/jwt';
import { StoreModule } from './store/store.module';

@Module({
  imports: [
    AuthModule,
    StoreModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [PrismaClientService],
})
export class AppModule {}
