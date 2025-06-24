import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
} from './dto/product.dto';
import { ResponseService } from '../common/services/response.service';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaClientService, // Keep for fallback/master DB operations
    private readonly responseService: ResponseService,
    private readonly tenantContext: TenantContextService, // Add tenant context
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

  private async validateSkuUniqueness(
    checkSkuExists: (sku: string) => Promise<boolean>,
    sku: string,
  ): Promise<void> {
    const exists = await checkSkuExists(sku);
    if (exists) {
      throw new BadRequestException('SKU already exists');
    }
  }

  private formatProductResponse(product: any): ProductResponseDto {
    const profitAmount =
      product.singleItemSellingPrice - product.singleItemCostPrice;
    const profitMargin =
      product.singleItemCostPrice > 0
        ? (profitAmount / product.singleItemCostPrice) * 100
        : 0;
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      ean: product.ean,
      pluUpc: product.pluUpc,
      sku: product.sku,
      supplierId: product.supplierId,
      singleItemCostPrice: product.singleItemCostPrice,
      itemQuantity: product.itemQuantity,
      msrpPrice: product.msrpPrice,
      singleItemSellingPrice: product.singleItemSellingPrice,
      discountAmount: product.discountAmount,
      percentDiscount: product.percentDiscount,
      clientId: product.clientId,
      storeId: product.storeId,
      hasVariants: product.hasVariants,
      packIds: product.packIds,
      packs: product.packs || [],
      variants: product.variants || [],
      supplier: product.supplier,
      store: product.store,
      sales: product.sales,
      purchaseOrders: product.purchaseOrders,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      profitAmount: parseFloat(profitAmount.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(2)),
    };
  }

  async createProduct(
    user: any,
    createProductDto: CreateProductDto,
  ): Promise<ProductResponseDto> {
    this.validateProductOperationPermissions(user, 'create');

    // Get the tenant-specific Prisma client
    const prisma = await this.tenantContext.getPrismaClient();

    // Validate SKU uniqueness if provided
    if (createProductDto.sku) {
      await this.validateSkuUniqueness(async (sku: string) => {
        const existing = await prisma.products.findFirst({
          where: { sku },
        });
        return !!existing;
      }, createProductDto.sku);
    }

    // Validate clientId and storeId
    if (!createProductDto.clientId || !createProductDto.storeId) {
      throw new BadRequestException('clientId and storeId are required');
    }

    // Validate supplier exists in tenant database if provided
    if (createProductDto.supplierId) {
      const supplier = await prisma.suppliers.findUnique({
        where: { id: createProductDto.supplierId },
        select: { id: true, name: true, status: true },
      });

      if (!supplier) {
        throw new BadRequestException(
          `Supplier with ID '${createProductDto.supplierId}' not found in tenant database. Please ensure the supplier exists before creating the product.`,
        );
      }

      if (supplier.status !== 'active') {
        throw new BadRequestException(
          `Supplier '${supplier.name}' is not active and cannot be used for product creation.`,
        );
      }
    }

    // Validate store exists in tenant database
    const store = await prisma.stores.findUnique({
      where: { id: createProductDto.storeId },
      select: { id: true, name: true, status: true },
    });

    if (!store) {
      throw new BadRequestException(
        `Store with ID '${createProductDto.storeId}' not found in tenant database.`,
      );
    }

    if (store.status !== 'active') {
      throw new BadRequestException(
        `Store '${store.name}' is not active and cannot be used for product creation.`,
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
    } // Create the product first with empty packIds and variants
    const product = await prisma.products.create({
      data: {
        name: createProductDto.name,
        category: createProductDto.category,
        ean: createProductDto.ean,
        pluUpc: createProductDto.pluUpc,
        supplierId: createProductDto.supplierId,
        sku: createProductDto.sku,
        singleItemCostPrice: createProductDto.singleItemCostPrice,
        itemQuantity: createProductDto.itemQuantity,
        msrpPrice: createProductDto.msrpPrice,
        singleItemSellingPrice: createProductDto.singleItemSellingPrice,
        discountAmount: createProductDto.discountAmount,
        percentDiscount: createProductDto.percentDiscount,
        clientId: createProductDto.clientId,
        storeId: createProductDto.storeId,
        hasVariants: createProductDto.hasVariants || false,
        packIds: [], // Initialize empty, will update later if needed
        variants: [], // Initialize empty, will update later if needed
      },
      include: {
        packs: true,
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        sales: true,
        purchaseOrders: true,
      },
    });

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
                    discountAmount: pack.discountAmount,
                    percentDiscount: pack.percentDiscount,
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
            sku: variant.plu,
            packIds: variantPackIds,
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
              discountAmount: pack.discountAmount,
              percentDiscount: pack.percentDiscount,
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
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        sales: true,
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
    limit: number = 10,
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
          supplier: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          sales: true,
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
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        sales: true,
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

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      await this.validateSkuUniqueness(async (sku: string) => {
        const existing = await prisma.products.findFirst({
          where: {
            sku,
            NOT: { id },
          },
        });
        return !!existing;
      }, updateProductDto.sku);
    }

    // Validate supplier exists in tenant database if being updated
    if (updateProductDto.supplierId && updateProductDto.supplierId !== product.supplierId) {
      const supplier = await prisma.suppliers.findUnique({
        where: { id: updateProductDto.supplierId },
        select: { id: true, name: true, status: true },
      });

      if (!supplier) {
        throw new BadRequestException(
          `Supplier with ID '${updateProductDto.supplierId}' not found in tenant database.`,
        );
      }

      if (supplier.status !== 'active') {
        throw new BadRequestException(
          `Supplier '${supplier.name}' is not active and cannot be used.`,
        );
      }
    }

    // Validate store exists in tenant database if being updated
    if (updateProductDto.storeId && updateProductDto.storeId !== product.storeId) {
      const store = await prisma.stores.findUnique({
        where: { id: updateProductDto.storeId },
        select: { id: true, name: true, status: true },
      });

      if (!store) {
        throw new BadRequestException(
          `Store with ID '${updateProductDto.storeId}' not found in tenant database.`,
        );
      }

      if (store.status !== 'active') {
        throw new BadRequestException(
          `Store '${store.name}' is not active and cannot be used.`,
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
                    discountAmount: pack.discountAmount,
                    percentDiscount: pack.percentDiscount,
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
            sku: variant.plu,
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
              discountAmount: pack.discountAmount,
              percentDiscount: pack.percentDiscount,
            },
            select: { id: true },
          }),
        ),
      );
      packIds = createdPacks.map((pack) => pack.id);
    }
    const updatedProduct = await prisma.products.update({
      where: { id },
      data: {
        name: updateProductDto.name,
        category: updateProductDto.category,
        ean: updateProductDto.ean,
        pluUpc: updateProductDto.pluUpc,
        supplierId: updateProductDto.supplierId,
        sku: updateProductDto.sku,
        singleItemCostPrice: updateProductDto.singleItemCostPrice,
        itemQuantity: updateProductDto.itemQuantity,
        msrpPrice: updateProductDto.msrpPrice,
        singleItemSellingPrice: updateProductDto.singleItemSellingPrice,
        discountAmount: updateProductDto.discountAmount,
        percentDiscount: updateProductDto.percentDiscount,
        clientId: updateProductDto.clientId,
        storeId: updateProductDto.storeId,
        hasVariants: updateProductDto.hasVariants,
        packIds: updateProductDto.hasVariants ? [] : packIds,
        variants: updateProductDto.hasVariants ? variantsWithPacks : [],
      },
      include: {
        packs: true,
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        sales: true,
        purchaseOrders: true,
      },
    });

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
    //     sales: true,
    //     purchaseOrders: true,
    //   },
    // });

    // Return void as the global response interceptor will handle the response format
    return;
  }
}
