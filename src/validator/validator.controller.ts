// import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
// import { ValidatorService } from './validator.service';
// import { UpdatePaymentDto, ValidateOrderDto } from './dto/validator.dto';
// import { JwtAuthGuard } from '../guards/jwt-auth.guard';


// @Controller('validator/orders')
// @UseGuards(JwtAuthGuard)
// export class ValidatorController {
//   constructor(private readonly validatorService: ValidatorService) {}

//   @Get()
//   getOrdersForValidation(@Req() req: any) {
//     return this.validatorService.getOrdersForValidation(req.user.id);
//   }

//   @Patch('payment')
//   updatePayment(@Body() updatePaymentDto: UpdatePaymentDto, @Req() req: any) {
//     return this.validatorService.updatePayment(updatePaymentDto, req.user.id);
//   }

//   @Patch('validate')
//   validateOrder(@Body() validateOrderDto: ValidateOrderDto, @Req() req: any) {
//     return this.validatorService.validateOrder(validateOrderDto.saleId, req.user.id);
//   }
// }