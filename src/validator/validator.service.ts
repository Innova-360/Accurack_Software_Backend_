import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PaymentStatus, SaleStatus } from "@prisma/client";
import { PrismaClientService } from "../prisma-client/prisma-client.service";
import { TenantContextService } from "../tenant/tenant-context.service";
import { UpdatePaymentDto } from "./dto/validator.dto";
import { PaginationDto } from "../driver/dto/driver.dto";

interface GetOrdersForValidationResponse {
  orders: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ValidatorService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getOrdersForValidation(userId: string, pagination: PaginationDto): Promise<GetOrdersForValidationResponse> {
    const prisma = await this.tenantContext.getPrismaClient();
    
    const user = await prisma.users.findUnique({ 
      where: { id: userId },
      select: { id: true, position: true }
    });
    // if (!user || user.position !== 'validator') {
    //   throw new ForbiddenException('User is not a validator');
    // }

    const { page, limit } = pagination;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [orders, total] = await Promise.all([
      prisma.orderProcessing.findMany({
        where: {
          status: SaleStatus.PENDING_VALIDATION,
          isValidated: false,
        },
        select: {
          id: true,
          customerId: true,
          customerName: true,
          storeId: true,
          paymentAmount: true,
          paymentType: true,
          status: true,
          isValidated: true,
          driverName: true,
          driverId: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.orderProcessing.count({
        where: {
          status: SaleStatus.PENDING_VALIDATION,
          isValidated: false,
        },
      }),
    ]);

    return {
      orders,
      total,
      page,
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  async updatePayment(dto: UpdatePaymentDto, userId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    
    const user = await prisma.users.findUnique({ 
      where: { id: userId },
      select: { id: true, position: true }
    });
    // if (!user || user.position !== 'validator') {
    //   throw new ForbiddenException('User is not a validator');
    // }

    const order = await prisma.orderProcessing.findUnique({ where: { id: dto.orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.isValidated) {
      throw new BadRequestException('Cannot update validated order');
    }

    const updatedOrder = await prisma.orderProcessing.update({
      where: { id: dto.orderId },
      data: {
        paymentAmount: dto.paymentAmount,
        paymentType: dto.paymentType,
        updatedAt: new Date(),
      },
    });

    return updatedOrder;
  }

  async validateOrder(orderId: string, userId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    
    const user = await prisma.users.findUnique({ 
      where: { id: userId },
      select: { id: true, position: true }
    });
    // if (!user || user.position !== 'validator') {
    //   throw new ForbiddenException('User is not a validator');
    // }

    const order = await prisma.orderProcessing.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.isValidated) {
      throw new BadRequestException('Order is already validated');
    }

    const updatedOrder = await prisma.orderProcessing.update({
      where: { id: orderId },
      data: {
        isValidated: true,
        status: SaleStatus.VALIDATED,
        validatorId: userId,
        updatedAt: new Date(),
      },
    });

    const balanceSheet = await prisma.balanceSheet.findFirst({
      where: { customerId: order.customerId },
    });

    if (balanceSheet) {
      await prisma.balanceSheet.update({
        where: { id: balanceSheet.id },
        data: {
          amountPaid: { increment: updatedOrder.paymentAmount },
          remainingAmount: { decrement: updatedOrder.paymentAmount },
          paymentStatus: updatedOrder.paymentAmount >= balanceSheet.remainingAmount 
            ? PaymentStatus.PAID 
            : PaymentStatus.PARTIAL,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.balanceSheet.create({
        data: {
          customerId: order.customerId,
          amountPaid: updatedOrder.paymentAmount,
          remainingAmount: 0,
          paymentStatus: PaymentStatus.PAID,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    return updatedOrder;
  }


  async rejectOrder(orderId: string, userId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    
    const user = await prisma.users.findUnique({ 
      where: { id: userId },
      select: { id: true, position: true }
    });
    // if (!user || user.position !== 'validator') {
    //   throw new ForbiddenException('User is not a validator');
    // }

    const order = await prisma.orderProcessing.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.isValidated) {
      throw new BadRequestException('Cannot reject validated order');
    }

    const updatedOrder = await prisma.orderProcessing.update({
      where: { id: orderId },
      data: {
        status: SaleStatus.CANCELLED,
        isValidated: false,
        updatedAt: new Date(),
      },
    });

    return updatedOrder;
  }

  async confirmOrder(orderId: string, userId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    
    const order = await prisma.orderProcessing.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== SaleStatus.VALIDATED) {
      throw new BadRequestException('Order must be validated before confirmation');
    }

    const updatedOrder = await prisma.orderProcessing.update({
      where: { id: orderId },
      data: {
        status: SaleStatus.CONFIRMED,
        updatedAt: new Date(),
      },
    });

    return updatedOrder;
  }

  async shipOrder(orderId: string, userId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    
    const order = await prisma.orderProcessing.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== SaleStatus.CONFIRMED) {
      throw new BadRequestException('Order must be confirmed before shipping');
    }

    const updatedOrder = await prisma.orderProcessing.update({
      where: { id: orderId },
      data: {
        status: SaleStatus.SHIPPED,
        updatedAt: new Date(),
      },
    });

    return updatedOrder;
  }
}