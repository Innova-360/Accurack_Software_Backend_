import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaClientService } from './prisma-client/prisma-client.service';
import { JwtModule } from '@nestjs/jwt';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

@Module({
  imports: [
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [PrismaClientService],
})
export class AppModule {}
