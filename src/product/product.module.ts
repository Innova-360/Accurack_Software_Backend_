import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { PrismaClientModule } from '../prisma-client/prisma-client.module';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ResponseService } from '../common/services/response.service';
import { PermissionsService } from 'src/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import { MultiTenantService } from '../database/multi-tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PrismaClientModule,
  ],
  controllers: [ProductController, CategoryController],
  providers: [
    ProductService,
    CategoryService,
    JwtStrategy,
    ResponseService,
    PermissionsService,
    TenantContextService, // Add tenant context
    MultiTenantService, // Required by TenantContextService
    PrismaService, // Required by TenantContextService
  ],
})
export class ProductModule {}
