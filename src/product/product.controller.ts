import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Query,
  Body,
  Req,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { BaseProductController } from '../common/controllers/base-product.controller';
import { ProductEndpoint } from '../common/decorators/product-endpoint.decorator';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import {
  CreateProductDto,
  UpdateProductDto,
  AssignSupplierDto,
  UpdateVariantQuantityDto,
} from './dto/product.dto';
import { UpdateProductQuantityDto } from './dto/update-product-quantity.dto';

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
    @Query('storeId') storeId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '15000',
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: string = 'desc',
  ) {
    const user = req.user;
    return this.handleProductOperation(
      () =>
        this.productService.getProducts(
          user,
          storeId,
          Number(page),
          Number(limit),
          sortBy as
            | 'name'
            | 'createdAt'
            | 'updatedAt'
            | 'singleItemSellingPrice'
            | 'msrpPrice'
            | 'itemQuantity'
            | 'sku'
            | 'pluUpc'
            | 'ean'
            | 'discountAmount'
            | 'percentDiscount'
            | 'category'
            | 'supplier'
            | 'minimumSellingQuantity',
          sortOrder as 'asc' | 'desc',
        ),
      'Products retrieved successfully',
    );
  }

  @Get('search')
  @ProductEndpoint.SearchProducts()
  async searchProducts(
    @Req() req,
    @Query('q') query: string,
    @Query('storeId') storeId?: string,
  ) {
    const user = req.user;
    return this.handleProductOperation(
      () => this.productService.searchProducts(user, query, storeId),
      'Products found successfully',
    );
  }

  @Get('search/advanced')
  @ApiOperation({
    summary: 'Advanced product search with filters',
    description:
      'Search products with advanced filtering options including category, price range, stock status, and variants',
  })
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiQuery({ name: 'storeId', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: String,
    description: 'Minimum price as string (will be converted to number)',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: String,
    description: 'Maximum price as string (will be converted to number)',
  })
  @ApiQuery({
    name: 'inStock',
    required: false,
    type: String,
    description: 'Stock filter as string: "true" or "false"',
  })
  @ApiQuery({
    name: 'hasVariants',
    required: false,
    type: String,
    description: 'Variant filter as string: "true" or "false"',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: String,
    description: 'Limit as string (will be converted to number)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: String,
    description: 'Page as string (will be converted to number)',
  })
  async searchProductsAdvanced(
    @Req() req,
    @Query('query') query?: string,
    @Query('storeId') storeId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('inStock') inStock?: string,
    @Query('hasVariants') hasVariants?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const user = req.user;
    const searchOptions = {
      query,
      storeId,
      categoryId,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      inStock: inStock !== undefined ? inStock === 'true' : undefined,
      hasVariants:
        hasVariants !== undefined ? hasVariants === 'true' : undefined,
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
    };

    return this.handleProductOperation(
      () => this.productService.searchProductsAdvanced(user, searchOptions),
      'Products found successfully',
    );
  }

  @Get('search/fuzzy')
  @ApiOperation({
    summary: 'Fuzzy product search',
    description:
      'Search products with fuzzy matching to handle typos and partial matches',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query',
  })
  @ApiQuery({
    name: 'storeId',
    required: false,
    type: String,
    description: 'Store ID to filter by',
  })
  @ApiQuery({
    name: 'threshold',
    required: false,
    type: String,
    description: 'Fuzzy matching threshold as string (0.1-1.0, default: 0.4)',
  })
  async searchProductsFuzzy(
    @Req() req,
    @Query('q') query: string,
    @Query('storeId') storeId?: string,
    @Query('threshold') threshold?: string,
  ) {
    const user = req.user;
    const fuzzyThreshold = threshold ? Number(threshold) : 0.4;

    return this.handleProductOperation(
      () =>
        this.productService.searchProductsFuzzy(
          user,
          query,
          storeId,
          fuzzyThreshold,
        ),
      'Products found successfully',
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

  @ProductEndpoint.UpdateQuantity(UpdateProductQuantityDto)
  @Patch(':id/quantity')
  async updateProductQuantity(
    @Req() req,
    @Param('id') id: string,
    @Body() updateQuantityDto: UpdateProductQuantityDto,
  ) {
    const user = req.user;
    return this.handleProductOperation(
      () =>
        this.productService.updateQuantity(
          user,
          id,
          updateQuantityDto.quantity,
        ),
      'Product quantity updated successfully',
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

  @ProductEndpoint.AssignSupplier()
  @Post('assign-supplier')
  async assignSupplier(@Req() req, @Body() dto: AssignSupplierDto) {
    return this.handleProductOperation(
      () => this.productService.assignSupplier(dto),
      'Supplier has been added on product',
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
    ];

    const allowedExtensions = /\.(xlsx|xls|csv)$/i;
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    const isValidExtension = allowedExtensions.test(file.originalname);

    if (!isValidMimeType && !isValidExtension) {
      throw new BadRequestException(
        `Invalid file type. Expected Excel (.xlsx, .xls) or CSV (.csv) file. Received: ${file.mimetype}`,
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

  @ProductEndpoint.UpdateVariantQuantity(UpdateVariantQuantityDto)
  @Patch('variant-quantity/:pluUpc')
  async updateVariantQuantity(
    @Req() req,
    @Param('pluUpc') pluUpc: string,
    @Body() updateVariantQuantityDto: UpdateVariantQuantityDto,
  ) {
    const user = req.user;
    return this.handleProductOperation(
      () =>
        this.productService.updateVariantQuantity(
          user,
          pluUpc,
          updateVariantQuantityDto.quantity,
        ),
      'Variant quantity updated successfully',
    );
  }
}
