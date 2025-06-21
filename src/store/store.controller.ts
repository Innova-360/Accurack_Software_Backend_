import {
  Get,
  UseGuards,
  Version,
  Request,
  Controller,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { CreateStoreDto } from './dto/dto.store';
import { BaseAuthController, ResponseService } from '../common';
import { StoreEndpoint } from '../common/decorators/store-endpoint.decorator';

@ApiTags('Stores')
@Controller({ path: 'store', version: '1' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoreController extends BaseAuthController {
  constructor(
    private readonly storeService: StoreService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  @StoreEndpoint.CreateStore(CreateStoreDto)
  @Post('create')
  async createStore(@Request() req: any, @Body() dto: CreateStoreDto) {
    return this.handleServiceOperation(
      () => this.storeService.createStore(req.user, dto),
      'Store created successfully',
      201,
    );
  }

  @StoreEndpoint.GetUserStores()
  @Get('list')
  async getStores(@Request() req: any) {
    return this.handleServiceOperation(
      () => this.storeService.getStores(req.user),
      'Stores retrieved successfully',
    );
  }

  @StoreEndpoint.GetStoreById()
  @Get(':id')
  async findStoreById(@Request() req: any, @Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.storeService.findStoreById(req.user, id),
      'Store retrieved successfully',
    );
  }
}
