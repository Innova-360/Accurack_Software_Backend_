import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaClientService } from '../prisma-client/prisma-client.service';

// Interface for JWT payload
interface JwtPayload {
  sub: string; // Changed from 'id' to 'sub' (standard JWT claim)
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
  clientId: string | null;
  googleId?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
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
      console.log('JWT Payload received:', payload); // Debug log

      const user = await this.prisma.users.findUnique({
        where: { id: payload.sub }, // Changed from payload.id to payload.sub
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          email: true,
          clientId: true,
          googleId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      } as any); // Temporary type assertion for googleId

      console.log('User found:', user ? 'Yes' : 'No'); // Debug log

      if (!user) {
        throw new UnauthorizedException(
          'User not found or has been deactivated',
        );
      }

      const validatedUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        email: user.email,
        clientId: user.clientId,
        googleId: (user as any).googleId,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      console.log('Returning validated user:', validatedUser); // Debug log
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
