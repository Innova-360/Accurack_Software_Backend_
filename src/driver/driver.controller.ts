import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DriverService } from './driver.service';
import {
  CreateOrderDto,
  PaginationDto,
  UpdateOrderDto,
} from './dto/driver.dto';
import {
  BaseDriverController,
  DriverEndpoint,
  ResponseService,
} from '../common';

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
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    return this.handleCreateOrderOperation(
      () =>
        this.driverService.createOrder(
          createOrderDto.storeId,
          createOrderDto,
          req.user,
        ),
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

  @DriverEndpoint.SendForValidation()
  @Post('order/validate/:orderId')
  async sendForValidation(@Req() req: any, @Param('orderId') orderId: string) {
    console.log(orderId);
    return this.handleValidationRequestOperation(
      () => this.driverService.sendForValidation(orderId, req.user),
      'Order sent for validation successfully',
    );
  }

  @DriverEndpoint.GetOrders()
  @Get('orders')
  async getOrders(
    @Req() req: any,
    @Query('storeId') storeId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    // Handle search query - ignore if not provided or empty
    const searchTerm = search && search.trim() !== '' ? search.trim() : undefined;
    
    return await this.handleGetOrdersOperation(
      () =>
        this.driverService.getOrders(
          req.user,
          storeId,
          Number(page),
          Number(limit),
          searchTerm,
        ),
      'Orders retrieved successfully',
    );
  }

  @DriverEndpoint.GetDrivers()
  @Get('drivers')
  async getDrivers(
    @Req() req: any,
    @Param('storeId') storeId: string,
    @Query() pagination: PaginationDto,
  ) {
    console.log(storeId);
    return this.handleServiceOperation(
      () => this.driverService.getDrivers(req.user, storeId, pagination),
      'Drivers retrieved successfully',
    );
  }
}
