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
@Controller('driver/orders')
export class DriverController extends BaseDriverController {
  constructor(
    private readonly driverService: DriverService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  @DriverEndpoint.CreateOrder(CreateOrderDto)
  @Post()
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
  @Patch(':id')
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
  @Post('validate')
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
  @Get()
  async getOrders(@Req() req: any) {
    return this.handleGetOrdersOperation(
      () => this.driverService.getOrders(req.user),
      'Orders retrieved successfully',
    );
  }
}
