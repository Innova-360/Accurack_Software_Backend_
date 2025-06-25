import { Controller, Post, Get, Body, UseGuards, Request, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SaleAdjustmentsService } from './sale-adjustments.service';
import { CreateDamageDto, CreateRefundDto, CreateReturnDto, CreateExchangeDto } from './dto/sale-adjustments.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';

@ApiTags('Sale Adjustments')
@ApiBearerAuth()
@Controller('sale-adjustments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SaleAdjustmentsController {
  constructor(private readonly saleAdjustmentsService: SaleAdjustmentsService) {}

  @Post('damage')
  @ApiOperation({ summary: 'Create damage adjustment' })
  @ApiResponse({ status: 201, description: 'Damage adjustment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Sale not found' })
  async createDamage(@Body() createDamageDto: CreateDamageDto, @Request() req: any) {
    return await this.saleAdjustmentsService.createDamage(createDamageDto, req.user.id);
  }

  @Post('refund')
  @ApiOperation({ summary: 'Create refund adjustment' })
  @ApiResponse({ status: 201, description: 'Refund adjustment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Sale not found' })
  async createRefund(@Body() createRefundDto: CreateRefundDto, @Request() req: any) {
    return await this.saleAdjustmentsService.createRefund(createRefundDto, req.user.id);
  }

  @Post('return')
  @ApiOperation({ summary: 'Create return adjustment' })
  @ApiResponse({ status: 201, description: 'Return adjustment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Sale not found' })
  async createReturn(@Body() createReturnDto: CreateReturnDto, @Request() req: any) {
    return await this.saleAdjustmentsService.createReturn(createReturnDto, req.user.id);
  }

  @Post('exchange')
  @ApiOperation({ summary: 'Create exchange adjustment' })
  @ApiResponse({ status: 201, description: 'Exchange adjustment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Sale not found' })
  async createExchange(@Body() createExchangeDto: CreateExchangeDto, @Request() req: any) {
    return await this.saleAdjustmentsService.createExchange(createExchangeDto, req.user.id);
  }

  @Get('by-sale/:saleId')
  @ApiOperation({ summary: 'Get adjustments by sale ID' })
  @ApiResponse({ status: 200, description: 'Adjustments retrieved successfully' })
  async getAdjustmentsBySale(@Param('saleId') saleId: string) {
    return await this.saleAdjustmentsService.getAdjustmentsBySale(saleId);
  }

  @Get('by-store/:storeId')
  @ApiOperation({ summary: 'Get adjustments by store ID' })
  @ApiResponse({ status: 200, description: 'Adjustments retrieved successfully' })
  async getAdjustmentsByStore(
    @Param('storeId') storeId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return await this.saleAdjustmentsService.getAdjustmentsByStore(
      storeId, 
      parseInt(page), 
      parseInt(limit)
    );
  }
}
