import { Controller, Post, Get, Put, Delete, Req, UseGuards, Body, Param, Query, ParseIntPipe, DefaultValuePipe } from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import { ProductService } from "./product.service";
import { ProductEndpoint } from "src/common/decorators/auth-endpoint.decorator";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('products')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ProductEndpoint.CreateProduct(CreateProductDto)
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createProduct(@Req() req, @Body() createProductDto: CreateProductDto) {
    const user = req.user;
    return await this.productService.createProduct(user, createProductDto);
  }

  @ProductEndpoint.GetProducts()
  @UseGuards(JwtAuthGuard)
  @Get('list')
  async getProducts(
    @Req() req,
    @Query('storeId') storeId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    const user = req.user;
    return await this.productService.getProducts(user, storeId, page, limit);
  }

  @ProductEndpoint.GetProductById()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getProductById(@Req() req, @Param('id') productId: string) {
    const user = req.user;
    return await this.productService.getProductById(user, productId);
  }

  @ProductEndpoint.UpdateProduct(UpdateProductDto)
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateProduct(
    @Req() req,
    @Param('id') productId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const user = req.user;
    return await this.productService.updateProduct(user, productId, updateProductDto);
  }

  @ProductEndpoint.DeleteProduct()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteProduct(@Req() req, @Param('id') productId: string) {
    const user = req.user;
    return await this.productService.deleteProduct(user, productId);
  }
}
