import { Controller, Get, Patch, Body, Req, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ValidatorService } from './validator.service';
import { UpdatePaymentDto } from './dto/validator.dto';
import { BaseValidatorController, ValidatorEndpoint, ResponseService } from '../common';
import { PaginationDto } from 'src/driver/dto/driver.dto';

@ApiTags('validator')
@Controller('validator/orders')
export class ValidatorController extends BaseValidatorController {
  constructor(
    private readonly validatorService: ValidatorService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  @ValidatorEndpoint.GetOrdersForValidation()
  @Get()
  async getOrdersForValidation(@Req() req: any, @Query() pagination: PaginationDto) {
    return this.handleOrdersOperation(
      () => this.validatorService.getOrdersForValidation(req.user.id, pagination),
      'Orders for validation retrieved successfully',
    );
  }

  @ValidatorEndpoint.UpdatePayment(UpdatePaymentDto)
  @Patch('payment')
  async updatePayment(@Body() updatePaymentDto: UpdatePaymentDto, @Req() req: any) {
    return this.handlePaymentOperation(
      () => this.validatorService.updatePayment(updatePaymentDto, req.user.id),
      'Payment updated successfully',
    );
  }

  @ValidatorEndpoint.ValidateOrder()
  @Patch('validate/:orderId')
  async validateOrder(@Req() req: any, @Param('orderId') orderId: string) {
    return this.handleValidationOperation(
      () => this.validatorService.validateOrder(orderId, req.user.id),
      'Order validated successfully',
    );
  }


  @ValidatorEndpoint.RejectOrder()
  @Patch('reject/:orderId')
  async rejectOrder(@Req() req: any, @Param('orderId') orderId: string) {
    return this.handleValidationOperation(
      () => this.validatorService.rejectOrder(orderId, req.user.id),
      'Order rejected successfully',
    );
  }

  @ValidatorEndpoint.ConfirmOrder()
  @Patch('confirm/:orderId')
  async confirmOrder(@Req() req: any, @Param('orderId') orderId: string) {
    return this.handleValidationOperation(
      () => this.validatorService.confirmOrder(orderId, req.user.id),
      'Order confirmed successfully',
    );
  }

  @ValidatorEndpoint.ShipOrder()
  @Patch('ship/:orderId')
  async shipOrder(@Req() req: any, @Param('orderId') orderId: string) {
    return this.handleValidationOperation(
      () => this.validatorService.shipOrder(orderId, req.user.id),
      'Order shipped successfully',
    );
  }
}