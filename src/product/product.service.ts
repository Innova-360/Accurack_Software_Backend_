import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  AssignSupplierDto,
} from './dto/product.dto';
import { UpdateProductQuantityDto } from './dto/update-product-quantity.dto';
import {
  parseExcel,
  ValidationResult,
  ProductExcelRow,
} from '../utils/productsFileParser';
import * as crypto from 'crypto';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CategoryService } from './category.service';
import { chunk } from 'lodash';
import { SupplierState } from '@prisma/client';

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  size: number;
}

interface FileUpload {
  id: string;
  fileHash: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  uploadedAt: Date;
}

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaClientService, // Keep for fallback/master DB operations
    private readonly tenantContext: TenantContextService, // Add tenant context
    private readonly categoryService: CategoryService, // Add category service
  ) { }

  private validateProductOperationPermissions(
    user: any,
    operation: 'create' | 'update' | 'delete',
    storeId?: string,
  ): void {
    if (!user) {
      throw new BadRequestException('User not authenticated');
    }

    // Super admin has universal access - bypass all permission checks
    if (user.role === 'super_admin') {
      return;
    }

    // For non-super_admin users, validate store access if storeId is provided
    if (storeId) {
      const hasStoreAccess = user.stores?.some(
        (store: any) => store.storeId === storeId,
      );
      if (!hasStoreAccess && user.storeId !== storeId) {
        throw new BadRequestException('No access to this store');
      }
    }

    const allowedRoles = {
      create: ['super_admin', 'admin', 'manager'],
      update: ['super_admin', 'admin', 'manager'],
      delete: ['super_admin', 'admin'],
    };

    if (!allowedRoles[operation].includes(user.role)) {
      throw new BadRequestException(
        `Only ${allowedRoles[operation].join(', ')} can ${operation} products`,
      );
    }
  }

  private validateProductAccess(user: any, storeId?: string): void {
    if (!user) {
      throw new BadRequestException('User not authenticated');
    }

    if (user.role === 'super_admin') {
      return;
    } else {
      const hasStoreAccess = user.stores?.some(
        (store: any) => store.storeId === storeId,
      );
      if (!hasStoreAccess && user.storeId !== storeId) {
        throw new BadRequestException('No access to this store');
      }
    }
  }

  private async validatePluUniqueness(
    checkPluExists: (plu: string) => Promise<boolean>,
    plu: string,
  ): Promise<void> {
    const exists = await checkPluExists(plu);
    if (exists) {
      throw new BadRequestException('PLU/UPC already exists');
    }
  }

  private async validateVariantPluUniqueness(
    variants: any[],
    productId?: string,
  ): Promise<void> {
    const prisma = await this.tenantContext.getPrismaClient();
    // Collect all PLU/UPC values from variants
    const variantPlus = variants
      .map((v) => v.pluUpc)
      .filter((plu) => plu && plu.trim()); // Only check non-empty PLUs

    if (variantPlus.length === 0) return; // No PLUs to validate

    // Check for duplicates within the variants array
    const duplicatePlus = variantPlus.filter(
      (plu, index) => variantPlus.indexOf(plu) !== index,
    );
    if (duplicatePlus.length > 0) {
      throw new BadRequestException(
        `Duplicate PLU/UPC found in variants: ${duplicatePlus.join(', ')}`,
      );
    }

    // Check against existing products in database (global uniqueness)
    for (const plu of variantPlus) {
      const whereCondition: any = { pluUpc: plu };
      if (productId) {
        whereCondition.NOT = { id: productId };
      }

      const existing = await prisma.products.findFirst({
        where: whereCondition,
      });

      if (existing) {
        throw new BadRequestException(
          `PLU/UPC '${plu}' already exists in database`,
        );
      }
    }
  }

  private formatProductResponse(product: any): ProductResponseDto {
    // Calculate profit from primary supplier or first supplier
    // Use ProductSupplier relationship to get cost price
    let costPrice = 0;
    if (product.productSuppliers && product.productSuppliers.length > 0) {
      // Find primary supplier first, then fall back to first supplier
      const primarySupplier = product.productSuppliers.find(
        (ps: any) => ps.state === 'primary',
      );
      const supplierToUse = primarySupplier || product.productSuppliers[0];
      costPrice = supplierToUse.costPrice || 0;
    }

    const profitAmount = product.singleItemSellingPrice - costPrice;
    const profitMargin = costPrice > 0 ? (profitAmount / costPrice) * 100 : 0;

    return {
      id: product.id,
      name: product.name,
      categoryId: product.categoryId,
      ean: product.ean,
      pluUpc: product.pluUpc,
      sku: product.sku,
      singleItemCostPrice: costPrice,
      itemQuantity: product.itemQuantity,
      msrpPrice: product.msrpPrice,
      singleItemSellingPrice: product.singleItemSellingPrice,
      discountAmount: product.discountAmount,
      percentDiscount: product.percentDiscount,
      clientId: product.clientId,
      storeId: product.storeId,
      hasVariants: product.hasVariants,
      store: product.store,
      sales: product.sales,
      purchaseOrders: product.purchaseOrders,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      profitAmount: parseFloat(profitAmount.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(2)),
      category: product.category || [],
      productSuppliers: product.productSuppliers || [],
      packIds: product.packIds,
      packs: product.packs || [],
      variants: product.variants || [],
    };
  }

  async createProduct(
    user: any,
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    this.validateProductOperationPermissions(
      user,
      'create',
      createProductDto.storeId,
    );

    //console.log('createproductdto', createProductDto);

    const prisma = await this.tenantContext.getPrismaClient();

    // Validate clientId and storeId
    if (!createProductDto.clientId || !createProductDto.storeId) {
      throw new BadRequestException('clientId and storeId are required');
    }

    // Validate that client exists
    const client = await prisma.clients.findUnique({
      where: { id: createProductDto.clientId },
    });
    if (!client) {
      throw new BadRequestException('Invalid clientId - client does not exist');
    }

    // Validate that store exists and belongs to the client
    const store = await prisma.stores.findUnique({
      where: { id: createProductDto.storeId },
    });
    if (!store) {
      throw new BadRequestException('Invalid storeId - store does not exist');
    }
    if (store.clientId !== createProductDto.clientId) {
      throw new BadRequestException(
        'Store does not belong to the specified client',
      );
    }

    const existingCategory = await prisma.category.findFirst({
      where: { id: createProductDto.categoryId },
    });
    if (!existingCategory) {
      throw new BadRequestException(
        'Invalid categoryId - category does not exist',
      );
    }

    // Validate that variants are empty if hasVariants is false
    if (
      !createProductDto.hasVariants &&
      createProductDto.variants &&
      createProductDto.variants.length > 0
    ) {
      throw new BadRequestException(
        'Variants must be empty when hasVariants is false',
      );
    }

    // Validate that packs are not provided at product level if hasVariants is true
    if (
      createProductDto.hasVariants &&
      createProductDto.packs &&
      createProductDto.packs?.length > 0
    ) {
      throw new BadRequestException(
        'Packs cannot be provided at product level when hasVariants is true',
      );
    }

    // Validate PLU/UPC logic based on hasVariants
    if (createProductDto.hasVariants) {
      if (createProductDto.pluUpc) {
        throw new BadRequestException(
          'PLU/UPC must be empty for products with variants. Each variant should have its own PLU/UPC.',
        );
      }
      if (
        !createProductDto.variants ||
        createProductDto.variants.length === 0
      ) {
        throw new BadRequestException(
          'At least one variant must be provided when hasVariants is true',
        );
      }
    }

    // Validate ProductSupplier relationships (optional)
    if (
      createProductDto.productSuppliers &&
      createProductDto.productSuppliers.length > 0
    ) {
      const primarySuppliers = createProductDto.productSuppliers.filter(
        (ps) => ps.state === 'primary',
      );
      if (primarySuppliers.length === 0) {
        throw new BadRequestException(
          'At least one supplier must be marked as primary',
        );
      }
      if (primarySuppliers.length > 1) {
        throw new BadRequestException(
          'Only one supplier can be marked as primary',
        );
      }
    }

    // Create the product
    let product: any;
    try {
      const createData: any = {
        name: createProductDto.name,
        ean: createProductDto.ean || null,
        sku: createProductDto.sku || null,
        itemQuantity: createProductDto.itemQuantity,
        msrpPrice: createProductDto.msrpPrice,
        singleItemSellingPrice: createProductDto.singleItemSellingPrice,
        discountAmount: createProductDto.discountAmount,
        percentDiscount: createProductDto.percentDiscount,
        clientId: createProductDto.clientId,
        storeId: createProductDto.storeId,
        hasVariants: createProductDto.hasVariants || false,
        packIds: [],
        variants: [],
        // Use categoryId directly
        ...(createProductDto.categoryId && {
          categoryId: createProductDto.categoryId,
        }),
      };

      if (!createProductDto.hasVariants && createProductDto.pluUpc) {
        createData.pluUpc = createProductDto.pluUpc;
      }

      product = await prisma.products.create({
        data: createData,
        include: {
          packs: true,
          category: true,
          productSuppliers: {
            include: {
              supplier: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          saleItems: true,
          purchaseOrders: true,
        },
      });
    } catch (error: any) {
      console.log('Error creating product:', error);
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Invalid clientId or storeId - referenced record does not exist',
        );
      }
      throw error;
    }

    // Handle supplier relationships
    const assignedSuppliers = new Set<string>();

    if (
      createProductDto.productSuppliers &&
      createProductDto.productSuppliers.length > 0
    ) {
      const supplierIds = createProductDto.productSuppliers.map(
        (ps) => ps.supplierId,
      );
      const existingSuppliers = await prisma.suppliers.findMany({
        where: {
          id: { in: supplierIds },
          storeId: createProductDto.storeId,
        },
      });

      if (existingSuppliers.length !== supplierIds.length) {
        const missingSupplierIds = supplierIds.filter(
          (id) => !existingSuppliers.some((supplier) => supplier.id === id),
        );
        throw new BadRequestException(
          `Invalid supplier IDs: ${missingSupplierIds.join(', ')} - suppliers do not exist or do not belong to this store`,
        );
      }

      await Promise.all(
        createProductDto.productSuppliers.map((supplierData) => {
          assignedSuppliers.add(supplierData.supplierId);
          return prisma.productSupplier.create({
            data: {
              productId: product.id,
              supplierId: supplierData.supplierId,
              costPrice: supplierData.costPrice,
              categoryId: createProductDto.categoryId,
              state: supplierData.state,
            },
          });
        }),
      );
    } else if (createProductDto.supplierId && !createProductDto.hasVariants) {
      // Only create productSupplier for non-variant products if supplierId is provided
      const supplierData = await prisma.suppliers.findFirst({
        where: {
          id: createProductDto.supplierId,
          storeId: createProductDto.storeId,
        },
      });

      if (!supplierData) {
        throw new BadRequestException(
          `Invalid supplierId: ${createProductDto.supplierId} - supplier does not exist or does not belong to this store`,
        );
      }

      assignedSuppliers.add(createProductDto.supplierId);
      await prisma.productSupplier.create({
        data: {
          productId: product.id,
          supplierId: createProductDto.supplierId,
          costPrice: Number(createProductDto.singleItemCostPrice) || 0,
          categoryId: createProductDto.categoryId,
          state: SupplierState.primary,
        },
      });
    }

    let packIds: string[] = [];
    let variantsWithPacks: any[] = [];

    // Handle pack and variant creation
    if (createProductDto.hasVariants && createProductDto.variants) {
      variantsWithPacks = await Promise.all(
        createProductDto.variants.map(async (variant) => {
          let variantPackIds: string[] = [];
          if (variant.packs && variant.packs.length > 0) {
            const createdPacks = await Promise.all(
              variant.packs.map((pack) =>
                prisma.pack.create({
                  data: {
                    productId: product.id,
                    minimumSellingQuantity: pack.minimumSellingQuantity,
                    totalPacksQuantity: pack.totalPacksQuantity,
                    orderedPacksPrice: pack.orderedPacksPrice,
                    discountAmount: Number(pack.discountAmount) || 0,
                    percentDiscount: Number(pack.percentDiscount) || 0,
                  },
                  select: { id: true },
                }),
              ),
            );
            variantPackIds = createdPacks.map((pack) => pack.id);
          }

          // Validate variant supplierId if provided
          let validatedSupplierId: string | null = null;
          if (variant.supplierId) {
            const supplierData = await prisma.suppliers.findFirst({
              where: {
                id: variant.supplierId,
                storeId: createProductDto.storeId,
              },
            });
            if (!supplierData) {
              throw new BadRequestException(
                `Invalid supplierId: ${variant.supplierId} for variant ${variant.name} - supplier does not exist or does not belong to this store`,
              );
            }
            validatedSupplierId = variant.supplierId;

            // Handle ProductSupplier creation/update for variant suppliers
            if (assignedSuppliers.has(variant.supplierId)) {
              // Supplier already exists for this product, update the cost price if needed
              // We'll use the variant's price as the cost price for this supplier relationship
              await prisma.productSupplier.updateMany({
                where: {
                  productId: product.id,
                  supplierId: variant.supplierId,
                },
                data: {
                  costPrice: Number(variant.price) || 0,
                  // Keep existing state and categoryId
                },
              });
            } else {
              // New supplier for this product, create new ProductSupplier record
              await prisma.productSupplier.create({
                data: {
                  productId: product.id,
                  supplierId: variant.supplierId,
                  costPrice: Number(variant.price) || 0,
                  categoryId: createProductDto.categoryId,
                  state: SupplierState.secondary, // Variant suppliers default to secondary
                },
              });
              // Mark this supplier as assigned
              assignedSuppliers.add(variant.supplierId);
            }
          }

          return {
            name: variant.name,
            price: variant.price,
            pluUpc: variant.pluUpc,
            packIds: variantPackIds,
            quantity: variant.quantity || 0,
            msrpPrice: variant.msrpPrice || 0,
            supplierId: validatedSupplierId,
            discountAmount: Number(variant.discountAmount) || 0,
            percentDiscount: Number(variant.percentDiscount) || 0,
          };
        }),
      );

      await prisma.products.update({
        where: { id: product.id },
        data: {
          variants: variantsWithPacks,
        },
      });
    } else if (createProductDto.packs && createProductDto.packs.length > 0) {
      const createdPacks = await Promise.all(
        createProductDto.packs.map((pack) =>
          prisma.pack.create({
            data: {
              productId: product.id,
              minimumSellingQuantity: pack.minimumSellingQuantity,
              totalPacksQuantity: pack.totalPacksQuantity,
              orderedPacksPrice: pack.orderedPacksPrice,
              discountAmount: Number(pack.discountAmount) || 0,
              percentDiscount: Number(pack.percentDiscount) || 0,
            },
            select: { id: true },
          }),
        ),
      );
      packIds = createdPacks.map((pack) => pack.id);

      await prisma.products.update({
        where: { id: product.id },
        data: {
          packIds,
        },
      });
    }

    const updatedProduct = await prisma.products.findUnique({
      where: { id: product.id },
      include: {
        packs: true,
        category: true,
        productSuppliers: {
          include: {
            supplier: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        saleItems: true,
        purchaseOrders: true,
      },
    });

    if (!updatedProduct) {
      throw new BadRequestException('Failed to create product');
    }

    return this.formatProductResponse(updatedProduct);
  }

  async getProducts(
    user: any,
    storeId: string,
    page: number = 1,
    limit: number = 15000,
    sortBy:
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
      | 'minimumSellingQuantity' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    categoryId?: string,
  ) {
    this.validateProductAccess(user, storeId);
    console.log('user', user);

    // Get the tenant-specific Prisma client
    const prisma = await this.tenantContext.getPrismaClient();

    const skip = (Number(page) - 1) * Number(limit);

    if (!storeId) {
      throw new BadRequestException('No store specified');
    }

    if (
      storeId &&
      !user.stores?.some((store: any) => store.storeId === storeId) &&
      user.role !== 'super_admin'
    ) {
      throw new BadRequestException('No access to this store');
    }

    // Validate sortBy parameter to prevent injection attacks
    const allowedSortFields = [
      'name',
      'createdAt',
      'updatedAt',
      'singleItemSellingPrice',
      'msrpPrice',
      'itemQuantity',
      'sku',
      'pluUpc',
      'ean',
      'discountAmount',
      'percentDiscount',
      'category',
      'supplier',
      'minimumSellingQuantity',
    ];
    if (!allowedSortFields.includes(sortBy)) {
      throw new BadRequestException(
        `Invalid sortBy field. Allowed values: ${allowedSortFields.join(', ')}`,
      );
    }

    // Validate sortOrder parameter
    if (!['asc', 'desc'].includes(sortOrder)) {
      throw new BadRequestException(
        'Invalid sortOrder. Allowed values: asc, desc',
      );
    }

    // Create dynamic orderBy based on sortBy field
    let orderBy: any;
    let needsSupplierSort = false;
    let needsMinimumSellingQuantitySort = false;

    if (sortBy === 'category') {
      orderBy = [{ category: { name: sortOrder } }, { createdAt: 'desc' }];
    } else if (sortBy === 'supplier') {
      // For supplier sorting, we need to sort after query since products can have multiple suppliers
      orderBy = [{ createdAt: 'desc' }]; // Use default ordering for DB query
      needsSupplierSort = true;
    } else if (sortBy === 'minimumSellingQuantity') {
      // For minimumSellingQuantity sorting, we need to sort after query since products can have multiple packs
      orderBy = [{ createdAt: 'desc' }]; // Use default ordering for DB query
      needsMinimumSellingQuantitySort = true;
    } else {
      orderBy = [{ [sortBy]: sortOrder }, { createdAt: 'desc' }];
    }

    let where: any = {};

    if (user.role !== 'super_admin') {
      if (storeId) {
        where.storeId = storeId;
      } else if (user.storeId) {
        where.storeId = user.storeId;
      }
      where.clientId = user.clientId;
    } else if (storeId) {
      where.storeId = storeId;
    }

    // --- CATEGORY FILTERING ---
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Get total count first
    const total = await prisma.products.count({ where });

    // If limit is large (>1000), use batching to prevent connection pool exhaustion
    if (limit > 500) {
      console.log(
        `Large query detected (limit: ${limit}), using batching approach`,
      );

      const batchSize = 100; // Process 500 products at a time
      const allProducts: any[] = [];
      let currentSkip = skip;
      let remainingLimit = limit;

      while (remainingLimit > 0 && allProducts.length < limit) {
        const currentBatchSize = Math.min(batchSize, remainingLimit);

        console.log(
          `Fetching batch: skip=${currentSkip}, take=${currentBatchSize}`,
        );

        const batch = await prisma.products.findMany({
          where,
          include: {
            packs: true,
            category: true,
            productSuppliers: {
              include: {
                supplier: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
              },
            },
            saleItems: true,
            purchaseOrders: true,
          },
          skip: currentSkip,
          take: currentBatchSize,
          orderBy: orderBy,
        });

        allProducts.push(...batch);
        currentSkip += currentBatchSize;
        remainingLimit -= currentBatchSize;

        // Small delay between batches to prevent overwhelming the database
        if (remainingLimit > 0 && batch.length === currentBatchSize) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Break if no more products
        if (batch.length < currentBatchSize) {
          break;
        }
      }

      // Apply supplier sorting if needed
      let finalProducts = allProducts;
      if (needsSupplierSort) {
        finalProducts = this.sortProductsBySupplier(allProducts, sortOrder);
      }
      if (needsMinimumSellingQuantitySort) {
        finalProducts = this.sortProductsByMinimumSellingQuantity(
          finalProducts,
          sortOrder,
        );
      }

      return {
        products: finalProducts.map((product) =>
          this.formatProductResponse(product),
        ),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // For smaller queries, use the original approach
    const products = await prisma.products.findMany({
      where,
      include: {
        packs: true,
        category: true,
        productSuppliers: {
          include: {
            supplier: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        saleItems: true,
        purchaseOrders: true,
      },
      skip,
      take: Number(limit),
      orderBy: orderBy,
    });

    // Apply supplier sorting if needed
    let finalProducts = products;
    if (needsSupplierSort) {
      finalProducts = this.sortProductsBySupplier(products, sortOrder);
    }
    if (needsMinimumSellingQuantitySort) {
      finalProducts = this.sortProductsByMinimumSellingQuantity(
        finalProducts,
        sortOrder,
      );
    }

    return {
      products: finalProducts.map((product) =>
        this.formatProductResponse(product),
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  private sortProductsBySupplier(
    products: any[],
    sortOrder: 'asc' | 'desc',
  ): any[] {
    return products.sort((a, b) => {
      // Get primary supplier name for product a
      const primarySupplierA = a.productSuppliers?.find(
        (ps: any) => ps.state === 'primary',
      );
      const supplierNameA = primarySupplierA?.supplier?.name || '';

      // Get primary supplier name for product b
      const primarySupplierB = b.productSuppliers?.find(
        (ps: any) => ps.state === 'primary',
      );
      const supplierNameB = primarySupplierB?.supplier?.name || '';

      // Compare supplier names
      if (sortOrder === 'asc') {
        return supplierNameA.localeCompare(supplierNameB);
      } else {
        return supplierNameB.localeCompare(supplierNameA);
      }
    });
  }

  private sortProductsByMinimumSellingQuantity(
    products: any[],
    sortOrder: 'asc' | 'desc',
  ): any[] {
    return products.sort((a, b) => {
      // Get the first pack's minimumSellingQuantity for product a (if exists)
      const minimumSellingQuantityA = a.packs?.[0]?.minimumSellingQuantity || 0;

      // Get the first pack's minimumSellingQuantity for product b (if exists)
      const minimumSellingQuantityB = b.packs?.[0]?.minimumSellingQuantity || 0;

      // Compare minimumSellingQuantity values
      if (sortOrder === 'asc') {
        return minimumSellingQuantityA - minimumSellingQuantityB;
      } else {
        return minimumSellingQuantityB - minimumSellingQuantityA;
      }
    });
  }

  async getProductById(user: any, id: string): Promise<ProductResponseDto> {
    this.validateProductAccess(user);

    // Get the tenant-specific Prisma client
    const prisma = await this.tenantContext.getPrismaClient();

    const product = await prisma.products.findUnique({
      where: { id },
      include: {
        packs: true,
        category: true,
        productSuppliers: {
          include: {
            supplier: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        saleItems: true,
        purchaseOrders: true,
      },
    });

    console.log('product', product);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.formatProductResponse(product);
  }

  async updateProduct(
    user: any,
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    this.validateProductOperationPermissions(
      user,
      'update',
      updateProductDto.storeId,
    );

    // Get the tenant-specific Prisma client
    const prisma = await this.tenantContext.getPrismaClient();

    try {
      const product = await prisma.products.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Validate PLU/UPC uniqueness based on hasVariants
      if (
        updateProductDto.hasVariants === false &&
        updateProductDto.pluUpc &&
        updateProductDto.pluUpc !== product.pluUpc
      ) {
        await this.validatePluUniqueness(async (plu: string) => {
          const existing = await prisma.products.findFirst({
            where: {
              pluUpc: plu,
              NOT: { id },
            },
          });
          return !!existing;
        }, updateProductDto.pluUpc);
      }

      // Validate PLU uniqueness for variants (if product has variants)
      if (updateProductDto.hasVariants && updateProductDto.variants) {
        await this.validateVariantPluUniqueness(updateProductDto.variants, id);
      }

      // Validate clientId and storeId if being updated
      if (updateProductDto.clientId) {
        const client = await prisma.clients.findUnique({
          where: { id: updateProductDto.clientId },
        });
        if (!client) {
          throw new BadRequestException(
            'Invalid clientId - client does not exist',
          );
        }
      }

      if (updateProductDto.storeId) {
        const store = await prisma.stores.findUnique({
          where: { id: updateProductDto.storeId },
        });
        if (!store) {
          throw new BadRequestException(
            'Invalid storeId - store does not exist',
          );
        }
        if (
          updateProductDto.clientId &&
          store.clientId !== updateProductDto.clientId
        ) {
          throw new BadRequestException(
            'Store does not belong to the specified client',
          );
        }
      }

      let packIds: string[] = [];
      let variantsWithPacks: any[] = [];

      // Validate pack and variant constraints
      if (
        updateProductDto.hasVariants === true &&
        updateProductDto.packs &&
        updateProductDto.packs?.length > 0
      ) {
        throw new BadRequestException(
          'Packs cannot be provided at product level when hasVariants is true',
        );
      }
      if (
        updateProductDto.hasVariants === false &&
        updateProductDto.variants &&
        updateProductDto.variants?.length > 0
      ) {
        throw new BadRequestException(
          'Variants must be empty when hasVariants is false',
        );
      }

      // Validate PLU/UPC logic based on hasVariants
      if (updateProductDto.hasVariants === true) {
        // For variant products, PLU/UPC should be empty at product level
        if (updateProductDto.pluUpc) {
          throw new BadRequestException(
            'PLU/UPC must be empty for products with variants. Each variant should have its own PLU/UPC.',
          );
        }
        // Ensure variants exist if hasVariants is true
        if (
          !updateProductDto.variants ||
          updateProductDto.variants.length === 0
        ) {
          throw new BadRequestException(
            'At least one variant must be provided when hasVariants is true',
          );
        }
      }

      // Validate ProductSupplier relationships (optional - products can exist without suppliers)
      if (
        updateProductDto.productSuppliers &&
        updateProductDto.productSuppliers.length > 0
      ) {
        // Validate that suppliers exist
        for (const ps of updateProductDto.productSuppliers) {
          const supplier = await prisma.suppliers.findUnique({
            where: { id: ps.supplierId },
          });
          if (!supplier) {
            throw new BadRequestException(
              `Supplier with ID '${ps.supplierId}' does not exist`,
            );
          }
        }

        // Validate that at least one supplier is marked as primary
        const primarySuppliers = updateProductDto.productSuppliers.filter(
          (ps) => ps.state === 'primary',
        );
        if (primarySuppliers.length === 0) {
          throw new BadRequestException(
            'At least one supplier must be marked as primary',
          );
        }
        if (primarySuppliers.length > 1) {
          throw new BadRequestException(
            'Only one supplier can be marked as primary',
          );
        }
      }

      // Delete existing packs to avoid duplicates
      await prisma.pack.deleteMany({ where: { productId: id } });

      // Handle pack updates based on hasVariants
      if (updateProductDto.hasVariants && updateProductDto.variants) {
        variantsWithPacks = await Promise.all(
          updateProductDto.variants.map(async (variant) => {
            let variantPackIds: string[] = [];
            if (variant.packs && variant.packs.length > 0) {
              const createdPacks = await Promise.all(
                variant.packs.map((pack) =>
                  prisma.pack.create({
                    data: {
                      productId: id,
                      minimumSellingQuantity: pack.minimumSellingQuantity,
                      totalPacksQuantity: pack.totalPacksQuantity,
                      orderedPacksPrice: pack.orderedPacksPrice,
                      discountAmount: Number(pack.discountAmount),
                      percentDiscount: Number(pack.percentDiscount),
                    },
                    select: { id: true },
                  }),
                ),
              );
              variantPackIds = createdPacks.map((pack) => pack.id);
            }
            return {
              name: variant.name,
              price: variant.price,
              pluUpc: variant.pluUpc,
              packIds: variantPackIds,
            };
          }),
        );
      } else if (updateProductDto.packs && updateProductDto.packs.length > 0) {
        const createdPacks = await Promise.all(
          updateProductDto.packs.map((pack) =>
            prisma.pack.create({
              data: {
                productId: id,
                minimumSellingQuantity: pack.minimumSellingQuantity,
                totalPacksQuantity: pack.totalPacksQuantity,
                orderedPacksPrice: pack.orderedPacksPrice,
                discountAmount: Number(pack.discountAmount),
                percentDiscount: Number(pack.percentDiscount),
              },
              select: { id: true },
            }),
          ),
        );
        packIds = createdPacks.map((pack) => pack.id);
      }

      // Prepare update data with proper Prisma relation syntax
      const updateData: any = {};

      if (updateProductDto.name !== undefined)
        updateData.name = updateProductDto.name;
      if (updateProductDto.categoryId !== undefined) {
        updateData.category = {
          connect: { id: updateProductDto.categoryId },
        };
      }
      if (updateProductDto.ean !== undefined)
        updateData.ean = updateProductDto.ean;
      if (updateProductDto.sku !== undefined)
        updateData.sku = updateProductDto.sku;
      if (updateProductDto.itemQuantity !== undefined)
        updateData.itemQuantity = updateProductDto.itemQuantity;
      if (updateProductDto.msrpPrice !== undefined)
        updateData.msrpPrice = updateProductDto.msrpPrice;
      if (updateProductDto.singleItemSellingPrice !== undefined)
        updateData.singleItemSellingPrice =
          updateProductDto.singleItemSellingPrice;
      if (updateProductDto.discountAmount !== undefined)
        updateData.discountAmount = updateProductDto.discountAmount;
      if (updateProductDto.percentDiscount !== undefined)
        updateData.percentDiscount = updateProductDto.percentDiscount;

      // Use proper Prisma relation syntax for client and store
      if (updateProductDto.clientId !== undefined) {
        updateData.client = {
          connect: { id: updateProductDto.clientId },
        };
      }
      if (updateProductDto.storeId !== undefined) {
        updateData.store = {
          connect: { id: updateProductDto.storeId },
        };
      }

      if (updateProductDto.hasVariants !== undefined)
        updateData.hasVariants = updateProductDto.hasVariants;

      // Handle pluUpc based on hasVariants logic
      if (updateProductDto.hasVariants === true) {
        // Clear pluUpc for variant products
        updateData.pluUpc = null;
      } else if (
        updateProductDto.hasVariants === false &&
        updateProductDto.pluUpc !== undefined
      ) {
        // Set pluUpc for non-variant products
        updateData.pluUpc = updateProductDto.pluUpc;
      }

      // Set packIds and variants
      updateData.packIds = updateProductDto.hasVariants ? [] : packIds;
      updateData.variants = updateProductDto.hasVariants
        ? variantsWithPacks
        : [];

      const updatedProduct = await prisma.products.update({
        where: { id },
        data: updateData,
        include: {
          packs: true,
          productSuppliers: {
            include: {
              supplier: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          saleItems: true,
          purchaseOrders: true,
        },
      });

      // Update ProductSupplier relationships if provided
      if (updateProductDto.productSuppliers) {
        // Delete existing ProductSupplier relationships
        await prisma.productSupplier.deleteMany({
          where: { productId: id },
        });

        // Create new ProductSupplier relationships
        if (updateProductDto.productSuppliers.length > 0) {
          await prisma.productSupplier.createMany({
            data: updateProductDto.productSuppliers.map((ps) => ({
              productId: id,
              supplierId: ps.supplierId,
              costPrice: ps.costPrice,
              categoryId: updateProductDto.categoryId,
              state: ps.state,
            })),
          });
        }

        // Fetch the updated product with new supplier relationships
        const finalProduct = await prisma.products.findUnique({
          where: { id },
          include: {
            packs: true,
            productSuppliers: {
              include: {
                supplier: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
              },
            },
            saleItems: true,
            purchaseOrders: true,
          },
        });

        return this.formatProductResponse(finalProduct);
      }

      return this.formatProductResponse(updatedProduct);
    } catch (error) {
      // Enhanced error handling with detailed logging
      console.error('Product update error:', {
        productId: id,
        userId: user.id,
        error: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
      });

      // Handle specific Prisma errors
      if (error.code) {
        switch (error.code) {
          case 'P2002':
            // Unique constraint violation
            const field = error.meta?.target?.[0] || 'field';
            throw new BadRequestException(
              `Product with this ${field} already exists in this store`,
            );

          case 'P2003':
            // Foreign key constraint violation
            if (error.meta?.field_name === 'clientId') {
              throw new BadRequestException(
                'Invalid client ID - client does not exist',
              );
            }
            if (error.meta?.field_name === 'storeId') {
              throw new BadRequestException(
                'Invalid store ID - store does not exist',
              );
            }
            if (error.meta?.field_name === 'categoryId') {
              throw new BadRequestException(
                'Invalid category ID - category does not exist',
              );
            }
            throw new BadRequestException(
              'Invalid reference - related record not found',
            );

          case 'P2025':
            // Record not found
            throw new NotFoundException('Product not found');

          case 'P2014':
            // Invalid ID provided
            throw new BadRequestException('Invalid product ID format');

          case 'P2011':
            // Null constraint violation
            const nullField = error.meta?.field_name || 'field';
            throw new BadRequestException(
              `Required field '${nullField}' cannot be null`,
            );

          case 'P2012':
            // Missing required value
            const missingField = error.meta?.field_name || 'field';
            throw new BadRequestException(
              `Required field '${missingField}' is missing`,
            );

          case 'P2013':
            // Missing required argument
            const missingArg = error.meta?.argument_name || 'argument';
            throw new BadRequestException(
              `Required argument '${missingArg}' is missing`,
            );

          case 'P2015':
            // Related record not found
            throw new BadRequestException(
              'Related record not found - please check your references',
            );

          case 'P2016':
            // Query interpretation error
            throw new BadRequestException(
              'Invalid query structure - please check your request format',
            );

          case 'P2017':
            // Relation violation
            throw new BadRequestException(
              'Relation constraint violation - please check related records',
            );

          case 'P2018':
            // Connected records not found
            throw new BadRequestException(
              'Connected records not found - please check your references',
            );

          case 'P2019':
            // Input error
            throw new BadRequestException(
              'Invalid input data - please check your request format',
            );

          case 'P2020':
            // Value out of range
            throw new BadRequestException(
              'Value out of valid range - please check your input values',
            );

          case 'P2021':
            // Table does not exist
            throw new InternalServerErrorException(
              'Database table not found - please contact support',
            );

          case 'P2022':
            // Column does not exist
            throw new InternalServerErrorException(
              'Database column not found - please contact support',
            );

          case 'P2023':
            // Column data type mismatch
            throw new BadRequestException(
              'Data type mismatch - please check your input values',
            );

          case 'P2024':
            // Connection error
            throw new InternalServerErrorException(
              'Database connection error - please try again later',
            );

          case 'P2026':
            // Current database provider doesn't support a feature
            throw new InternalServerErrorException(
              'Database feature not supported - please contact support',
            );

          case 'P2027':
            // Multiple errors occurred
            throw new BadRequestException(
              'Multiple validation errors occurred - please check all fields',
            );

          case 'P2030':
            // Fulltext index not found
            throw new BadRequestException(
              'Search index not found - please contact support',
            );

          case 'P2031':
            // MongoDB requires a $ sign
            throw new BadRequestException('Invalid MongoDB query format');

          case 'P2033':
            // Number overflow
            throw new BadRequestException(
              'Number overflow - value is too large',
            );

          case 'P2034':
            // Transaction failed
            throw new InternalServerErrorException(
              'Transaction failed - please try again',
            );

          case 'P2037':
            // Too many database connections
            throw new InternalServerErrorException(
              'Database connection limit reached - please try again later',
            );

          default:
            // Unknown Prisma error
            throw new InternalServerErrorException(
              `Database operation failed: ${error.message}`,
            );
        }
      }

      // Handle NestJS exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // Handle validation errors
      if (error.name === 'ValidationError') {
        throw new BadRequestException(`Validation error: ${error.message}`);
      }

      // Handle connection errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new InternalServerErrorException(
          'Database connection failed - please try again later',
        );
      }

      // Handle timeout errors
      if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
        throw new InternalServerErrorException(
          'Operation timed out - please try again',
        );
      }

      // Generic error handling
      console.error('Unhandled product update error:', error);
      throw new InternalServerErrorException(
        'An unexpected error occurred while updating the product. Please try again or contact support.',
      );
    }
  }

  async updateQuantity(
    user: any,
    id: string,
    quantity: number,
  ): Promise<ProductResponseDto> {
    this.validateProductOperationPermissions(user, 'update');

    // Get the tenant-specific Prisma client
    const prisma = await this.tenantContext.getPrismaClient();

    // Check if product exists
    const product = await prisma.products.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate store access
    this.validateProductAccess(user, product.storeId);

    // Validate quantity is positive
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    // Update only the quantity
    const updatedProduct = await prisma.products.update({
      where: { id },
      data: {
        itemQuantity: quantity,
      },
      include: {
        category: true,
        store: true,
        client: true,
        packs: true,
        productSuppliers: {
          include: {
            supplier: true,
            category: true,
          },
        },
        saleItems: true,
        purchaseOrders: true,
      },
    });

    return this.formatProductResponse(updatedProduct);
  }

  async deleteProduct(user: any, id: string): Promise<void> {
    // Get the tenant-specific Prisma client
    const prisma = await this.tenantContext.getPrismaClient();

    const product = await prisma.products.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    this.validateProductOperationPermissions(user, 'delete', product.storeId);

    // Delete associated packs
    await prisma.pack.deleteMany({ where: { productId: id } });

    await prisma.products.delete({
      where: { id },
    });

    // Soft delete by updating updatedAt (remove status field as it doesn't exist in schema)
    // const deletedProduct = await this.prisma.products.update({
    //   where: { id },
    //   data: {
    //     updatedAt: new Date(),
    //   },
    //   include: {
    //     packs: true,
    //     supplier: {
    //       select: {
    //         id: true,
    //         name: true,
    //         email: true,
    //         phone: true,
    //       },
    //     },
    //     store: {
    //       select: {
    //         id: true,
    //         name: true,
    //       },
    //     },
    //     saleItems: true,
    //     purchaseOrders: true,
    //   },
    // });

    // Return void as the global response interceptor will handle the response format
    return;
  }

  async deleteAllProduct(user: any, storeId: string): Promise<void> {
    this.validateProductOperationPermissions(user, 'delete', storeId);

    const prisma = await this.tenantContext.getPrismaClient();

    // First, get the total count to check if products exist
    const totalCount = await prisma.products.count({
      where: { storeId },
    });

    if (totalCount === 0) {
      throw new NotFoundException('No products found for this store.');
    }

    console.log(
      `Starting batch deletion of ${totalCount} products for store ${storeId}`,
    );

    const batchSize = 500; // Process 100 products at a time
    let processed = 0;

    // Process in batches to avoid overwhelming the database
    while (processed < totalCount) {
      // Get a batch of product IDs
      const productBatch = await prisma.products.findMany({
        where: { storeId },
        select: { id: true },
        take: batchSize,
        skip: 0, // Always take from the beginning since we're deleting
      });

      if (productBatch.length === 0) {
        break; // No more products to process
      }

      const productIds = productBatch.map((p) => p.id);

      try {
        // Delete in transaction to ensure consistency
        await prisma.$transaction(async (tx) => {
          // First delete associated packs for this batch
          await tx.pack.deleteMany({
            where: {
              productId: { in: productIds },
            },
          });

          // Then delete associated product suppliers
          await tx.productSupplier.deleteMany({
            where: {
              productId: { in: productIds },
            },
          });

          // Finally delete the products themselves
          await tx.products.deleteMany({
            where: {
              id: { in: productIds },
            },
          });
        });

        processed += productIds.length;
        console.log(`Deleted batch: ${processed}/${totalCount} products`);

        // Small delay between batches to prevent database overload
        if (processed < totalCount) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(
          `Error deleting batch at ${processed}/${totalCount}:`,
          error,
        );
        throw new BadRequestException(
          `Failed to delete products at batch ${Math.floor(processed / batchSize) + 1}. ${error.message}`,
        );
      }
    }

    // After deleting all products, clean up file upload records
    try {
      console.log(`Cleaning up file upload records for store ${storeId}`);

      await prisma.$transaction(async (tx) => {
        // Delete error logs first (due to foreign key constraint)
        await tx.errorLog.deleteMany({
          where: {
            fileUpload: {
              storeId: storeId,
            },
          },
        });

        // Delete file upload inventory records
        const deletedFileUploads = await tx.fileUploadInventory.deleteMany({
          where: { storeId },
        });

        console.log(`Deleted ${deletedFileUploads.count} file upload records`);
      });
    } catch (error) {
      console.error('Error cleaning up file upload records:', error);
      // Don't throw error here as products were already deleted successfully
      // Just log the error for debugging
    }

    console.log(
      `Successfully deleted all ${processed} products and file upload records for store ${storeId}`,
    );
    return;
  }

  async assignSupplier(dto: AssignSupplierDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    const { supplierId, storeId, products } = dto;

    // Validate required fields
    if (!supplierId) {
      throw new BadRequestException('Missing supplierId');
    }
    if (!storeId) {
      throw new BadRequestException('Missing storeId');
    }
    if (!products || (!Array.isArray(products) && !products.productId)) {
      throw new BadRequestException('At least one product must be provided');
    }

    // Normalize products to always be an array
    const productArray = Array.isArray(products) ? products : [products];

    // Fetch and validate store
    const store = await prisma.stores.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Fetch and validate supplier
    const supplier = await prisma.suppliers.findUnique({
      where: { id: supplierId },
      include: { productSuppliers: true },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    // Optionally: check if supplier belongs to store
    if (supplier.storeId && supplier.storeId !== storeId) {
      throw new BadRequestException('Supplier does not belong to this store');
    }

    // Process each product and collect results
    const results = await Promise.all(
      productArray.map(async (product) => {
        const { productId, costPrice, categoryId } = product;
        try {
          // Validate productId
          if (!productId) {
            throw new BadRequestException('Missing productId');
          }
          // Validate costPrice
          if (
            costPrice === undefined ||
            costPrice === null ||
            isNaN(Number(costPrice))
          ) {
            throw new BadRequestException('Invalid or missing cost price');
          }
          // Optionally: validate categoryId if required
          // if (!categoryId) {
          //   throw new BadRequestException('Missing categoryId');
          // }

          // Validate product existence
          const existingProduct = await prisma.products.findUnique({
            where: { id: productId },
            include: { productSuppliers: true },
          });
          if (!existingProduct) {
            throw new NotFoundException(
              `Product with ID ${productId} not found`,
            );
          }

          // Check if supplier is already assigned to this product
          const alreadyAssigned = existingProduct.productSuppliers.some(
            (ps) => ps.supplierId === supplierId,
          );
          if (alreadyAssigned) {
            throw new ConflictException(
              `Supplier already assigned to product ${productId}`,
            );
          }

          // Determine supplier state
          const hasSuppliers = existingProduct.productSuppliers.length > 0;
          const state = hasSuppliers ? 'secondary' : 'primary';

          // Create product-supplier relation
          const productSupplier = await prisma.productSupplier.create({
            data: {
              productId,
              supplierId,
              costPrice: Number(costPrice),
              state,
              categoryId: categoryId || null,
            },
          });

          return { productId, status: 'success', productSupplier };
        } catch (error) {
          // Extract error message
          let errorMessage = 'Unknown error';
          if (
            error instanceof BadRequestException ||
            error instanceof NotFoundException ||
            error instanceof ConflictException
          ) {
            errorMessage = error.message;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          return { productId, status: 'error', error: errorMessage };
        }
      }),
    );

    // Check if all failed with the same error (optional: throw global error)
    // const allFailed = results.every(r => r.status === 'error');
    // if (allFailed) {
    //   throw new BadRequestException('All supplier assignments failed');
    // }

    return {
      message: 'Supplier assignment results',
      results,
    };
  }

  private async resolveCategoriesFromFile(
    validRows: ProductExcelRow[],
  ): Promise<Map<string, { id: string; name: string }>> {
    const categoryMap = new Map<string, { id: string; name: string }>();
    const uniqueCategories = new Set<string>();

    // Collect unique category names
    for (const product of validRows) {
      if (product.Category && product.Category.trim()) {
        uniqueCategories.add(product.Category.trim());
      }
    }

    // Resolve each category with auto-create enabled for bulk uploads
    for (const categoryName of uniqueCategories) {
      try {
        const resolvedCategory =
          await this.categoryService.findOrCreateCategory(categoryName, {
            allowAutoCreate: true, // Enable auto-creation for bulk uploads
          });
        categoryMap.set(categoryName, resolvedCategory);
        console.log(
          `✅ Category resolved: '${categoryName}' -> ID: ${resolvedCategory.id}`,
        );
      } catch (error) {
        console.error(
          `❌ Failed to resolve category '${categoryName}':`,
          error.message,
        );
        // Re-throw category validation errors
        throw error;
      }
    }

    console.log(
      `📋 Successfully resolved ${categoryMap.size} categories from file`,
    );
    return categoryMap;
  }

  async checkInventoryFileHash(fileHash: string, storeId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return await prisma.fileUploadInventory.findFirst({
      where: {
        fileHash,
        storeId,
      },
    });
  }

  async checkInventoryFileStatus(
    file: Express.Multer.File,
    user: any,
    storeId: string,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
    const dataToHash = Buffer.concat([file.buffer, Buffer.from(user.id)]);
    const fileHash = crypto
      .createHash('sha256')
      .update(dataToHash)
      .digest('hex');
    const existingFile = await this.checkInventoryFileHash(fileHash, storeId);
    if (existingFile) {
      throw new ConflictException('This file has already been uploaded');
    }
    return fileHash;
  }

  async uploadInventorySheet(
    user: any,
    parsedData: ValidationResult,
    file: Express.Multer.File,
    fileHash: string,
    storeId: string,
  ) {
    const prisma = await this.tenantContext.getPrismaClient();
    const store = await prisma.stores.findFirst({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException('Store not found for this user');
    }

    // Validate that the client exists
    const client = await prisma.clients.findUnique({
      where: { id: user.clientId },
    });
    if (!client) {
      throw new BadRequestException(
        'Invalid client - user client does not exist',
      );
    }

    // Validate that the store belongs to the user's client
    if (store.clientId !== user.clientId) {
      throw new BadRequestException('Store does not belong to your client');
    }
    const batchSize = 500;
    // const errorLogs = parsedData.errors.map((err) => ({
    //   fileUploadId: '', // Will be set after fileUpload creation
    //   rowNumber: err.row,
    //   error: err.errors.join('; '),
    // }));
    try {
      const prisma = await this.tenantContext.getPrismaClient();

      // Ensure fresh connection for large operations
      await prisma.$connect();

      const result = await prisma.$transaction(
        async (prisma) => {
          const fileUpload = await prisma.fileUploadInventory.create({
            data: {
              fileHash,
              storeId: store.id,
              fileName: file.originalname,
              status: 'processing',
            },
          });
          // if (errorLogs.length > 0) {
          //   await prisma.errorLog.createMany({
          //     data: errorLogs.map((log) => ({
          //       ...log,
          //       fileUploadId: fileUpload.id,
          //     })),
          //   });
          // }
          let processedItems = 0;
          const validRows = parsedData.data.filter(
            (_, idx) => !parsedData.errors.some((err) => err.row === idx + 1),
          );

          // Process each product individually to handle suppliers, variants, and packs
          if (
            parsedData.data &&
            parsedData.data.length > 0 &&
            parsedData.data[0].SKU !== 'undefined'
          ) {
            // Resolve categories first - this will throw error if fuzzy matches found
            const categoryMap = await this.resolveCategoriesFromFile(validRows);

            // Pre-create suppliers to reduce queries in the loop
            const supplierMap = new Map();
            const uniqueSuppliers = new Map();

            // Collect unique suppliers first
            for (const product of validRows) {
              if (product.VendorName && product.VendorName.trim()) {
                const supplierKey = `${product.VendorName}-${product.VendorPhone || ''}`;
                if (!uniqueSuppliers.has(supplierKey)) {
                  uniqueSuppliers.set(supplierKey, {
                    name: product.VendorName,
                    phone: product.VendorPhone || '',
                    email: '',
                    storeId: store.id,
                    status: 'active',
                  });
                }
              }
            }

            // Create or find suppliers in bulk
            for (const [key, supplierData] of uniqueSuppliers) {
              let supplier = await prisma.suppliers.findFirst({
                where: {
                  name: supplierData.name,
                  phone: supplierData.phone,
                  storeId: store.id,
                },
              });

              if (!supplier) {
                supplier = await prisma.suppliers.create({
                  data: supplierData,
                });
              }

              supplierMap.set(key, supplier);
            }
            for (const product of validRows) {
              // Get supplier from pre-created map
              let supplier: any = null;
              if (product.VendorName && product.VendorName.trim()) {
                const supplierKey = `${product.VendorName}-${product.VendorPhone || ''}`;
                supplier = supplierMap.get(supplierKey);
              } // Check if MatrixAttributes is null or empty to determine hasVariants
              const hasMatrixAttributes = !!(
                product.MatrixAttributes && product.MatrixAttributes.trim()
              );
              const hasVariants = hasMatrixAttributes;

              // Validate PLU/UPC uniqueness if provided (per store)
              if (
                !hasVariants &&
                product['PLU/UPC'] &&
                product['PLU/UPC'].trim()
              ) {
                const existingProduct = await prisma.products.findFirst({
                  where: {
                    pluUpc: product['PLU/UPC'].trim(),
                    storeId: store.id,
                  },
                });
                if (existingProduct) {
                  throw new BadRequestException(
                    `PLU/UPC '${product['PLU/UPC']}' already exists in store '${store.name}'`,
                  );
                }
              }

              // Validate SKU uniqueness if provided (per store)
              if (!hasVariants && product['SKU'] && product['SKU'].trim()) {
                const existingSkuProduct = await prisma.products.findFirst({
                  where: {
                    sku: product['SKU'].trim(),
                    storeId: store.id,
                  },
                });
                if (existingSkuProduct) {
                  throw new BadRequestException(
                    `SKU '${product['SKU']}' already exists in store '${store.name}'`,
                  );
                }
              }
              // ...existing code...
              const resolvedCategory = categoryMap.get(product.Category);
              const productData: any = {
                name: product.ProductName,
                ean: product.EAN || '',
                // Only set pluUpc if product doesn't have variants
                pluUpc: hasVariants
                  ? null
                  : product['PLU/UPC'] && product['PLU/UPC'] !== 'undefined'
                    ? product['PLU/UPC']
                    : null,
                sku:
                  product.SKU && product.SKU !== 'undefined'
                    ? product.SKU
                    : null,
                itemQuantity: product.IndividualItemQuantity || 0,
                msrpPrice: isNaN(product.IndividualItemSellingPrice)
                  ? 0
                  : product.IndividualItemSellingPrice,
                singleItemSellingPrice: isNaN(
                  product.IndividualItemSellingPrice,
                )
                  ? 0
                  : product.IndividualItemSellingPrice,
                discountAmount: product.DiscountValue || 0,
                percentDiscount: product.DiscountPercentage || 0,
                hasVariants,
                packIds: [],
                variants: [],
                // Use relation objects instead of IDs
                client: {
                  connect: { id: user.clientId },
                },
                store: {
                  connect: { id: store.id },
                },
                // Add category relation if available
                ...(resolvedCategory && {
                  category: {
                    connect: { id: resolvedCategory.id },
                  },
                }),
              };

              // Remove old supplierId logic since we now use ProductSupplier relationship

              const createdProduct = await prisma.products.create({
                data: productData,
              });

              // Create ProductSupplier relationship if supplier exists
              if (supplier) {
                await prisma.productSupplier.create({
                  data: {
                    productId: createdProduct.id,
                    supplierId: supplier.id,
                    costPrice: product.VendorPrice || 0,
                    categoryId: resolvedCategory?.id,
                    state: 'primary', // Default to primary for uploaded products
                  },
                });
              }

              if (!hasVariants) {
                // No variants - create pack record and put its reference id directly in products table
                const pack = await prisma.pack.create({
                  data: {
                    productId: createdProduct.id,
                    minimumSellingQuantity: product.MinimumSellingQuantity || 1,
                    totalPacksQuantity: product.PackOf || 1,
                    orderedPacksPrice: product.PackOfPrice,
                    discountAmount: product.PriceDiscountAmount || 0,
                    percentDiscount: product.PercentDiscount || 0,
                  },
                });
                // Update product with pack reference
                await prisma.products.update({
                  where: { id: createdProduct.id },
                  data: {
                    packIds: [pack.id],
                  },
                });
              } else {
                // Has variants - create variant and pack record for each variant
                const matrixAttributeNames =
                  product.MatrixAttributes?.split(/[\/,]/).map((attr) =>
                    attr.trim(),
                  ) || [];
                const attributeValues = [
                  product.Attribute1,
                  product.Attribute2,
                ].filter(Boolean);
                const variants: any[] = [];
                // If we have attribute values, create variants for each
                if (attributeValues.length > 0) {
                  for (const attributeValue of attributeValues) {
                    if (!attributeValue) continue; // Skip undefined/null values
                    // Create pack for this variant
                    const pack = await prisma.pack.create({
                      data: {
                        productId: createdProduct.id,
                        minimumSellingQuantity:
                          product.MinimumSellingQuantity || 1,
                        totalPacksQuantity: product.PackOf || 1,
                        orderedPacksPrice:
                          product.PackOfPrice ||
                          product.IndividualItemSellingPrice,
                        discountAmount: product.PriceDiscountAmount || 0,
                        percentDiscount: product.PercentDiscount || 0,
                      },
                    });
                    variants.push({
                      name: attributeValue.toString().trim(),
                      price: product.IndividualItemSellingPrice,
                      quantity: product.IndividualItemQuantity,
                      pluUpc:
                        `${product['PLU/UPC'] || ''}-${attributeValue.toString().replace(/\s+/g, '').toUpperCase()}`.slice(
                          0,
                          50,
                        ), // Generate variant-specific PLU/UPC
                      packIds: [pack.id],
                    });
                  }
                } else {
                  // If no attribute values but MatrixAttributes exists, create a default variant
                  const pack = await prisma.pack.create({
                    data: {
                      productId: createdProduct.id,
                      minimumSellingQuantity:
                        product.MinimumSellingQuantity || 1,
                      totalPacksQuantity: product.PackOf || 1,
                      orderedPacksPrice:
                        product.PackOfPrice ||
                        product.IndividualItemSellingPrice,
                      discountAmount: product.PriceDiscountAmount || 0,
                      percentDiscount: product.PercentDiscount || 0,
                    },
                  });
                  variants.push({
                    name: 'Default Variant',
                    price: product.IndividualItemSellingPrice,
                    quantity: product.IndividualItemQuantity,
                    pluUpc: product['PLU/UPC'] || null, // Use the product's PLU/UPC for the default variant
                    packIds: [pack.id],
                  });
                }
                // Update product with variants
                await prisma.products.update({
                  where: { id: createdProduct.id },
                  data: {
                    variants: variants,
                  },
                });
              }
              processedItems++;
            }
          } else {
            const batches = chunk(parsedData.data, 500);

            // Resolve categories for batch insert
            const validRows = parsedData.data.filter(
              (_, idx) => !parsedData.errors.some((err) => err.row === idx + 1),
            );
            const categoryMap = await this.resolveCategoriesFromFile(validRows);

            await Promise.all(
              batches.map(async (batch) => {
                processedItems += batch.length;
                await prisma.products.createMany({
                  data: batch.map((product) => {
                    let categoryId: string | undefined = undefined;
                    if (
                      product.Category &&
                      categoryMap &&
                      categoryMap.has(product.Category)
                    ) {
                      categoryId = categoryMap.get(product.Category)?.id;
                    }
                    return {
                      name: product.ProductName,
                      categoryId: categoryId ?? null,
                      pluUpc:
                        product['PLU/UPC'] && product['PLU/UPC'] !== 'undefined'
                          ? product['PLU/UPC']
                          : null,
                      sku:
                        product.SKU && product.SKU !== 'undefined'
                          ? product.SKU
                          : null,
                      itemQuantity: product.IndividualItemQuantity || 0,
                      msrpPrice: isNaN(product.IndividualItemSellingPrice)
                        ? 0
                        : product.IndividualItemSellingPrice,
                      singleItemSellingPrice: isNaN(
                        product.IndividualItemSellingPrice,
                      )
                        ? 0
                        : product.IndividualItemSellingPrice,
                      discountAmount: product.DiscountValue || 0,
                      percentDiscount: product.DiscountPercentage || 0,
                      hasVariants: false,
                      packIds: [],
                      variants: [],
                      clientId: user.clientId,
                      storeId: store.id,
                    };
                  }),
                });
              }),
            );

            // for (const product of validRows) {
            //   const productData: any = {
            //     name: product.ProductName,
            //     category: product
            //
            // ,
            //     pluUpc:
            //       product['PLU/UPC'] && product['PLU/UPC'] !== 'undefined'
            //         ? product['PLU/UPC']
            //         : null,
            //     sku:
            //       product.SKU && product.SKU !== 'undefined'
            //         ? product.SKU
            //         : null,
            //     itemQuantity: product.IndividualItemQuantity || 0,
            //     msrpPrice: isNaN(product.IndividualItemSellingPrice)
            //       ? 0
            //       : product.IndividualItemSellingPrice,
            //     singleItemSellingPrice: isNaN(
            //       product.IndividualItemSellingPrice,
            //     )
            //       ? 0
            //       : product.IndividualItemSellingPrice,
            //     discountAmount: product.DiscountValue || 0,
            //     percentDiscount: product.DiscountPercentage || 0,
            //     hasVariants: false,
            //     packIds: [],
            //     variants: [],
            //     client: {
            //       connect: { id: user.clientId },
            //     },
            //     store: {
            //       connect: { id: store.id },
            //     },
            //   };

            //   const createdProduct = await prisma.products.create({
            //     data: productData,
            //   });

            //   processedItems++;
            // }
          }

          await prisma.fileUploadInventory.update({
            where: { id: fileUpload.id },
            data: { status: 'completed' },
          });
          return {
            totalProcessed: processedItems,
            totalItems: parsedData.data.length,
            fileUploadId: fileUpload.id,
          };
        },
        {
          timeout: 240000, // 240 seconds timeout for large file uploads
        },
      );
      return {
        success: true,
        message: 'Inventory has been added successfully',
        data: {
          processedItems: result.totalProcessed,
          totalItems: result.totalItems,
          fileUploadId: result.fileUploadId,
        },
      };
    } catch (error) {
      console.error(':x: Upload failed:', error);

      try {
        const prisma = await this.tenantContext.getPrismaClient();
        const fileUpload = await prisma.fileUploadInventory.findFirst({
          where: {
            storeId: storeId,
            fileHash: fileHash,
          },
        });
        if (fileUpload) {
          await prisma.fileUploadInventory.update({
            where: { id: fileUpload.id },
            data: { status: 'failed', error: error.message },
          });
        }
      } catch (updateError) {
        console.error('Failed to update file upload status:', updateError);
      }

      if (error.code === 'P2002') {
        // Prisma unique constraint violation: try to extract field from meta if possible
        let field = 'SKU or PLU';
        if (error.meta && error.meta.target) {
          if (Array.isArray(error.meta.target)) {
            field = error.meta.target.join(', ');
          } else {
            field = error.meta.target;
          }
        }
        throw new ConflictException(
          `Duplicate ${field} found in this store. Each SKU and PLU/UPC must be unique within a store.`,
        );
      }

      // Handle specific transaction errors
      if (
        error.message?.includes('Transaction not found') ||
        error.message?.includes('Transaction already closed')
      ) {
        throw new BadRequestException(
          'Upload failed due to timeout. Please try uploading a smaller file or contact support for large file uploads.',
        );
      }

      throw new BadRequestException(
        `Error while adding inventory: ${error.message}`,
      );
    }
  }

  async addInventory(user: any, file: Express.Multer.File, storeId: string) {
    console.log('user', user, 'file', file);
    const fileHash = await this.checkInventoryFileStatus(file, user, storeId);
    const parsedData = parseExcel(file);
    console.log('parsedData', parsedData);
    return await this.uploadInventorySheet(
      user,
      parsedData,
      file,
      fileHash,
      storeId,
    );
  }

  async searchProducts(user: any, query: string, storeId?: string) {
    // Validate user authentication
    if (!user) {
      throw new BadRequestException('User not authenticated');
    }

    // Validate query
    if (!query || query.trim() === '') {
      throw new BadRequestException('Search query is required');
    }

    const prisma = await this.tenantContext.getPrismaClient();

    // Build where clause for search
    let where: any = {
      OR: [
        { name: { contains: query.trim(), mode: 'insensitive' } },
        { sku: { contains: query.trim(), mode: 'insensitive' } },
        { pluUpc: { contains: query.trim(), mode: 'insensitive' } },
        { ean: { contains: query.trim(), mode: 'insensitive' } },
      ],
    };

    // Handle store and client filtering based on user role and permissions
    if (user.role === 'super_admin') {
      // Super admin can search across all stores
      if (storeId) {
        where.storeId = storeId;
      }
    } else {
      // Regular users are restricted to their client and stores
      where.clientId = user.clientId;

      if (storeId) {
        // Check if user has access to the specified store
        const hasStoreAccess = user.stores?.some(
          (store: any) => store.storeId === storeId,
        );

        if (!hasStoreAccess && user.storeId !== storeId) {
          throw new BadRequestException('No access to this store');
        }

        where.storeId = storeId;
      } else if (user.storeId) {
        // If no storeId provided, use user's default store
        where.storeId = user.storeId;
      } else if (user.stores && user.stores.length > 0) {
        // If user has multiple stores, search across all accessible stores
        where.storeId = {
          in: user.stores.map((store: any) => store.storeId),
        };
      } else {
        // User has no store access
        throw new BadRequestException('No store access available');
      }
    }

    // Execute search with proper includes
    const products = await prisma.products.findMany({
      where,
      take: 50,
      include: {
        packs: true,
        productSuppliers: {
          include: {
            supplier: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        saleItems: true,
        purchaseOrders: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        // Prioritize exact matches first
        { name: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return products.map((product) => this.formatProductResponse(product));
  }

  async searchProductsAdvanced(
    user: any,
    options: {
      query?: string;
      storeId?: string;
      categoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      inStock?: boolean;
      hasVariants?: boolean;
      limit?: number;
      page?: number;
    },
  ) {
    // Validate user authentication
    if (!user) {
      throw new BadRequestException('User not authenticated');
    }

    const prisma = await this.tenantContext.getPrismaClient();

    // Build where clause for search
    let where: any = {};

    // Add search query if provided
    if (options.query && options.query.trim() !== '') {
      where.OR = [
        { name: { contains: options.query.trim(), mode: 'insensitive' } },
        { sku: { contains: options.query.trim(), mode: 'insensitive' } },
        { pluUpc: { contains: options.query.trim(), mode: 'insensitive' } },
        { ean: { contains: options.query.trim(), mode: 'insensitive' } },
      ];
    }

    // Handle store and client filtering based on user role and permissions
    if (user.role === 'super_admin') {
      // Super admin can search across all stores
      if (options.storeId) {
        where.storeId = options.storeId;
      }
    } else {
      // Regular users are restricted to their client and stores
      where.clientId = user.clientId;

      if (options.storeId) {
        // Check if user has access to the specified store
        const hasStoreAccess = user.stores?.some(
          (store: any) => store.storeId === options.storeId,
        );

        if (!hasStoreAccess && user.storeId !== options.storeId) {
          throw new BadRequestException('No access to this store');
        }

        where.storeId = options.storeId;
      } else if (user.storeId) {
        // If no storeId provided, use user's default store
        where.storeId = user.storeId;
      } else if (user.stores && user.stores.length > 0) {
        // If user has multiple stores, search across all accessible stores
        where.storeId = {
          in: user.stores.map((store: any) => store.storeId),
        };
      } else {
        // User has no store access
        throw new BadRequestException('No store access available');
      }
    }

    // Add category filter
    if (options.categoryId) {
      where.categoryId = options.categoryId;
    }

    // Add price range filter
    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      where.singleItemSellingPrice = {};
      if (options.minPrice !== undefined) {
        where.singleItemSellingPrice.gte = options.minPrice;
      }
      if (options.maxPrice !== undefined) {
        where.singleItemSellingPrice.lte = options.maxPrice;
      }
    }

    // Add stock filter
    if (options.inStock === true) {
      where.itemQuantity = { gt: 0 };
    } else if (options.inStock === false) {
      where.itemQuantity = { lte: 0 };
    }

    // Add variant filter
    if (options.hasVariants !== undefined) {
      where.hasVariants = options.hasVariants;
    }

    // Pagination
    const limit = options.limit || 50;
    const page = options.page || 1;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await prisma.products.count({ where });

    // Execute search with proper includes
    const products = await prisma.products.findMany({
      where,
      include: {
        packs: true,
        productSuppliers: {
          include: {
            supplier: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        saleItems: true,
        purchaseOrders: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    });

    // Format and return results with pagination info
    return {
      products: products.map((product) => this.formatProductResponse(product)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async searchProductsFuzzy(
    user: any,
    query: string,
    storeId?: string,
    threshold: number = 0.4,
  ) {
    // Validate user authentication
    if (!user) {
      throw new BadRequestException('User not authenticated');
    }

    // Validate query
    if (!query || query.trim() === '') {
      throw new BadRequestException('Search query is required');
    }

    const prisma = await this.tenantContext.getPrismaClient();

    // First, get all products that the user has access to
    let baseWhere: any = {};

    // Handle store and client filtering based on user role and permissions
    if (user.role === 'super_admin') {
      // Super admin can search across all stores
      if (storeId) {
        baseWhere.storeId = storeId;
      }
    } else {
      // Regular users are restricted to their client and stores
      baseWhere.clientId = user.clientId;

      if (storeId) {
        // Check if user has access to the specified store
        const hasStoreAccess = user.stores?.some(
          (store: any) => store.storeId === storeId,
        );

        if (!hasStoreAccess && user.storeId !== storeId) {
          throw new BadRequestException('No access to this store');
        }

        baseWhere.storeId = storeId;
      } else if (user.storeId) {
        // If no storeId provided, use user's default store
        baseWhere.storeId = user.storeId;
      } else if (user.stores && user.stores.length > 0) {
        // If user has multiple stores, search across all accessible stores
        baseWhere.storeId = {
          in: user.stores.map((store: any) => store.storeId),
        };
      } else {
        // User has no store access
        throw new BadRequestException('No store access available');
      }
    }

    // Get all products for fuzzy matching
    const allProducts = await prisma.products.findMany({
      where: baseWhere,
      include: {
        packs: true,
        productSuppliers: {
          include: {
            supplier: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        saleItems: true,
        purchaseOrders: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Import the fuzzy matcher
    const { FuzzyMatcher } = require('../utils/fuzzy-matcher');

    // Create searchable strings for each product
    const searchableItems = allProducts.map((product) => ({
      product,
      searchString: [
        product.name,
        product.sku,
        product.pluUpc,
        product.ean,
        product.category?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    }));

    // Create fuzzy matcher
    const matcher = new FuzzyMatcher(
      searchableItems.map((item) => item.searchString),
      threshold,
    );

    // Perform fuzzy search
    const fuzzyResults = matcher.search(query.toLowerCase(), 20);

    // Map results back to products and sort by relevance
    const matchedProducts = fuzzyResults
      .map((result) => {
        const index = searchableItems.findIndex(
          (item) => item.searchString === result.item,
        );
        return {
          product: searchableItems[index].product,
          score: result.score,
        };
      })
      .sort((a, b) => a.score - b.score) // Lower score = better match
      .slice(0, 20) // Limit to top 20 results
      .map((item) => this.formatProductResponse(item.product));

    return {
      products: matchedProducts,
      query: query.trim(),
      total: matchedProducts.length,
      threshold,
    };
  }

  async getUploadStatus(fileUploadId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const fileUpload = await prisma.fileUploadInventory.findUnique({
      where: { id: fileUploadId },
      select: {
        id: true,
        status: true,
        error: true,
        fileName: true,
        uploadedAt: true,
      },
    });
    if (!fileUpload) {
      throw new NotFoundException('Upload task not found');
    }
    return {
      fileUploadId: fileUpload.id,
      status: fileUpload.status,
      error: fileUpload.error,
      fileName: fileUpload.fileName,
      uploadedAt: fileUpload.uploadedAt,
    };
  }

  async updateVariantQuantity(
    user: any,
    pluUpc: string,
    quantity: number,
  ): Promise<{ success: boolean; message: string; data: any }> {
    this.validateProductOperationPermissions(user, 'update');

    const prisma = await this.tenantContext.getPrismaClient();

    // Build where clause based on user permissions
    let where: any = {};
    if (user.role !== 'super_admin') {
      where.clientId = user.clientId;
      if (user.storeId) {
        where.storeId = user.storeId;
      }
    }

    // Find the product containing the variant with the given PLU/UPC
    const products = await prisma.products.findMany({
      where: {
        ...where,
        hasVariants: true,
      },
      include: {
        packs: true,
        category: true,
        productSuppliers: {
          include: {
            supplier: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        saleItems: true,
        purchaseOrders: true,
      },
    });

    // Find the product that contains the variant with the given PLU/UPC
    let product: any = null;
    for (const p of products) {
      const variants = p.variants as any[];
      if (variants && variants.some((variant) => variant.pluUpc === pluUpc)) {
        product = p;
        break;
      }
    }

    if (!product) {
      throw new NotFoundException(
        `Product with variant PLU/UPC '${pluUpc}' not found`,
      );
    }

    // Find and update the specific variant
    const variants = product.variants as any[];
    const variantIndex = variants.findIndex(
      (variant) => variant.pluUpc === pluUpc,
    );

    if (variantIndex === -1) {
      throw new NotFoundException(`Variant with PLU/UPC '${pluUpc}' not found`);
    }

    // Update the variant quantity
    const updatedVariants = [...variants];
    updatedVariants[variantIndex] = {
      ...updatedVariants[variantIndex],
      quantity,
    };

    // Update the product with the modified variants
    const updatedProduct = await prisma.products.update({
      where: { id: product.id },
      data: {
        variants: updatedVariants,
      },
      include: {
        packs: true,
        category: true,
        productSuppliers: {
          include: {
            supplier: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        saleItems: true,
        purchaseOrders: true,
      },
    });

    return {
      success: true,
      message: 'Variant quantity updated successfully',
      data: {
        product: this.formatProductResponse(updatedProduct),
        updatedVariant: updatedVariants[variantIndex],
      },
    };
  }
}
