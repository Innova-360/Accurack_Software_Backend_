import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaClientService } from '../prisma-client/prisma-client.service';

// Interface for JWT payload
interface JwtPayload {
  id: string;
  email: string;
  role?: string;
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
  clientId: string | null;
  stores: { storeId: string }[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaClientService) {
    // Validate JWT_SECRET environment variable
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error(
        'JWT_SECRET environment variable is required but not defined',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
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
          stores: { select: { storeId: true } },
        },
      });

      if (!user) {
        throw new UnauthorizedException(
          'User not found or has been deactivated',
        );
      }

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        email: user.email,
        clientId: user.clientId,
        stores: user.stores,
      };
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
