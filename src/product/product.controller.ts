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
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags,ApiConsumes, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { BaseProductController } from '../common/controllers/base-product.controller';
import { ProductEndpoint } from '../common/decorators/product-endpoint.decorator';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  AssignSupplierDto,
} from './dto/product.dto';

import { PermissionsGuard } from '../guards/permissions.guard';


@ApiTags('Products')
@Controller({ path: 'product', version: '1' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
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
    @Query('limit') limit: number = 15000,
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

  @ProductEndpoint.DeleteAllProduct()
  @Delete('delete/all')
  async deleteAllProduct(@Req() req, @Query('storeId') storeId: string) {
    const user = req.user;
    return this.handleProductOperation(
      () => this.productService.deleteAllProduct(user, storeId),
      'Product deleted successfully',
    );
  }

  @ProductEndpoint.AssignSupplier() // product-endpoint.decorator contains swagger doc tags and api responses. 
  @Post('assign-supplier')
  async assignSupplier(@Req() req, dto: AssignSupplierDto){
    return this.handleProductOperation(
      () => this.productService.assignSupplier(dto),
      'Supplier has been added on product'
    )
  }

  @Post('uploadsheet')  @ApiOperation({
    summary: 'Upload inventory from Excel or CSV file',
    description: 'Upload products inventory data from an Excel file (.xlsx, .xls) or CSV file (.csv)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel (.xlsx, .xls) or CSV (.csv) file containing inventory data',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Inventory uploaded successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file format or data' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'File already uploaded' })  @UseInterceptors(FileInterceptor('file'))
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
      'application/vnd.ms-excel'
    ];
    
    const allowedExtensions = /\.(xlsx|xls|csv)$/i;
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    const isValidExtension = allowedExtensions.test(file.originalname);

    if (!isValidMimeType && !isValidExtension) {
      throw new BadRequestException(
        `Invalid file type. Expected Excel (.xlsx, .xls) or CSV (.csv) file. Received: ${file.mimetype}`
      );
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    return this.handleProductOperation(
      () => this.productService.addInventory(req.user, file, storeId ?? ''),
      'Inventory uploaded successfully',
    );
  }
}
