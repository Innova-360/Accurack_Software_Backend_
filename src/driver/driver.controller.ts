import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DriverService } from './driver.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  SendForValidationDto,
} from './dto/driver.dto';
import { BaseDriverController, DriverEndpoint, ResponseService } from '../common';

@ApiTags('driver')
@Controller('driver')
export class DriverController extends BaseDriverController {
  constructor(
    private readonly driverService: DriverService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  @DriverEndpoint.CreateOrder(CreateOrderDto)
  @Post('order')
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: any,
  ) {
    return this.handleCreateOrderOperation(
      () => this.driverService.createOrder(createOrderDto.storeId, createOrderDto, req.user),
      'Order created successfully',
    );
  }

  @DriverEndpoint.UpdateOrder(UpdateOrderDto)
  @Patch('order/:id')
  async updateOrder(
    @Param('id') orderId: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Req() req: any,
  ) {
    return this.handleUpdateOrderOperation(
      () => this.driverService.updateOrder(orderId, updateOrderDto, req.user),
      'Order updated successfully',
    );
  }

  @DriverEndpoint.SendForValidation(SendForValidationDto)
  @Post('order/validate')
  async sendForValidation(
    @Body() sendForValidationDto: SendForValidationDto,
    @Req() req: any,
  ) {
    return this.handleValidationRequestOperation(
      () => this.driverService.sendForValidation(sendForValidationDto.saleId, req.user),
      'Order sent for validation successfully',
    );
  }

  @DriverEndpoint.GetOrders()
  @Get('orders')
  async getOrders(@Req() req: any) {
    return this.handleGetOrdersOperation(
      () => this.driverService.getOrders(req.user),
      'Orders retrieved successfully',
    );
  }

  @DriverEndpoint.GetDrivers()
  @Get('drivers')
  async getDrivers(@Req() req: any) {
    return this.handleServiceOperation(
      () => this.driverService.getDrivers(req.user),
      'Drivers retrieved successfully',
    );
  }
}
