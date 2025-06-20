import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaClientService } from '../prisma-client/prisma-client.service';

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
  constructor(private prisma: PrismaClientService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Extract JWT from cookies (e.g., cookie named 'jwt')
          const token =
            request?.cookies?.['accessToken'] ||
            request?.cookies?.['refreshToken'];
          return token || null; // Return token or null if not found
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
      console.error('JWT validation error:', error); // Debug log
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        'Invalid token or user validation failed',
      );
    }
  }
}
