import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { SaleService } from './sale.service';
import { 
  CreateSaleDto, 
  UpdateSaleDto, 
  CreateSaleReturnDto, 
  CreatePaymentDto, 
  SaleQueryDto,
  CreateCustomerDto,
  UpdateCustomerDto,
  InvoiceQueryDto
} from './dto/sale.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { BaseSaleController, SaleEndpoint, ResponseService } from '../common';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SaleController extends BaseSaleController {
  constructor(
    private readonly saleService: SaleService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  // Customer endpoints
  @SaleEndpoint.CreateCustomer(CreateCustomerDto)
  @Post('customers')
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.handleCustomerOperation(
      () => this.saleService.createCustomer(dto),
      'Customer created successfully',
      201,
    );
  }

  @SaleEndpoint.FindCustomerByPhone()
  @Get('customers/phone/:phoneNumber')
  async findCustomerByPhone(@Param('phoneNumber') phoneNumber: string) {
    return this.handleCustomerOperation(
      () => this.saleService.findCustomerByPhone(phoneNumber),
      'Customer found successfully',
    );
  }

  @SaleEndpoint.UpdateCustomer(UpdateCustomerDto)
  @Put('customers/:customerId')
  async updateCustomer(
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerDto
  ) {
    return this.handleCustomerOperation(
      () => this.saleService.updateCustomer(customerId, dto),
      'Customer updated successfully',
    );
  }

  @SaleEndpoint.GetCustomers()
  @Get('customers')
  async getCustomers(
    @Query('storeId') storeId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.handleSaleOperation(
      () => this.saleService.getCustomers(storeId, parseInt(page), parseInt(limit)),
      'Customers retrieved successfully',
    );
  }

  @SaleEndpoint.GetCustomerBalance()
  @Get('customers/:customerId/balance')
  async getCustomerBalance(@Param('customerId') customerId: string) {
    return this.handleCustomerOperation(
      () => this.saleService.getCustomerBalance(customerId),
      'Balance retrieved successfully',
    );
  }

  // Sale endpoints
  @SaleEndpoint.CreateSale(CreateSaleDto)
  @Post()
  async createSale(@Body() dto: CreateSaleDto, @Request() req: any) {
    return this.handleSaleCreation(
      () => this.saleService.createSale(dto, req.user.id),
      'Sale created successfully',
    );
  }

  @SaleEndpoint.GetSales()
  @Get()
  async getSales(
    @Query('storeId') storeId: string,
    @Query() query: SaleQueryDto
  ) {
    return this.handleSaleOperation(
      () => this.saleService.getSales(query, storeId),
      'Sales retrieved successfully',
    );
  }

  @SaleEndpoint.GetSaleById()
  @Get(':saleId')
  async getSaleById(@Param('saleId') saleId: string) {
    return this.handleSaleOperation(
      () => this.saleService.getSaleById(saleId),
      'Sale retrieved successfully',
    );
  }

  @SaleEndpoint.UpdateSale(UpdateSaleDto)
  @Put(':saleId')
  async updateSale(
    @Param('saleId') saleId: string,
    @Body() dto: UpdateSaleDto
  ) {
    return this.handleSaleOperation(
      () => this.saleService.updateSale(saleId, dto),
      'Sale updated successfully',
    );
  }

  @SaleEndpoint.DeleteSale()
  @Delete(':saleId')
  async deleteSale(@Param('saleId') saleId: string) {
    return this.handleInventoryOperation(
      () => this.saleService.deleteSale(saleId),
      'Sale deleted successfully',
    );
  }

  // Return endpoints
  @SaleEndpoint.CreateSaleReturn(CreateSaleReturnDto)
  @Post('returns')
  async createSaleReturn(@Body() dto: CreateSaleReturnDto, @Request() req: any) {
    return this.handleReturnOperation(
      () => this.saleService.createSaleReturn(dto, req.user.id),
      'Return processed successfully',
    );
  }

  // Payment endpoints
  @SaleEndpoint.CreatePayment(CreatePaymentDto)
  @Post('payments')
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.handlePaymentOperation(
      () => this.saleService.createPayment(dto),
      'Payment recorded successfully',
    );
  }
}
