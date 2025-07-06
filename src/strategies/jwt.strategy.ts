import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { MultiTenantService } from '../database/multi-tenant.service';
import { PrismaClient } from '@prisma/client';

// JWT payload structure
interface JwtPayload {
  id: string;
  email: string;
  role?: string;
  clientId?: string;
  googleId?: string;
  iat?: number;
  exp?: number;
}

// Validated user shape
interface ValidatedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string | null;
  clientId: string;
  googleId: string | null;
  status: string;
  businessId?: string;
  stores: string[]; // Array of Store IDs (storeId)
  createdAt: Date;
  updatedAt: Date;
  business?: {
    id: string;
    businessName: string;
    contactNo: string;
    website?: string;
    logoUrl?: string;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaClientService,
    private jwtService: JwtService,
    private multiTenantService: MultiTenantService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) =>
          req?.cookies?.['accessToken'] ||
          req?.cookies?.['access_token'] ||
          req?.cookies?.['refreshToken'] ||
          req?.cookies?.['refresh_token'] ||
          null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    try {
      // First, try to find user in master database
      let user = await this.prisma.users.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          clientId: true,
          googleId: true,
          status: true,
          businessId: true,
          createdAt: true,
          updatedAt: true,
          stores: {
            select: {
              storeId: true,
            },
          },
          business: {
            select: {
              id: true,
              businessName: true,
              contactNo: true,
              website: true,
              logoUrl: true,
            },
          },
        },
      });

      // If user not found in master database and has clientId, check tenant database
      if (!user && payload.clientId) {
        try {
          const credentials = await this.multiTenantService[
            'getTenantCredentials'
          ](payload.clientId);
          if (credentials) {
            const tenantDatabaseUrl = `postgresql://${credentials.userName}:${credentials.password}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${credentials.databaseName}`;

            const tenantPrisma = new PrismaClient({
              datasources: { db: { url: tenantDatabaseUrl } },
            });

            try {
              await tenantPrisma.$connect();

              user = await tenantPrisma.users.findUnique({
                where: { id: payload.id },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                  clientId: true,
                  googleId: true,
                  status: true,
                  businessId: true,
                  createdAt: true,
                  updatedAt: true,
                  stores: {
                    select: {
                      storeId: true,
                    },
                  },
                  business: {
                    select: {
                      id: true,
                      businessName: true,
                      contactNo: true,
                      website: true,
                      logoUrl: true,
                    },
                  },
                },
              });
            } finally {
              await tenantPrisma.$disconnect();
            }
          }
        } catch (error) {
          console.error('Error validating user in tenant database:', error);
        }
      }

      if (!user) {
        throw new UnauthorizedException('User not found or inactive.');
      }

      const storeIds = user.stores.map((s) => s.storeId);

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role ?? null,
        clientId: user.clientId,
        googleId: user.googleId ?? null,
        status: user.status,
        businessId: user.businessId ?? undefined,
        stores: storeIds,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        ...(user.business && {
          business: {
            id: user.business.id,
            businessName: user.business.businessName,
            contactNo: user.business.contactNo,
            website: user.business.website ?? undefined,
            logoUrl: user.business.logoUrl ?? undefined,
          },
        }),
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('JWT validation failed.');
    }
  }
}
