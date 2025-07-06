import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/driver.dto';
import { SaleStatus } from '@prisma/client';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createOrder(storeId: string, dto: CreateOrderDto, user: any) {
    const prisma = await this.tenantContext.getPrismaClient();
    
    const userExist = await prisma.users.findUnique({ where: { id: user.id } });
    if (!userExist || userExist.position !== 'driver') {
      throw new ForbiddenException('User is not a driver');
    }

    if (!userExist?.id) {
      throw new NotFoundException('User not found');
    }
    if (!userExist?.clientId) {
      throw new NotFoundException('User clientId not found');
    }
    return prisma.sales.create({
      data: {
        customerId: dto.customerId,
        userId: userExist.id,
        cashierName: dto.cashierName,
        totalAmount: dto.totalAmount,
        paymentMethod: dto.paymentMethod,
        quantitySend: dto.quantitySend,
        storeId, 
        clientId: userExist.clientId, 
        status: SaleStatus.PENDING,
      },
      include: {
        customer: true,
      },
    });
  }


  async updateOrder(orderId: string, dto: UpdateOrderDto, user: any) {
    const prisma = await this.tenantContext.getPrismaClient();
    
    const userExist = await prisma.users.findUnique({ where: { id: user.id } });
    if (!userExist || userExist.position !== 'driver') {
      throw new ForbiddenException('User is not a driver');
    }

    const order = await prisma.sales.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return prisma.sales.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        totalAmount: dto.totalAmount,
        paymentMethod: dto.paymentMethod,
        updatedAt: new Date(),
      },
      include: {
        customer: true,
      },
    });
  }


  async sendForValidation(saleId: string, user: any) {
    const prisma = await this.tenantContext.getPrismaClient();
    
    const userExist = await prisma.users.findUnique({ where: { id: user.id } });
    if (!userExist || userExist.position !== 'driver') {
      throw new ForbiddenException('User is not a driver');
    }

    const order = await prisma.sales.findUnique({ where: { id: saleId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return prisma.sales.update({
      where: { id: saleId },
      data: {
        status: SaleStatus.SENT_FOR_VALIDATION,
        updatedAt: new Date(),
      },
    });
  }


  async getOrders(user: any) {
    const prisma = await this.tenantContext.getPrismaClient();
    
    const userExist = await prisma.users.findUnique({ where: { id: user.id } });
    if (!userExist || userExist.position !== 'driver') {
      throw new ForbiddenException('User is not a driver');
    }

    return prisma.sales.findMany({
      where: { userId: userExist.id },
      include: {
        customer: true,
      },
    });
  }


  async getDrivers(user: any) {
    const prisma = await this.tenantContext.getPrismaClient();

    // Only allow admins or managers to get list of drivers
    if (!user || (user.position !== 'admin' && user.position !== 'manager')) {
      throw new ForbiddenException('User is not authorized to view drivers list');
    }

    const drivers = await prisma.users.findMany({
      where: { position: "driver" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        position: true,
        status: true,
        clientId: true,
        createdAt: true,
        updatedAt: true,
        // Exclude sensitive fields like passwordHash, otp, etc.
      },
    });

    return drivers;
  }
}