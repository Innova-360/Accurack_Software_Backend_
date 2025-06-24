import { Injectable, HttpException, HttpStatus, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { CreateDamageDto, CreateRefundDto, CreateReturnDto, CreateExchangeDto } from './dto/sale-adjustments.dto';

@Injectable()
export class SaleAdjustmentsService {
  constructor(private prisma: PrismaClientService) {}

  async createDamage(dto: CreateDamageDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Verify sale exists
      const sale = await tx.sales.findUnique({
        where: { id: dto.saleId },
      });
      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      // Verify product and store
      const product = await tx.products.findUnique({
        where: { id: dto.productId },
      });
      if (!product || product.storeId !== dto.storeId) {
        throw new BadRequestException('Invalid product or store');
      }

      // Create adjustment
      const adjustment = await tx.saleAdjustment.create({
        data: {
          saleId: dto.saleId,
          productId: dto.productId,
          userId,
          storeId: dto.storeId,
          adjustmentType: 'DAMAGE',
          damageSubCategory: dto.damageSubCategory,
          quantity: dto.quantity,
          amount: dto.amount,
          reason: dto.reason,
        },
      });

      // Update inventory if applicable
      if (dto.damageSubCategory === 'SCRAP' || dto.damageSubCategory === 'NON_SELLABLE') {
        await tx.products.update({
          where: { id: dto.productId },
          data: {
            itemQuantity: {
              decrement: dto.quantity,
            },
          },
        });
      }

      // Log action
      await tx.auditLogs.create({
        data: {
          userId,
          action: 'CREATE',
          resource: 'SALE_ADJUSTMENT',
          details: {
            type: 'DAMAGE',
            adjustmentId: adjustment.id,
            subCategory: dto.damageSubCategory,
          },
        },
      });

      return adjustment;
    });
  }

  async createRefund(dto: CreateRefundDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sales.findUnique({
        where: { id: dto.saleId },
      });
      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      const product = await tx.products.findUnique({
        where: { id: dto.productId },
      });
      if (!product || product.storeId !== dto.storeId) {
        throw new BadRequestException('Invalid product or store');
      }

      const adjustment = await tx.saleAdjustment.create({
        data: {
          saleId: dto.saleId,
          productId: dto.productId,
          userId,
          storeId: dto.storeId,
          adjustmentType: 'REFUND',
          quantity: dto.quantity,
          amount: dto.amount,
          addToRevenue: dto.addToRevenue,
          reason: dto.reason,
        },
      });

      // Log action
      await tx.auditLogs.create({
        data: {
          userId,
          action: 'CREATE',
          resource: 'SALE_ADJUSTMENT',
          details: {
            type: 'REFUND',
            adjustmentId: adjustment.id,
            addToRevenue: dto.addToRevenue,
          },
        },
      });

      return adjustment;
    });
  }

  async createReturn(dto: CreateReturnDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sales.findUnique({
        where: { id: dto.saleId },
      });
      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      const product = await tx.products.findUnique({
        where: { id: dto.productId },
      });
      if (!product || product.storeId !== dto.storeId) {
        throw new BadRequestException('Invalid product or store');
      }

      const adjustment = await tx.saleAdjustment.create({
        data: {
          saleId: dto.saleId,
          productId: dto.productId,
          userId,
          storeId: dto.storeId,
          adjustmentType: 'RETURN',
          quantity: dto.quantity,
          amount: dto.amount,
          addToInventory: dto.addToInventory,
          reason: dto.reason,
        },
      });

      // Update inventory if needed
      if (dto.addToInventory) {
        await tx.products.update({
          where: { id: dto.productId },
          data: {
            itemQuantity: {
              increment: dto.quantity,
            },
          },
        });
      }

      // Log action
      await tx.auditLogs.create({
        data: {
          userId,
          action: 'CREATE',
          resource: 'SALE_ADJUSTMENT',
          details: {
            type: 'RETURN',
            adjustmentId: adjustment.id,
            addToInventory: dto.addToInventory,
          },
        },
      });

      return adjustment;
    });
  }

  async createExchange(dto: CreateExchangeDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sales.findUnique({
        where: { id: dto.saleId },
      });
      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      const product = await tx.products.findUnique({
        where: { id: dto.productId },
      });
      const replacementProduct = await tx.products.findUnique({
        where: { id: dto.replacementProductId },
      });
      if (!product || !replacementProduct || product.storeId !== dto.storeId || replacementProduct.storeId !== dto.storeId) {
        throw new BadRequestException('Invalid product, replacement product, or store');
      }

      const adjustment = await tx.saleAdjustment.create({
        data: {
          saleId: dto.saleId,
          productId: dto.productId,
          userId,
          storeId: dto.storeId,
          adjustmentType: 'EXCHANGE',
          quantity: dto.quantity,
          amount: dto.amount,
          replacementProductId: dto.replacementProductId,
          reason: dto.reason,
        },
      });

      // Update inventory - remove original, add replacement
      await tx.products.update({
        where: { id: dto.productId },
        data: {
          itemQuantity: {
            increment: dto.quantity, // Return original to inventory
          },
        },
      });

      await tx.products.update({
        where: { id: dto.replacementProductId },
        data: {
          itemQuantity: {
            decrement: dto.quantity, // Remove replacement from inventory
          },
        },
      });

      // Log action
      await tx.auditLogs.create({
        data: {
          userId,
          action: 'CREATE',
          resource: 'SALE_ADJUSTMENT',
          details: {
            type: 'EXCHANGE',
            adjustmentId: adjustment.id,
            replacementProductId: dto.replacementProductId,
          },
        },
      });

      return adjustment;
    });
  }

  async getAdjustmentsBySale(saleId: string) {
    const adjustments = await this.prisma.saleAdjustment.findMany({
      where: { saleId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        replacementProduct: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return adjustments;
  }

  async getAdjustmentsByStore(storeId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [adjustments, total] = await Promise.all([
      this.prisma.saleAdjustment.findMany({
        where: { storeId },
        include: {
          sale: {
            select: {
              id: true,
              total: true,
              createdAt: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          replacementProduct: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.saleAdjustment.count({
        where: { storeId },
      }),
    ]);

    return {
      adjustments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
