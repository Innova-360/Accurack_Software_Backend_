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
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { BaseProductController } from '../common/controllers/base-product.controller';
import { ProductEndpoint } from '../common/decorators/product-endpoint.decorator';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';


@UseGuards(JwtAuthGuard)
@Controller('product')
export class ProductController extends BaseProductController {
  constructor(
    private readonly productService: ProductService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  @Post('create')
  @ProductEndpoint.CreateProduct(CreateProductDto)
  async createProduct(@Req() req, @Body() createProductDto: CreateProductDto) {
    const user = req.user;
    return this.handleProductOperation(
      () => this.productService.createProduct(user, createProductDto),
      'Product created successfully',
    );
  }

  @Get('list')
  @ProductEndpoint.GetProducts()
  async getProducts(
    @Req() req,
    @Query('storeId') storeId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const user = req.user;
    return this.handleProductOperation(
      () => this.productService.getProducts(user, storeId, page, limit),
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

  @Post('uploadsheet')
  @ApiOperation({
    summary: 'Upload inventory from Excel file',
    description: 'Upload products inventory data from an Excel file (.xlsx, .xls)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file containing inventory data',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Inventory uploaded successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file format or data' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'File already uploaded' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadInventory(
    @Req() req,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(xlsx|xls|csv)$/,
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1024 * 1024, // 10MB
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    return this.handleProductOperation(
      () => this.productService.addInventory(req.user, file),
      'Inventory uploaded successfully',
    );
  }
}