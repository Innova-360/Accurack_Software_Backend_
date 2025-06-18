import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaClientService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Extract JWT from cookies (e.g., cookie named 'jwt')
          const token = request?.cookies?.['accessToken'] || request?.cookies?.['refreshToken'];
          return token || null; // Return token or null if not found
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(), // Fallback to Bearer token
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.users.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        role: true,
        email: true,
        clientId: true,
        stores: { select: { storeId: true } },
      },
    });

    console.log('JWT Strategy - validate', { payload, user });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { id: user.id, role: user.role, email: user.email, clientId: user.clientId, stores: user.stores };
  }
}