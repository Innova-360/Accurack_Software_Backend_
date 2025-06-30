import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ResponseService, BaseAuthController } from '../common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';

@ApiTags('product-category')
@Controller('product-category')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoryController extends BaseAuthController {
  constructor(
    private readonly categoryService: CategoryService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  @Get('search')
  async searchCategories(@Query('q') q: string) {
    return this.handleServiceOperation(
      () => this.categoryService.searchCategories(q),
      'Categories search results',
    );
  }

  @Post()
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.handleServiceOperation(
      () => this.categoryService.createCategory(dto),
      'Category created successfully',
      201,
    );
  }

  @Get()
  async getAllCategories() {
    return this.handleServiceOperation(
      () => this.categoryService.getAllCategories(),
      'Categories retrieved successfully',
    );
  }

  @Get(':id')
  async getCategoryById(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.categoryService.getCategoryById(id),
      'Category retrieved successfully',
    );
  }

  @Put(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.handleServiceOperation(
      () => this.categoryService.updateCategory(id, dto),
      'Category updated successfully',
    );
  }

  @Delete(':id')
  async deleteCategory(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.categoryService.deleteCategory(id),
      'Category deleted successfully',
    );
  }

  @Get(':id/products')
  async getProductsByCategory(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.categoryService.getProductsByCategory(id),
      'Products for category retrieved successfully',
    );
  }
}
