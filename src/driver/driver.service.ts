// import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import { CreateOrderDto, UpdateOrderDto } from './dto/driver.dto';
// import { SaleStatus } from '@prisma/client';

// @Injectable()
// export class DriverService {
//   constructor(private prisma: PrismaService) {}

//   async createOrder(storeId: string, dto: CreateOrderDto, user: any) {
//     const userExist = await this.prisma.users.findUnique({ where: { id: user.id } });
//     if (!userExist || userExist.position !== 'driver') {
//       throw new ForbiddenException('User is not a driver');
//     }

//     if (!userExist?.id) {
//       throw new NotFoundException('User not found');
//     }
//     if (!userExist?.clientId) {
//       throw new NotFoundException('User clientId not found');
//     }
//     return this.prisma.sales.create({
//       data: {
//         customerId: dto.customerId,
//         userId: userExist.id,
//         cashierName: dto.cashierName,
//         totalAmount: dto.totalAmount,
//         paymentMethod: dto.paymentMethod,
//         quantitySend: dto.quantitySend,
//         storeId, 
//         clientId: userExist.clientId, 
//         status: SaleStatus.PENDING,
//       },
//       include: {
//         customer: true,
//       },
//     });
//   }


//   async updateOrder(orderId: string, dto: UpdateOrderDto, user: any) {
//     const userExist = await this.prisma.users.findUnique({ where: { id: user.id } });
//     if (!userExist || userExist.position !== 'driver') {
//       throw new ForbiddenException('User is not a driver');
//     }

//     const order = await this.prisma.sales.findUnique({ where: { id: orderId } });
//     if (!order) {
//       throw new NotFoundException('Order not found');
//     }
//     return this.prisma.sales.update({
//       where: { id: orderId },
//       data: {
//         status: dto.status,
//         totalAmount: dto.totalAmount,
//         paymentMethod: dto.paymentMethod,
//         updatedAt: new Date(),
//       },
//       include: {
//         customer: true,
//       },
//     });
//   }


//   async sendForValidation(saleId: string, user: any) {
//     const userExist = await this.prisma.users.findUnique({ where: { id: user.id } });
//     if (!userExist || userExist.position !== 'driver') {
//       throw new ForbiddenException('User is not a driver');
//     }

//     const order = await this.prisma.sales.findUnique({ where: { id: saleId } });
//     if (!order) {
//       throw new NotFoundException('Order not found');
//     }
//     return this.prisma.sales.update({
//       where: { id: saleId },
//       data: {
//         status: SaleStatus.SENT_FOR_VALIDATION,
//         updatedAt: new Date(),
//       },
//     });
//   }


//   async getOrders(user: any) {
//     const userExist = await this.prisma.users.findUnique({ where: { id: user.id } });
//     if (!userExist || userExist.position !== 'driver') {
//       throw new ForbiddenException('User is not a driver');
//     }

//     return this.prisma.sales.findMany({
//       where: { id: userExist.id},
//       include: {
//         customer: true,
//       },
//     });
//   }
// }