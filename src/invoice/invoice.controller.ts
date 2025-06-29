import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { Invoice } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ResponseService } from '../common';
import { BaseInvoiceController } from '../common/decorators/base-invoice.controller';
import { InvoiceEndpoint } from '../common/decorators/invoice-endpoint.decorator';

@ApiTags('invoice')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('invoice')
export class InvoiceController extends BaseInvoiceController {
  constructor(
    private invoiceService: InvoiceService,
    protected responseService: ResponseService,
  ) {
    super(responseService);
  }

 
  @InvoiceEndpoint.CreateInvoice(CreateInvoiceDto)
  @Post()
  async createInvoice(@Body() dto: CreateInvoiceDto): Promise<Invoice> {
    return this.handleServiceOperation(
      () => this.invoiceService.createInvoice(dto),
      'Invoice created successfully',
      201,
    );
  }

 
  @InvoiceEndpoint.GetInvoice()
  @Get(':id')
  async getInvoice(@Param('id') id: string): Promise<Invoice> {
    return this.handleServiceOperation(
      () => this.invoiceService.getInvoice(id),
      'Invoice retrieved successfully',
    );
  }

 
  @InvoiceEndpoint.GetInvoicesByStore()
  @Get('store/:storeId')
  async getInvoicesByStore(@Param('storeId') storeId: string): Promise<Invoice[]> {
    return this.handleServiceOperation(
      () => this.invoiceService.getInvoicesByStore(storeId),
      'Invoices retrieved successfully',
    );
  }
}
