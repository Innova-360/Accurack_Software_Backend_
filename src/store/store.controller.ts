import {
  Get,
  UseGuards,
  Version,
  Request,
  Controller,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateStoreDto } from './dto/dto.store';
import { ResponseService } from '../common/services/response.service';

@ApiTags('Stores')
@Controller('store')
export class StoreController {
  constructor(
    private readonly storeService: StoreService,
    private readonly responseService: ResponseService,
  ) {}

  @ApiOperation({ summary: 'Create a new store' })
  @ApiBody({ type: CreateStoreDto })
  @ApiResponse({
    status: 201,
    description: 'Store created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Store created successfully' },
        store: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            name: { type: 'string', example: 'Downtown Store' },
            email: { type: 'string', example: 'store@example.com' },
            address: {
              type: 'string',
              example: '123 Main St, City, State 12345',
            },
            phone: { type: 'string', example: '+1-555-123-4567' },
            currency: { type: 'string', example: 'USD' },
            timezone: { type: 'string', example: 'America/New_York' },
            createdAt: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiBearerAuth('JWT-auth')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createStore(@Request() req, @Body() dto: CreateStoreDto) {
    const user = req.user; // This contains the user details from JWT
    console.log('Creating store for user:', user); // Debug log
    return await this.storeService.createStore(user, dto);
  }

  
  @ApiOperation({ summary: 'Get list of user stores' })
  @ApiResponse({
    status: 200,
    description: 'Stores retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        stores: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174000',
              },
              name: { type: 'string', example: 'Downtown Store' },
              email: { type: 'string', example: 'store@example.com' },
              address: {
                type: 'string',
                example: '123 Main St, City, State 12345',
              },
              phone: { type: 'string', example: '+1-555-123-4567' },
              currency: { type: 'string', example: 'USD' },
              timezone: { type: 'string', example: 'America/New_York' },
              role: { type: 'string', example: 'manager' },
              createdAt: {
                type: 'string',
                example: '2025-06-18T10:30:00.000Z',
              },
            },
          },
        },
        total: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiBearerAuth('JWT-auth')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @Get('list')
  async getStores(@Request() req) {
    const user = req.user;
    return await this.storeService.getStores(user);
  }
}
