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
  Request,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
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
  InvoiceQueryDto,
} from './dto/sale.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { BaseSaleController, SaleEndpoint, ResponseService } from '../common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

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
    @Body() dto: UpdateCustomerDto,
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
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
  ) {
    return this.handleSaleOperation(
      () =>
        this.saleService.getCustomers(
          storeId,
          parseInt(page),
          parseInt(limit),
          search
        ),
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
  @Post('create')
  async createSale(@Body() dto: CreateSaleDto, @Request() req: any) {
    return this.handleSaleCreation(
      () => this.saleService.createSale(dto, req.user),
      'Sale created successfully',
    );
  }

  @SaleEndpoint.SetSaleConfirmation(CreateSaleDto)
  @Post('saleConfirmation')
  async setSaleConfirmation(@Body() sale: CreateSaleDto, setStatus: 'CONFIRMED' | 'CANCELLED', @Req() req: any){
    return this.handleSaleCreation(
      () => this.saleService.setSaleConfirmation(setStatus, sale , req.user),
      'Sale created successfully',
    );
  }


  


  @SaleEndpoint.GetSales()
  @Get('list')
  async getSales(
    @Query('storeId') storeId: string,
    @Query() query: SaleQueryDto,
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
    @Body() dto: UpdateSaleDto,
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
  async createSaleReturn(
    @Body() dto: CreateSaleReturnDto,
    @Request() req: any,
  ) {
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

  @Post('uploadsheet')
  @ApiOperation({
    summary: 'Upload inventory from Excel or CSV file',
    description:
      'Upload products inventory data from an Excel file (.xlsx, .xls) or CSV file (.csv)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Excel (.xlsx, .xls) or CSV (.csv) file containing inventory data',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Inventory uploaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file format or data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'File already uploaded',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadInventory(
    @Req() req,
    @UploadedFile()
    file: Express.Multer.File,
    @Query('storeId') storeId?: string,
  ) {
    // Custom validation for file types
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/html',
    ];
    const allowedExtensions = /\.(xlsx|xls|csv|html)$/i;
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    const isValidExtension = allowedExtensions.test(file.originalname);

    if (!isValidMimeType && !isValidExtension) {
      throw new BadRequestException(
        `Invalid file type. Expected Excel (.xlsx, .xls .csv) and .html file. Received: ${file.mimetype}`,
      );
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    return this.handleSaleOperation(
      () => this.saleService.addSales(req.user, file, storeId ?? ''),
      'Inventory uploaded successfully',
    );
  }
}
