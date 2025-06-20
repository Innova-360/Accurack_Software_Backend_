import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { Role, Status } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaClientService) {}

  async createProduct(user: any, createProductDto: CreateProductDto) {
    // Check permissions - only super_admin, admin, and manager can create products
    if (
      ![Role.super_admin, Role.admin, Role.manager, Role.employee].includes(
        user.role,
      )
    ) {
      throw new ForbiddenException(
        'Only admins, managers and emplyees can create products',
      );
    }

    // Verify user has access to the store
    const storeAccess = user.stores?.find(
      (store) => store.storeId === createProductDto.storeId,
    );
    if (!storeAccess && user.role !== Role.super_admin) {
      throw new ForbiddenException('No access to this store');
    }

    // Check if SKU already exists
    const existingSku = await this.prisma.products.findUnique({
      where: { sku: createProductDto.sku },
    });
    if (existingSku) {
      throw new BadRequestException('SKU already exists');
    }

    // console.log('Creating product with data:', createProductDto);

    // Verify supplier exists and belongs to the same store
    const supplier = await this.prisma.suppliers.findFirst({
      where: {
        id: createProductDto.supplierId,
        storeId: createProductDto.storeId,
        status: Status.active,
      },
    });

    // console.log('Supplier found:', supplier);
    if (!supplier) {
      throw new BadRequestException('Supplier not found or not accessible');
    }

    try {
      // Create product and purchase order in a transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create the product
        const product = await prisma.products.create({
          data: {
            name: createProductDto.name,
            description: createProductDto.description,
            sku: createProductDto.sku,
            barcode: createProductDto.barcode,
            price: createProductDto.price,
            costPrice: createProductDto.costPrice,
            quantity: createProductDto.quantity,
            clientId: user.clientId,
            storeId: createProductDto.storeId,
            status: Status.active,
          },
          select: {
            id: true,
            name: true,
            description: true,
            sku: true,
            barcode: true,
            price: true,
            costPrice: true,
            quantity: true,
            clientId: true,
            storeId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            store: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // // Create initial purchase order if purchase details provided
        // let purchaseOrder: any = null;
        // if (
        //   createProductDto.purchaseQuantity &&
        //   createProductDto.purchasePrice
        // ) {
        //   // Find an employee to assign the purchase order (preferably the current user if they're an employee)
        //   const user = await prisma.users.findFirst({
        //     where: {
        //       storeId: createProductDto.storeId,
        //       status: Status.active,
        //     },
        //     orderBy: {
        //       createdAt: 'asc',
        //     },
        //   });

        //   if (user.role === Role.employee) {
        //     purchaseOrder = await prisma.purchaseOrders.create({
        //       data: {
        //         productId: product.id,
        //         supplierId: createProductDto.supplierId,
        //         employeeId: employee.id,
        //         storeId: createProductDto.storeId,
        //         quantity: createProductDto.purchaseQuantity,
        //         price: createProductDto.purchasePrice,
        //         total:
        //           createProductDto.purchaseQuantity *
        //           createProductDto.purchasePrice,
        //         status: Status.pending,
        //       },
        //       select: {
        //         id: true,
        //         quantity: true,
        //         price: true,
        //         total: true,
        //         status: true,
        //         createdAt: true,
        //       },
        //     });
        //   }
        // }

        return { product };
      });

      return {
        message: 'Product created successfully',
        data: {
          product: result.product,
          //   purchaseOrder: result.purchaseOrder,
        },
      };
    } catch (error) {
      console.error('Create product error:', error);
      throw new BadRequestException(
        'Failed to create product: ' + error.message,
      );
    }
  }

  async getProducts(
    user: any,
    storeId?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      // Build where clause based on user role and store access
      let whereClause: any = {
        status: Status.active,
      };

      if (user.role === Role.super_admin) {
        // Super admin can see all products
        if (storeId) {
          whereClause.storeId = storeId;
        }
        if (user.clientId) {
          whereClause.clientId = user.clientId;
        }
      } else {
        // Other users can only see products from their accessible stores
        const accessibleStoreIds =
          user.stores?.map((store) => store.storeId) || [];
        if (storeId) {
          // Check if user has access to the specific store
          if (!accessibleStoreIds.includes(storeId)) {
            throw new ForbiddenException('No access to this store');
          }
          whereClause.storeId = storeId;
        } else {
          whereClause.storeId = { in: accessibleStoreIds };
        }
        whereClause.clientId = user.clientId;
      }

      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        this.prisma.products.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            description: true,
            sku: true,
            barcode: true,
            price: true,
            costPrice: true,
            quantity: true,
            clientId: true,
            storeId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            store: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.products.count({
          where: whereClause,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        message: 'Products retrieved successfully',
        data: {
          products,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      console.error('Get products error:', error);
      throw new BadRequestException(
        'Failed to retrieve products: ' + error.message,
      );
    }
  }

  async getProductById(user: any, productId: string) {
    try {
      let whereClause: any = {
        id: productId,
        status: Status.active,
      };

      // Add store access check for non-super-admin users
      if (user.role !== Role.super_admin) {
        const accessibleStoreIds =
          user.stores?.map((store) => store.storeId) || [];
        whereClause.storeId = { in: accessibleStoreIds };
        whereClause.clientId = user.clientId;
      } else if (user.clientId) {
        whereClause.clientId = user.clientId;
      }

      const product = await this.prisma.products.findFirst({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          sku: true,
          barcode: true,
          price: true,
          costPrice: true,
          quantity: true,
          clientId: true,
          storeId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          purchaseOrders: {
            select: {
              id: true,
              quantity: true,
              price: true,
              total: true,
              status: true,
              createdAt: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          },
        },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      return {
        message: 'Product retrieved successfully',
        data: product,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      console.error('Get product error:', error);
      throw new BadRequestException(
        'Failed to retrieve product: ' + error.message,
      );
    }
  }

  async updateProduct(
    user: any,
    productId: string,
    updateProductDto: UpdateProductDto,
  ) {
    // Check permissions
    if (
      ![Role.super_admin, Role.admin, Role.manager, Role.employee].includes(
        user.role,
      )
    ) {
      throw new ForbiddenException(
        'Only admins and managers can update products',
      );
    }

    try {
      // First, check if product exists and user has access
      let whereClause: any = {
        id: productId,
        status: Status.active,
      };

      if (user.role !== Role.super_admin) {
        const accessibleStoreIds =
          user.stores?.map((store) => store.storeId) || [];
        whereClause.storeId = { in: accessibleStoreIds };
        whereClause.clientId = user.clientId;
      } else if (user.clientId) {
        whereClause.clientId = user.clientId;
      }

      const existingProduct = await this.prisma.products.findFirst({
        where: whereClause,
      });

      if (!existingProduct) {
        throw new NotFoundException('Product not found');
      }

      // Check SKU uniqueness if being updated
      if (
        updateProductDto.sku &&
        updateProductDto.sku !== existingProduct.sku
      ) {
        const existingSku = await this.prisma.products.findUnique({
          where: { sku: updateProductDto.sku },
        });
        if (existingSku) {
          throw new BadRequestException('SKU already exists');
        }
      }

      // If storeId is being updated, verify user has access to the new store
      if (
        updateProductDto.storeId &&
        updateProductDto.storeId !== existingProduct.storeId
      ) {
        const storeAccess = user.stores?.find(
          (store) => store.storeId === updateProductDto.storeId,
        );
        if (!storeAccess && user.role !== Role.super_admin) {
          throw new ForbiddenException('No access to the target store');
        }
      }

      const updatedProduct = await this.prisma.products.update({
        where: { id: productId },
        data: {
          ...(updateProductDto.name && { name: updateProductDto.name }),
          ...(updateProductDto.description !== undefined && {
            description: updateProductDto.description,
          }),
          ...(updateProductDto.sku && { sku: updateProductDto.sku }),
          ...(updateProductDto.barcode !== undefined && {
            barcode: updateProductDto.barcode,
          }),
          ...(updateProductDto.price !== undefined && {
            price: updateProductDto.price,
          }),
          ...(updateProductDto.costPrice !== undefined && {
            costPrice: updateProductDto.costPrice,
          }),
          ...(updateProductDto.quantity !== undefined && {
            quantity: updateProductDto.quantity,
          }),
          ...(updateProductDto.storeId && {
            storeId: updateProductDto.storeId,
          }),
        },
        select: {
          id: true,
          name: true,
          description: true,
          sku: true,
          barcode: true,
          price: true,
          costPrice: true,
          quantity: true,
          clientId: true,
          storeId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          store: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        message: 'Product updated successfully',
        data: updatedProduct,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      )
        throw error;
      console.error('Update product error:', error);
      throw new BadRequestException(
        'Failed to update product: ' + error.message,
      );
    }
  }

  async deleteProduct(user: any, productId: string) {
    // Check permissions - only super_admin and admin can delete products
    if (![Role.super_admin, Role.admin].includes(user.role)) {
      throw new ForbiddenException('Only admins can delete products');
    }

    try {
      // First, check if product exists and user has access
      let whereClause: any = {
        id: productId,
        status: Status.active,
      };

      if (user.role !== Role.super_admin) {
        const accessibleStoreIds =
          user.stores?.map((store) => store.storeId) || [];
        whereClause.storeId = { in: accessibleStoreIds };
        whereClause.clientId = user.clientId;
      } else if (user.clientId) {
        whereClause.clientId = user.clientId;
      }

      const existingProduct = await this.prisma.products.findFirst({
        where: whereClause,
      });

      if (!existingProduct) {
        throw new NotFoundException('Product not found');
      }

      // Soft delete by updating status to inactive
      await this.prisma.products.update({
        where: { id: productId },
        data: {
          status: Status.inactive,
        },
      });

      return {
        message: 'Product deleted successfully',
        data: {
          id: productId,
          deleted: true,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      )
        throw error;
      console.error('Delete product error:', error);
      throw new BadRequestException(
        'Failed to delete product: ' + error.message,
      );
    }
  }
}
