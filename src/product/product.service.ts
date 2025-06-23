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
} from '../utils/fileParser';
import * as crypto from 'crypto';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
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
  constructor(private readonly prisma: PrismaClientService) {}

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

    // Validate SKU uniqueness if provided
    if (createProductDto.sku) {
      await this.validateSkuUniqueness(async (sku: string) => {
        const existing = await this.prisma.products.findFirst({
          where: { sku },
        });
        return !!existing;
      }, createProductDto.sku);
    }

    // Validate clientId and storeId
    if (!createProductDto.clientId || !createProductDto.storeId) {
      throw new BadRequestException('clientId and storeId are required');
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

    // Create the product first with empty packIds and variants
    const product = await this.prisma.products.create({
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
                this.prisma.pack.create({
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
      await this.prisma.products.update({
        where: { id: product.id },
        data: {
          variants: variantsWithPacks,
        },
      });
    } else if (createProductDto.packs && createProductDto.packs.length > 0) {
      // Create packs for non-variant products and store packIds in product
      const createdPacks = await Promise.all(
        createProductDto.packs.map((pack) =>
          this.prisma.pack.create({
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
      await this.prisma.products.update({
        where: { id: product.id },
        data: {
          packIds,
        },
      });
    }

    // Fetch the updated product with all relations
    const updatedProduct = await this.prisma.products.findUnique({
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
      this.prisma.products.findMany({
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
      this.prisma.products.count({ where }),
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

    const product = await this.prisma.products.findUnique({
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
    UpdateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    this.validateProductOperationPermissions(user, 'update');

    const product = await this.prisma.products.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (UpdateProductDto.sku && UpdateProductDto.sku !== product.sku) {
      await this.validateSkuUniqueness(async (sku: string) => {
        const existing = await this.prisma.products.findFirst({
          where: {
            sku,
            NOT: { id },
          },
        });
        return !!existing;
      }, UpdateProductDto.sku);
    }

    let packIds: string[] = [];
    let variantsWithPacks: any[] = [];

    // Validate pack and variant constraints
    if (
      UpdateProductDto.hasVariants === true &&
      UpdateProductDto.packs &&
      UpdateProductDto.packs?.length > 0
    ) {
      throw new BadRequestException(
        'Packs cannot be provided at product level when hasVariants is true',
      );
    }
    if (
      UpdateProductDto.hasVariants === false &&
      UpdateProductDto.variants &&
      UpdateProductDto.variants?.length > 0
    ) {
      throw new BadRequestException(
        'Variants must be empty when hasVariants is false',
      );
    }

    // Delete existing packs to avoid duplicates
    await this.prisma.pack.deleteMany({ where: { productId: id } });

    // Handle pack updates based on hasVariants
    if (UpdateProductDto.hasVariants && UpdateProductDto.variants) {
      variantsWithPacks = await Promise.all(
        UpdateProductDto.variants.map(async (variant) => {
          let variantPackIds: string[] = [];
          if (variant.packs && variant.packs.length > 0) {
            const createdPacks = await Promise.all(
              variant.packs.map((pack) =>
                this.prisma.pack.create({
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
    } else if (UpdateProductDto.packs && UpdateProductDto.packs.length > 0) {
      const createdPacks = await Promise.all(
        UpdateProductDto.packs.map((pack) =>
          this.prisma.pack.create({
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

    const updatedProduct = await this.prisma.products.update({
      where: { id },
      data: {
        name: UpdateProductDto.name,
        category: UpdateProductDto.category,
        ean: UpdateProductDto.ean,
        pluUpc: UpdateProductDto.pluUpc,
        supplierId: UpdateProductDto.supplierId,
        sku: UpdateProductDto.sku,
        singleItemCostPrice: UpdateProductDto.singleItemCostPrice,
        itemQuantity: UpdateProductDto.itemQuantity,
        msrpPrice: UpdateProductDto.msrpPrice,
        singleItemSellingPrice: UpdateProductDto.singleItemSellingPrice,
        discountAmount: UpdateProductDto.discountAmount,
        percentDiscount: UpdateProductDto.percentDiscount,
        clientId: UpdateProductDto.clientId,
        storeId: UpdateProductDto.storeId,
        hasVariants: UpdateProductDto.hasVariants,
        packIds: UpdateProductDto.hasVariants ? [] : packIds,
        variants: UpdateProductDto.hasVariants ? variantsWithPacks : [],
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

    const product = await this.prisma.products.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Delete associated packs
    await this.prisma.pack.deleteMany({ where: { productId: id } });

    await this.prisma.products.delete({
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

  async checkInventoryFileHash(fileHash: string) {
    return await this.prisma.fileUploadInventory.findUnique({
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
  ) {
    const store = await this.prisma.stores.findFirst({
      where: { clientId: user.id },
    });

    if (!store) {
      throw new NotFoundException('Store not found for this user');
    }

    const batchSize = 500;
    const errorLogs = parsedData.errors.map((err) => ({
      fileUploadId: '', // Will be set after fileUpload creation
      rowNumber: err.row,
      error: err.errors.join('; '),
    }));

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        const fileUpload = await prisma.fileUploadInventory.create({
          data: {
            fileHash,
            storeId: store.id,
            fileName: file.originalname,
            status: 'processing',
          },
        });

        if (errorLogs.length > 0) {
          await prisma.errorLog.createMany({
            data: errorLogs.map((log) => ({
              ...log,
              fileUploadId: fileUpload.id,
            })),
          });
        }

        let processedItems = 0;
        const validRows = parsedData.data.filter(
          (_, idx) => !parsedData.errors.some((err) => err.row === idx + 1),
        );

        // Process each product individually to handle suppliers, variants, and packs
        for (const product of validRows) {
          // Find or create supplier
          let supplier = await prisma.suppliers.findFirst({
            where: {
              name: product.VendorName,
              phone: product.VendorPhone,
              storeId: store.id,
            },
          });
          if (!supplier) {
            supplier = await prisma.suppliers.create({
              data: {
                name: product.VendorName,
                phone: product.VendorPhone,
                email: '', // Default empty email as it's not provided in Excel
                storeId: store.id,
                status: 'active',
              },
            });
          } // Check if MatrixAttributes is null or empty to determine hasVariants
          const hasMatrixAttributes = !!(
            product.MatrixAttributes && product.MatrixAttributes.trim()
          );
          const hasVariants = hasMatrixAttributes;

          // Create the product
          const createdProduct = await prisma.products.create({
            data: {
              name: product.ProductName,
              category: product.Category,
              ean: product.EAN || '',
              pluUpc: product['PLU/UPC'],
              supplierId: supplier.id,
              sku: product.SKU,
              singleItemCostPrice: product.VendorPrice,
              itemQuantity: product.IndividualItemQuantity,
              msrpPrice: product.IndividualItemSellingPrice,
              singleItemSellingPrice: product.IndividualItemSellingPrice,
              discountAmount: product.DiscountValue || 0,
              percentDiscount: product.DiscountPercentage || 0,
              clientId: user.clientId,
              storeId: store.id,
              hasVariants,
              packIds: [],
              variants: [],
            },
          });
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
                    minimumSellingQuantity: product.MinimumSellingQuantity || 1,
                    totalPacksQuantity: product.PackOf || 1,
                    orderedPacksPrice:
                      product.PackOfPrice || product.IndividualItemSellingPrice,
                    discountAmount: product.PriceDiscountAmount || 0,
                    percentDiscount: product.PercentDiscount || 0,
                  },
                });

                variants.push({
                  name: attributeValue.toString().trim(),
                  price: product.IndividualItemSellingPrice,
                  sku: `${product.SKU}-${attributeValue.toString().replace(/\s+/g, '').toUpperCase()}`,
                  packIds: [pack.id],
                });
              }
            } else {
              // If no attribute values but MatrixAttributes exists, create a default variant
              const pack = await prisma.pack.create({
                data: {
                  productId: createdProduct.id,
                  minimumSellingQuantity: product.MinimumSellingQuantity || 1,
                  totalPacksQuantity: product.PackOf || 1,
                  orderedPacksPrice:
                    product.PackOfPrice || product.IndividualItemSellingPrice,
                  discountAmount: product.PriceDiscountAmount || 0,
                  percentDiscount: product.PercentDiscount || 0,
                },
              });

              variants.push({
                name: 'Default Variant',
                price: product.IndividualItemSellingPrice,
                sku: `${product.SKU}-DEFAULT`,
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

        await prisma.fileUploadInventory.update({
          where: { id: fileUpload.id },
          data: { status: 'completed' },
        });

        return {
          totalProcessed: processedItems,
          totalItems: parsedData.data.length,
          fileUploadId: fileUpload.id,
        };
      });

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
      console.error('❌ Upload failed:', error);

      const fileUpload = await this.prisma.fileUploadInventory.findUnique({
        where: { fileHash },
      });
      if (fileUpload) {
        await this.prisma.fileUploadInventory.update({
          where: { id: fileUpload.id },
          data: { status: 'failed', error: error.message },
        });
      }

      if (error.code === 'P2002') {
        throw new ConflictException('Duplicate SKU or PLU found in database');
      }

      throw new BadRequestException(
        `Error while adding inventory: ${error.message}`,
      );
    }
  }

  async addInventory(user: any, file: Express.Multer.File) {
    const fileHash = await this.checkInventoryFileStatus(file, user);
    const parsedData = parseExcel(file);
    return await this.uploadInventorySheet(user, parsedData, file, fileHash);
  }

  async getUploadStatus(fileUploadId: string) {
    const fileUpload = await this.prisma.fileUploadInventory.findUnique({
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
