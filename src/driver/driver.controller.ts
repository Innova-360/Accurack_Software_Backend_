// import {
//   Controller,
//   Post,
//   Body,
//   Patch,
//   Param,
//   UseGuards,
//   Get,
//   Req,
// } from '@nestjs/common';
// import { DriverService } from './driver.service';
// import {
//   CreateOrderDto,
//   UpdateOrderDto,
//   SendForValidationDto,
// } from './dto/driver.dto';
// import { JwtAuthGuard } from '../guards/jwt-auth.guard';

// @Controller('driver/orders')
// @UseGuards(JwtAuthGuard)
// export class DriverController {
//   constructor(private readonly driverService: DriverService) {}

//   @Post()
//   createOrder(
//     @Body() createOrderDto: CreateOrderDto,
//     @Req() req: any,
//     @Param('storeId') storeId: string,
//   ) {
//     return this.driverService.createOrder(storeId,createOrderDto, req.user);
//   }

//   @Patch(':id')
//   updateOrder(
//     @Param('orderId') orderId: string,
//     @Body() updateOrderDto: UpdateOrderDto,
//     @Req() req: any,
//   ) {
//     return this.driverService.updateOrder(orderId, updateOrderDto, req.user);
//   }

//   @Post('validate')
//   sendForValidation(
//     @Body() sendForValidationDto: SendForValidationDto,
//     @Req() req: any,
//   ) {
//     return this.driverService.sendForValidation(
//       sendForValidationDto.saleId,
//       req.user,
//     );
//   }

//   @Get()
//   getOrders(@Req() req: any) {
//     return this.driverService.getOrders(req.user);
//   }
// }
