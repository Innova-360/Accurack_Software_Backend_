import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Query,
  Body,
  Req,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
} from './dto/product.dto';
import { BaseProductController } from '../common/controllers/base-product.controller';
import { ProductEndpoint } from '../common/decorators/product-endpoint.decorator';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';

@ApiTags('Products')
@Controller({ path: 'products', version: '1' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductController extends BaseProductController {
  constructor(
    private readonly productService: ProductService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  @ProductEndpoint.CreateProduct(CreateProductDto)
  @Post('create')
  async createProduct(@Req() req, @Body() createProductDto: CreateProductDto) {
    const user = req.user;
    return this.handleProductOperation(
      () => this.productService.createProduct(user, createProductDto),
      'Product created successfully',
      201,
    );
  }

  @ProductEndpoint.GetProducts()
  @Get('list')
  async getProducts(
    @Req() req,
    @Query('storeId') storeId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const user = req.user;
    return this.handleGetProducts(
      () => this.productService.getProducts(user, storeId || '', page, limit),
      'Products retrieved successfully',
    );
  }

  @ProductEndpoint.GetProductById()
  @Get(':id')
  async getProductById(@Req() req, @Param('id') id: string) {
    const user = req.user;
    return this.handleGetProduct(
      () => this.productService.getProductById(user, id),
      'Product retrieved successfully',
    );
  }

  @ProductEndpoint.UpdateProduct(UpdateProductDto)
  @Put(':id')
  async updateProduct(
    @Req() req,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const user = req.user;
    return this.handleProductOperation(
      () => this.productService.updateProduct(user, id, updateProductDto),
      'Product updated successfully',
    );
  }

  @ProductEndpoint.DeleteProduct()
  @Delete(':id')
  async deleteProduct(@Req() req, @Param('id') id: string) {
    const user = req.user;
    return this.handleProductOperation(
      () => this.productService.deleteProduct(user, id),
      'Product deleted successfully',
    );
  }
}
