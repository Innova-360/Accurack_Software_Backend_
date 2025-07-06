import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ValidatorService } from './validator.service';
import { UpdatePaymentDto, ValidateOrderDto } from './dto/validator.dto';
import { BaseValidatorController, ValidatorEndpoint, ResponseService } from '../common';

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
  async getOrdersForValidation(@Req() req: any) {
    return this.handleOrdersOperation(
      () => this.validatorService.getOrdersForValidation(req.user.id),
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

  @ValidatorEndpoint.ValidateOrder(ValidateOrderDto)
  @Patch('validate')
  async validateOrder(@Body() validateOrderDto: ValidateOrderDto, @Req() req: any) {
    return this.handleValidationOperation(
      () => this.validatorService.validateOrder(validateOrderDto.saleId, req.user.id),
      'Order validated successfully',
    );
  }
}