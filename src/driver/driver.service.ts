import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  PaginationDto,
} from './dto/driver.dto';
import { SaleStatus } from '@prisma/client';

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  status: string;
  clientId: string;
  createdAt: Date;
  updatedAt: Date;
  // stores: { storeId: string }[];
}

interface GetDriversResponse {
  drivers: Driver[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface GetOrdersResponse {
  orders: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createOrder(storeId: string, dto: CreateOrderDto, user: any) {
    const prisma = await this.tenantContext.getPrismaClient();

    const userExist = await prisma.users.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        position: true,
        clientId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!userExist?.id) {
      throw new NotFoundException('User not found');
    }
    if (!userExist?.clientId) {
      throw new NotFoundException('User clientId not found');
    }

    const customer = await prisma.customer.findUnique({
      where: { id: dto.customerId },
      select: { id: true, customerName: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const order = await prisma.orderProcessing.create({
      data: {
        customerId: dto.customerId,
        customerName: customer.customerName,
        storeId: dto.storeId,
        paymentAmount: dto.paymentAmount,
        paymentType: dto.paymentType,
        status: SaleStatus.PENDING,
        isValidated: false,
        driverId: dto.driverId,
        driverName: dto.driverName,
        clientId: userExist.clientId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return order;
  }

  async updateOrder(orderId: string, dto: UpdateOrderDto, user: any) {
    const prisma = await this.tenantContext.getPrismaClient();

    const userExist = await prisma.users.findUnique({
      where: { id: user.id },
      select: { id: true, position: true },
    });
    if (!userExist || userExist.position !== 'driver') {
      throw new ForbiddenException('User is not a driver');
    }

    const order = await prisma.orderProcessing.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.isValidated) {
      throw new BadRequestException('Cannot update validated order');
    }

    const updatedOrder = await prisma.orderProcessing.update({
      where: { id: orderId },
      data: {
        paymentAmount: dto.paymentAmount,
        paymentType: dto.paymentType,
        status: dto.status || order.status,
        updatedAt: new Date(),
      },
    });

    return updatedOrder;
  }

  async sendForValidation(orderId: string, user: any) {
    const prisma = await this.tenantContext.getPrismaClient();

    const userExist = await prisma.users.findUnique({
      where: { id: user.id },
      select: { id: true, position: true },
    });

    const order = await prisma.orderProcessing.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.isValidated) {
      throw new BadRequestException('Order is already validated');
    }

    const updatedOrder = await prisma.orderProcessing.update({
      where: { id: orderId },
      data: {
        status: SaleStatus.PENDING_VALIDATION,
        updatedAt: new Date(),
      },
    });

    return updatedOrder;
  }

  async getOrders(
    user: any,
    storeId: string,
    page: number,
    limit: number,
    search?: string,
  ): Promise<GetOrdersResponse> {
    const prisma = await this.tenantContext.getPrismaClient();

    const userExist = await prisma.users.findUnique({
      where: { id: user.id },
      select: { id: true, position: true },
    });
    if (!userExist) {
      throw new NotFoundException('User not found');
    }

    const skip = (page - 1) * limit;
    const take = limit;

    // Build search condition only if search term is provided
    const searchCondition = search
      ? {
          OR: [
            { customerName: { contains: search, mode: 'insensitive' as const } },
            { driverName: { contains: search, mode: 'insensitive' as const } },
            { id: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [orders, total] = await Promise.all([
      prisma.orderProcessing.findMany({
        where: {
          storeId,
          ...searchCondition,
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
          storeId,
          ...searchCondition,
        },
      }),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDrivers(
    user: any,
    storeId: string,
    pagination: PaginationDto,
  ): Promise<GetDriversResponse> {
    try {
      const prisma = await this.tenantContext.getPrismaClient();

      const store = await prisma.stores.findFirst({
        where: { id: storeId },
      });

      if (!store) {
        throw new BadRequestException('Store not found');
      }

      const { page, limit } = pagination;
      const skip = (page - 1) * limit;
      const take = limit;

      console.log(store);

      const [driversRaw] = await Promise.all([
        prisma.users.findMany({
          where: {
            position: 'driver',
            role: 'employee',
            stores: {
              some: {
                storeId: store.id,
              },
            },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            email: true,
            position: true,
            status: true,
            clientId: true,
            createdAt: true,
            updatedAt: true,
            // stores: {
            //   select: {
            //     storeId: true,
            //   },
            // },
          },
          // skip,
          // take,
          // orderBy: { createdAt: 'desc' },
        }),
        prisma.users.count({
          where: {
            position: 'driver',
            role: 'employee',
            stores: {
              some: {
                storeId: store.id,
              },
            },
          },
        }),
      ]);

      console.log(driversRaw);

      const drivers: Driver[] = driversRaw.map((driver) => ({
        ...driver,
        position: driver.position ?? '',
      }));

      return {
        drivers,
        total: 10,
        page,
        limit,
        totalPages: Math.ceil(10 / limit),
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new Error('Failed to fetch drivers');
    }
  }
}
