import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { SaleAdjustmentsService } from './sale-adjustments.service';
import { CreateDamageDto, CreateRefundDto, CreateReturnDto, CreateExchangeDto } from './dto/sale-adjustments.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard'; // Assumed authentication guard
import { PermissionsGuard } from '../guards/permissions.guard'; // Assumed permissions guard
// import { User } from '../auth/decorators/user.decorator'; // Assumed user decorator

@Controller('sale-adjustments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SaleAdjustmentsController {
  constructor(private readonly saleAdjustmentsService: SaleAdjustmentsService) {}

  @Post('damage')
  async createDamage(@Body() createDamageDto: CreateDamageDto, user: { id: string }) {
    try {
      return await this.saleAdjustmentsService.createDamage(createDamageDto, user.id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('refund')
  async createRefund(@Body() createRefundDto: CreateRefundDto, user: { id: string }) {
    try {
      return await this.saleAdjustmentsService.createRefund(createRefundDto, user.id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('return')
  async createReturn(@Body() createReturnDto: CreateReturnDto, user: { id: string }) {
    try {
      return await this.saleAdjustmentsService.createReturn(createReturnDto, user.id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('exchange')
  async createExchange(@Body() createExchangeDto: CreateExchangeDto, user: { id: string }) {
    try {
      return await this.saleAdjustmentsService.createExchange(createExchangeDto, user.id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
