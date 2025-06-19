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
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductService } from './product.service';
import { ProductEndpoint } from '../common/decorators/product-endpoint.decorator';
import { ApiTags } from '@nestjs/swagger';
import { BaseProductController } from '../common/controllers/base-product.controller';
import { ResponseService } from '../common/services/response.service';

@ApiTags('products')
@Controller('product')
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
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    const user = req.user;

    return this.handleProductOperation(
      () => this.productService.getProducts(user, storeId, page, limit),
      'Products retrieved successfully',
    );
  }
  @ProductEndpoint.GetProductById()
  @Get(':id')
  async getProductById(@Req() req, @Param('id') productId: string) {
    const user = req.user;
    return this.handleProductOperation(
      () => this.productService.getProductById(user, productId),
      'Product retrieved successfully',
    );
  }
  @ProductEndpoint.UpdateProduct(UpdateProductDto)
  @Put(':id')
  async updateProduct(
    @Req() req,
    @Param('id') productId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const user = req.user;
    return this.handleProductOperation(
      () =>
        this.productService.updateProduct(user, productId, updateProductDto),
      'Product updated successfully',
    );
  }
  @ProductEndpoint.DeleteProduct()
  @Delete(':id')
  async deleteProduct(@Req() req, @Param('id') productId: string) {
    const user = req.user;
    return this.handleProductOperation(
      () => this.productService.deleteProduct(user, productId),
      'Product deleted successfully',
    );
  }
}
