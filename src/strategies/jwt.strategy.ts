import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

// Interface for JWT payload
interface JwtPayload {
  id: string;
  email: string;
  role?: string;
  clientId?: string;
  googleId?: string;
  iat?: number;
  exp?: number;
}

// Interface for validated user
interface ValidatedUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  clientId: string;
  googleId: string | null;
  status: string;
  stores: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaClientService,
    private jwtService: JwtService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Extract JWT from cookies
          const accessToken = request?.cookies?.['accessToken'] || request?.cookies?.['access_token'];
          const refreshToken = request?.cookies?.['refreshToken'] || request?.cookies?.['refresh_token'];
          
          // Prefer access token, fallback to refresh token
          return accessToken || refreshToken || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(), // Fallback to Bearer token
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    try {
      const user = await this.prisma.users.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          email: true,
          clientId: true,
          googleId: true,
          status: true,
          stores: {
            select: {
              storeId: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });
      
      if (!user) {
        throw new UnauthorizedException(
          'User not found or has been deactivated',
        );
      }

      const mappedStores = user.stores.map(
        (store: { storeId: string }) => store.storeId,
      );

      const validatedUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        email: user.email,
        clientId: user.clientId,
        googleId: user.googleId,
        status: user.status,
        stores: mappedStores,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      return validatedUser;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        'Invalid token or user validation failed',
      );
    }
  }
}
