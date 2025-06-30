import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { FuzzyMatcher } from '../utils/fuzzy-matcher';

@Injectable()
export class CategoryService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async searchCategories(query: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    if (!query || query.trim() === '') {
      return [];
    }
    return prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    // Check for duplicate name or code

    const existing = await prisma.category.findFirst({
      where: { OR: [{ name: dto.name, code: dto.code }] },
    });

    if (existing)
      throw new BadRequestException(
        'Category with this name or code already exists',
      );
    return prisma.category.create({ data: dto });
  }

  async getAllCategories() {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.category.findMany();
  }

  async getCategoryById(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const found = await prisma.category.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Category not found');
    return found;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.category.update({ where: { id }, data: dto });
  }

  async deleteCategory(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.category.delete({ where: { id } });
  }

  async getProductsByCategory(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const category = await prisma.category.findUnique({
      where: { id },
      include: { products: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category.products;
  }

  async findSimilarCategories(categoryName: string, threshold: number = 0.3) {
    const prisma = await this.tenantContext.getPrismaClient();
    const categories = await prisma.category.findMany({
      select: { name: true },
    });

    const categoryNames = categories.map((c) => c.name);
    const fuzzyMatcher = new FuzzyMatcher(categoryNames, threshold);
    return fuzzyMatcher.search(categoryName);
  }

  async findOrCreateCategory(
    categoryName: string,
  ): Promise<{ id: string; name: string }> {
    const prisma = await this.tenantContext.getPrismaClient();

    // Try exact match first
    let category = await prisma.category.findFirst({
      where: { name: { equals: categoryName, mode: 'insensitive' } },
    });

    if (category) {
      return { id: category.id, name: category.name };
    }

    // Check for fuzzy matches
    const similarCategories = await this.findSimilarCategories(
      categoryName,
      0.7,
    );
    if (similarCategories.length > 0) {
      // Found similar category - throw error with suggestions
      const suggestions = similarCategories.map((s) => s.item);
      throw new BadRequestException(
        `Category '${categoryName}' not found. Did you mean: ${suggestions.join(', ')}? Please correct the file and re-upload.`,
      );
    }

    // No match found - create new category
    category = await prisma.category.create({
      data: { name: categoryName },
    });

    return { id: category.id, name: category.name };
  }
}
