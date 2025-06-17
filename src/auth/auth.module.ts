import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from '../guard/jwt.strategy';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GoogleOAuthGuard } from '../guards/google-oauth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PrismaClientModule } from 'src/prisma-client/prisma-client.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaClientModule,
    JwtModule.register({
      secret: (() => {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new Error(
            'JWT_SECRET environment variable is required but not defined',
          );
        }
        return jwtSecret;
      })(),
      signOptions: { expiresIn: '24h' },
    }),
    MailerModule.forRoot({
      transport: {
        host:
          process.env.SMTP_HOST ||
          (() => {
            console.warn(
              'SMTP_HOST not defined, email functionality may not work',
            );
            return 'localhost';
          })(),
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      },
      defaults: {
        from: '"Accurack" <no-reply@accurack.com>',
      },
      template: {
        dir: process.cwd() + '/templates/',
        adapter: new HandlebarsAdapter(),
        options: { strict: true },
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    JwtAuthGuard,
    GoogleOAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    GoogleOAuthGuard,
    RolesGuard,
    JwtModule,
    JwtStrategy,
  ],
})
export class AuthModule {}
