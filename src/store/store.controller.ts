import { Get, Injectable, UseGuards, Version, Request, Controller, Post, Body } from '@nestjs/common';
import { StoreService } from './store.service';
import { JwtStrategy } from 'src/guard/jwt.strategy';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { CreateStoreDto } from './dto/dto.store';

@Controller('store')
export class StoreController {
    constructor(
        private readonly storeService: StoreService,
    ){}
    

  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createStore(@Request() req, @Body() dto: CreateStoreDto) {
    const user = req.user; // This contains the user details from JWT
    return await this.storeService.createStore(user, dto);
  }

  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Get('list')
  async getStores(@Request() req) {
    const user = req.user;
    return await this.storeService.getStores(user);
  }
}
