import {
  Get,
  UseGuards,
  Version,
  Request,
  Controller,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { CreateStoreDto, UpdateStoreDto } from './dto/dto.store';
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

  @Get('search')
  @ApiOperation({ summary: 'Search stores by query' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search term (name, email, address, or phone)',
  })
  async searchStores(@Request() req: any, @Query('q') q: string) {
    return this.handleServiceOperation(
      () => this.storeService.searchStores(req.user, q),
      'Stores search results',
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


  @StoreEndpoint.UpdateStore(UpdateStoreDto)
  @Put(':id')
  async updateStore(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.handleServiceOperation(
      () => this.storeService.updateStore(req.user, id, dto),
      'Store updated successfully',
    );
  }

  @StoreEndpoint.DeleteStore()
  @Delete(':id')
  async deleteStore(@Request() req: any, @Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.storeService.deleteStore(req.user, id),
      'Store deleted successfully',
    );
  }
}
