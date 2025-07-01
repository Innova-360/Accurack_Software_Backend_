import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from '../strategies/google.strategy';
import { JwtStrategy } from '../strategies/jwt.strategy';

import { PrismaClientModule } from 'src/prisma-client/prisma-client.module';
import { MailModule } from 'src/mail/mail.module';
import { PermissionsModule } from 'src/permissions/permissions.module';
import { MultiTenantService } from '../database/multi-tenant.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { GoogleOAuthGuard } from 'src/guards/google-oauth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

// Check if Google OAuth is configured
const isGoogleOAuthConfigured = () => {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
};

// Create conditional providers array
const createProviders = (): any[] => {
  const baseProviders: any[] = [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    GoogleOAuthGuard,
    RolesGuard,
    MultiTenantService, // Add MultiTenantService for tenant database creation
  ];

  // Only add GoogleStrategy if Google OAuth is properly configured
  if (isGoogleOAuthConfigured()) {
    baseProviders.push(GoogleStrategy);
    console.log('✅ Google OAuth is configured - GoogleStrategy enabled');
  } else {
    console.log('⚠️  Google OAuth not configured - GoogleStrategy disabled');
  }

  return baseProviders;
};

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
      signOptions: { expiresIn: '15m' }, // Match the cookie expiration
    }),
    MailModule,
    PermissionsModule,
  ],
  controllers: [AuthController],
  providers: createProviders(),
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
