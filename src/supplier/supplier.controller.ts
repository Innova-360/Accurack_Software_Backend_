import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Req,
  UseGuards,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Version,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/dto.supplier';
import { SupplierService } from './supplier.service';
import { SupplierEndpoint } from '../common/decorators/supplier-endpoint.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BaseSupplierController } from '../common/controllers/base-supplier.controller';
import { ResponseService } from '../common/services/response.service';

@ApiTags('Suppliers')
@Controller({ path: 'supplier', version: '1' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupplierController extends BaseSupplierController {
  constructor(
    private readonly supplierService: SupplierService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  @SupplierEndpoint.CreateSupplier(CreateSupplierDto)
  @Post('create')
  async createSupplier(
    @Req() req,
    @Body() createSupplierDto: CreateSupplierDto,
  ) {
    const user = req.user;
    console.log('user', user);
    return this.handleSupplierOperation(
      () => this.supplierService.createSupplier(user, createSupplierDto),
      'Supplier created successfully',
      201,
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search suppliers by query' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search term (name, email, phone, or address)',
  })
  @ApiQuery({
    name: 'storeId',
    required: false,
    type: String,
    description: 'Optional store ID to filter suppliers',
  })
  async searchSuppliers(
    @Req() req,
    @Query('q') q: string,
    @Query('storeId') storeId?: string,
  ) {
    const user = req.user;
    return this.handleSupplierOperation(
      () => this.supplierService.searchSuppliers(user, q, storeId),
      'Suppliers search results',
    );
  }

  @SupplierEndpoint.GetSuppliers()
  @Get('list')
  async getSuppliers(
    @Req() req,
    @Query('storeId') storeId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    const user = req.user;

    return this.handleSupplierOperation(
      () => this.supplierService.getSuppliers(user, storeId, page, limit),
      'Suppliers retrieved successfully',
    );
  }

  @SupplierEndpoint.GetSupplierById()
  @Get(':id')
  async getSupplierById(@Req() req, @Param('id') supplierId: string) {
    const user = req.user;
    return this.handleSupplierOperation(
      () => this.supplierService.getSupplierById(user, supplierId),
      'Supplier retrieved successfully',
    );
  }

  @SupplierEndpoint.GetSupplierBySupplierId()
  @Get('by-supplier-id/:supplierId')
  async getSupplierBySupplierId(
    @Req() req,
    @Param('supplierId') supplierId: string,
  ) {
    const user = req.user;
    return this.handleSupplierOperation(
      () => this.supplierService.getSupplierBySupplierId(user, supplierId),
      'Supplier retrieved successfully',
    );
  }

  @SupplierEndpoint.UpdateSupplier(UpdateSupplierDto)
  @Put(':id')
  async updateSupplier(
    @Req() req,
    @Param('id') supplierId: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    const user = req.user;
    return this.handleSupplierOperation(
      () =>
        this.supplierService.updateSupplier(
          user,
          supplierId,
          updateSupplierDto,
        ),
      'Supplier updated successfully',
    );
  }
  @SupplierEndpoint.DeleteSupplier()
  @Delete(':id')
  async deleteSupplier(@Req() req, @Param('id') supplierId: string) {
    const user = req.user;
    return this.handleSupplierOperation(
      () => this.supplierService.deleteSupplier(user, supplierId),
      'Supplier deleted successfully',
    );
  }
}
