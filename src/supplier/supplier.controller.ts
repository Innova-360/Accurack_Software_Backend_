import { Controller, Post, Get, Put, Delete, Req, UseGuards, Body, Param, Query, ParseIntPipe, DefaultValuePipe } from "@nestjs/common";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { CreateSupplierDto, UpdateSupplierDto } from "./dto/dto.supplier";
import { SupplierService } from "./supplier.service";
import { SupplierEndpoint } from "src/common/decorators/auth-endpoint.decorator";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('suppliers')
@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @SupplierEndpoint.CreateSupplier(CreateSupplierDto)
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createSupplier(@Req() req, @Body() createSupplierDto: CreateSupplierDto) {
    const user = req.user;
    console.log("user",user);
    return await this.supplierService.createSupplier(user, createSupplierDto);
  }

  @SupplierEndpoint.GetSuppliers()
  @UseGuards(JwtAuthGuard)
  @Get('list')
  async getSuppliers(
    @Req() req,
    @Query('storeId') storeId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    const user = req.user;
    return await this.supplierService.getSuppliers(user, storeId, page, limit);
  }

  @SupplierEndpoint.GetSupplierById()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getSupplierById(@Req() req, @Param('id') supplierId: string) {
    const user = req.user;
    return await this.supplierService.getSupplierById(user, supplierId);
  }

  @SupplierEndpoint.UpdateSupplier(UpdateSupplierDto)
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateSupplier(
    @Req() req,
    @Param('id') supplierId: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    const user = req.user;
    return await this.supplierService.updateSupplier(user, supplierId, updateSupplierDto);
  }

  @SupplierEndpoint.DeleteSupplier()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteSupplier(@Req() req, @Param('id') supplierId: string) {
    const user = req.user;
    return await this.supplierService.deleteSupplier(user, supplierId);
  }
}