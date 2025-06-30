import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
} from './dto/product.dto';
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
  ) {}

  private validateProductOperationPermissions(
    user: any,
    operation: 'create' | 'update' | 'delete',
  ): void {
    if (!user) {
      throw new BadRequestException('User not authenticated');
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
    }

    if (storeId) {
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
    this.validateProductOperationPermissions(user, 'create');

    const prisma = await this.tenantContext.getPrismaClient();
    // Validate PLU uniqueness for non-variant products (only if PLU is provided)
    // if (!createProductDto.hasVariants && createProductDto.pluUpc) {
    //   await this.validatePluUniqueness(async (plu: string) => {
    //     const existing = await prisma.products.findFirst({
    //       where: { pluUpc: plu },
    //     });
    //     return !!existing;
    //   }, createProductDto.pluUpc);
    // }

    // Validate PLU uniqueness for variants (if product has variants)
    // if (createProductDto.hasVariants && createProductDto.variants) {
    //   await this.validateVariantPluUniqueness(createProductDto.variants);
    // }

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
      // For variant products, PLU/UPC should be empty at product level
      if (createProductDto.pluUpc) {
        throw new BadRequestException(
          'PLU/UPC must be empty for products with variants. Each variant should have its own PLU/UPC.',
        );
      }
      // Ensure variants exist if hasVariants is true
      if (
        !createProductDto.variants ||
        createProductDto.variants.length === 0
      ) {
        throw new BadRequestException(
          'At least one variant must be provided when hasVariants is true',
        );
      }
    } else {
      // For non-variant products, PLU/UPC is at product level (optional)
      // No additional validation needed as PLU/UPC is already optional
    }

    // Validate ProductSupplier relationships (optional - products can exist without suppliers)
    if (
      createProductDto.productSuppliers &&
      createProductDto.productSuppliers.length > 0
    ) {
      // Validate that at least one supplier is marked as primary
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

    // Create the product first without supplier reference (products can exist without suppliers)
    let product: any;
    try {
      // Prepare create data with proper typing
      const createData: any = {
        name: createProductDto.name,
        categoryId: createProductDto.categoryId,
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
      };

      // Only set pluUpc if hasVariants is false and pluUpc is provided
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
      // Handle foreign key constraint violations
      console.log('Error creating product:', error);
      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Invalid clientId or storeId - referenced record does not exist',
        );
      }
      throw error;
    } // Create ProductSupplier relationships
    if (
      createProductDto.productSuppliers &&
      createProductDto.productSuppliers.length > 0
    ) {
      // Validate that all suppliers exist
      const supplierIds = createProductDto.productSuppliers.map(
        (ps) => ps.supplierId,
      );
      const existingSuppliers = await prisma.suppliers.findMany({
        where: {
          id: { in: supplierIds },
          storeId: createProductDto.storeId, // Ensure suppliers belong to the same store
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

      // Always set the category field in productSupplier to the actual category name from the product's category
      // const categoryName = existingCategory?.name || '';

      await Promise.all(
        createProductDto.productSuppliers.map((supplierData) =>
          prisma.productSupplier.create({
            data: {
              productId: product.id,
              supplierId: supplierData.supplierId,
              costPrice: supplierData.costPrice,
              category: supplierData.category,
              state: supplierData.state,
            },
          }),
        ),
      );
    }

    let packIds: string[] = [];
    let variantsWithPacks: any[] = [];

    // Handle pack creation based on hasVariants
    if (createProductDto.hasVariants && createProductDto.variants) {
      // Create packs for variants and store packIds in variants
      variantsWithPacks = await Promise.all(
        createProductDto.variants.map(async (variant) => {
          let variantPackIds: string[] = [];
          if (variant.packs && variant.packs.length > 0) {
            const createdPacks = await Promise.all(
              variant.packs.map((pack) =>
                prisma.pack.create({
                  data: {
                    productId: product.id, // Use valid productId
                    minimumSellingQuantity: pack.minimumSellingQuantity,
                    totalPacksQuantity: pack.totalPacksQuantity,
                    orderedPacksPrice: pack.orderedPacksPrice,
                    discountAmount: pack.discountAmount || 0,
                    percentDiscount: pack.percentDiscount || 0,
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
            quantity: variant.quantity || 0, // Ensure quantity is set
            msrpPrice: variant.msrpPrice || 0,
            supplierId: variant.supplierId || null, // Optional supplierId
            discountAmount: Number(variant.discountAmount),
            percentDiscount: Number(variant.percentDiscount),
          };
        }),
      );

      // Update product with variants
      await prisma.products.update({
        where: { id: product.id },
        data: {
          variants: variantsWithPacks,
        },
      });
    } else if (createProductDto.packs && createProductDto.packs.length > 0) {
      // Create packs for non-variant products and store packIds in product
      const createdPacks = await Promise.all(
        createProductDto.packs.map((pack) =>
          prisma.pack.create({
            data: {
              productId: product.id, // Use valid productId
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

      // Update product with packIds
      await prisma.products.update({
        where: { id: product.id },
        data: {
          packIds,
        },
      });
    }

    // Fetch the updated product with all relations
    const updatedProduct = await prisma.products.findUnique({
      where: { id: product.id },
      include: {
        packs: true,
        category: true, // Ensure category is included in the response
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

    // Create a purchase order record if this is part of inventory management
    // if (
    //   createProductDto.supplierId &&
    //   createProductDto.itemQuantity > 0 &&
    //   updatedProduct
    // ) {
    //   try {
    //     const employee = await this.prisma.employees.findFirst({
    //       where: {
    //         email: user.email,
    //         storeId: createProductDto.storeId,
    //       },
    //     });

    //     if (employee) {
    //       console.log(
    //         `Creating purchase order with employee ID: ${employee.id}`,
    //       );
    //       await this.prisma.purchaseOrders.create({
    //         data: {
    //           productId: updatedProduct.id,
    //           supplierId: createProductDto.supplierId,
    //           employeeId: employee.id,
    //           storeId: createProductDto.storeId,
    //           quantity: createProductDto.itemQuantity,
    //           price: createProductDto.singleItemCostPrice,
    //           total:
    //             createProductDto.singleItemCostPrice *
    //             createProductDto.itemQuantity,
    //           status: 'active',
    //         },
    //       });
    //       console.log('Purchase order created successfully');
    //     } else {
    //       console.warn(
    //         `No employee record found for user ${user.email} in store ${createProductDto.storeId}. Skipping purchase order creation.`,
    //       );
    //     }
    //   } catch (purchaseOrderError) {
    //     console.error('Failed to create purchase order:', purchaseOrderError);
    //     if (purchaseOrderError.code === 'P2003') {
    //       console.error(
    //         'Foreign key constraint failed - one of the referenced records does not exist',
    //       );
    //       console.error('Constraint:', purchaseOrderError.meta?.constraint);
    //     }
    //   }
    // }

    if (!updatedProduct) {
      throw new BadRequestException('Failed to create product');
    }

    return this.formatProductResponse(updatedProduct);
  }

  async getProducts(
    user: any,
    storeId?: string,
    page: number = 1,
    limit: number = 15000,
  ) {
    this.validateProductAccess(user, storeId);

    // Get the tenant-specific Prisma client
    const prisma = await this.tenantContext.getPrismaClient();

    const skip = (page - 1) * limit;

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
    const [products, total] = await Promise.all([
      prisma.products.findMany({
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
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.products.count({ where }),
    ]);

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

  async getProductById(user: any, id: string): Promise<ProductResponseDto> {
    this.validateProductAccess(user);

    // Get the tenant-specific Prisma client
    const prisma = await this.tenantContext.getPrismaClient();

    const product = await prisma.products.findUnique({
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
    this.validateProductOperationPermissions(user, 'update');

    // Get the tenant-specific Prisma client
    const prisma = await this.tenantContext.getPrismaClient();

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
        throw new BadRequestException('Invalid storeId - store does not exist');
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

    // Prepare update data with proper typing
    const updateData: any = {};

    if (updateProductDto.name !== undefined)
      updateData.name = updateProductDto.name;
    if (updateProductDto.categoryId !== undefined)
      updateData.categoryId = updateProductDto.categoryId;
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
    if (updateProductDto.clientId !== undefined)
      updateData.clientId = updateProductDto.clientId;
    if (updateProductDto.storeId !== undefined)
      updateData.storeId = updateProductDto.storeId;
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
    updateData.variants = updateProductDto.hasVariants ? variantsWithPacks : [];

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
            category: ps.category,
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
  }

  async deleteProduct(user: any, id: string): Promise<void> {
    this.validateProductOperationPermissions(user, 'delete');

    // Get the tenant-specific Prisma client
    const prisma = await this.tenantContext.getPrismaClient();

    const product = await prisma.products.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

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
    this.validateProductOperationPermissions(user, 'delete');

    const prisma = await this.tenantContext.getPrismaClient();

    const products = await prisma.products.findMany({
      where: { storeId },
      select: { id: true },
    });

    if (!products || products.length === 0) {
      throw new NotFoundException('No products found for this store.');
    }

    const productIds = products.map((p) => p.id);

    // Delete associated packs
    await Promise.all(
      productIds.map((productId) =>
        prisma.pack.deleteMany({ where: { productId } }),
      ),
    );

    // Perform hard delete (current behavior)
    await Promise.all(
      productIds.map((productId) =>
        prisma.products.delete({ where: { id: productId } }),
      ),
    );

    return;
    // 📌 Future: Soft delete alternative (uncomment when needed)
    /*
  await Promise.all(
    productIds.map(productId =>
      prisma.products.update({
        where: { id: productId },
        data: {
          updatedAt: new Date(), // Marker for soft delete
          // If you add a `deleted` or `isDeleted` field later, you can set it here
        },
      }),
    ),
  );
  */

    // No return value; global interceptor can format response
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

    // Resolve each category
    for (const categoryName of uniqueCategories) {
      try {
        const resolvedCategory =
          await this.categoryService.findOrCreateCategory(categoryName);
        categoryMap.set(categoryName, resolvedCategory);
      } catch (error) {
        // Re-throw category validation errors
        throw error;
      }
    }

    return categoryMap;
  }

  async checkInventoryFileHash(fileHash: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return await prisma.fileUploadInventory.findUnique({
      where: { fileHash },
    });
  }
  async checkInventoryFileStatus(
    file: Express.Multer.File,
    user: any,
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
    const existingFile = await this.checkInventoryFileHash(fileHash);
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

              // Validate PLU/UPC uniqueness if provided
              if (
                !hasVariants &&
                product['PLU/UPC'] &&
                product['PLU/UPC'].trim()
              ) {
                const existingProduct = await prisma.products.findFirst({
                  where: { pluUpc: product['PLU/UPC'].trim() },
                });
                if (existingProduct) {
                  throw new BadRequestException(
                    `PLU/UPC '${product['PLU/UPC']}' already exists in database`,
                  );
                }
              } // Create the product (without supplier reference for now)
              const resolvedCategory = categoryMap.get(product.Category);
              const productData: any = {
                name: product.ProductName,
                categoryId: resolvedCategory?.id || null,
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
                    category: resolvedCategory?.name || product.Category,
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

            await Promise.all(
              batches.map(async (batch) => {
                processedItems += batch.length;
                await prisma.products.createMany({
                  data: batch.map((product) => ({
                    name: product.ProductName,
                    category: product.Category,
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
                  })),
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
        const fileUpload = await prisma.fileUploadInventory.findUnique({
          where: { fileHash },
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
        throw new ConflictException('Duplicate SKU or PLU found in database');
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
    const fileHash = await this.checkInventoryFileStatus(file, user);
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
    this.validateProductAccess(user, storeId);
    const prisma = await this.tenantContext.getPrismaClient();
    let where: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { pluUpc: { contains: query, mode: 'insensitive' } },
        { ean: { contains: query, mode: 'insensitive' } },
      ],
    };
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
    const products = await prisma.products.findMany({
      where,
      include: {
        packs: true,
        productSuppliers: { include: { supplier: true } },
        store: { select: { id: true, name: true } },
        saleItems: true,
        purchaseOrders: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((product) => this.formatProductResponse(product));
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
}
