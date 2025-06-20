import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { PrismaClientModule } from '../prisma-client/prisma-client.module';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ResponseService } from '../common/services/response.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PrismaClientModule,
  ],
  controllers: [ProductController],
  providers: [ProductService, JwtStrategy, ResponseService],
})
export class ProductModule {}
