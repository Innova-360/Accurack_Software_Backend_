import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GoogleOAuthGuard } from '../guards/google-oauth.guard';
import { RolesGuard } from '../guards/roles.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
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
  exports: [AuthService, JwtAuthGuard, GoogleOAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
