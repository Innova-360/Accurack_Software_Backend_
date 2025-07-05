// import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import { UpdatePaymentDto, ValidateOrderDto } from './dto/validator.dto';
// import { SaleStatus, PaymentStatus } from '@prisma/client';

// @Injectable()
// export class ValidatorService {
//   constructor(private prisma: PrismaService) {}

//   async getOrdersForValidation(userId: string) {
//     const user = await this.prisma.users.findUnique({ where: { id: userId } });
//     if (!user || user.position !== 'validator') {
//       throw new ForbiddenException('User is not a validator');
//     }

//     return this.prisma.sales.findMany({
//       where: { status: SaleStatus.SENT_FOR_VALIDATION },
//       include: {
//         customer: true,
//         user: true,
//       },
//     });
//   }

//   async updatePayment(dto: UpdatePaymentDto, userId: string) {
//     const user = await this.prisma.users.findUnique({ where: { id: userId } });
//     if (!user || user.position !== 'validator') {
//       throw new ForbiddenException('User is not a validator');
//     }

//     const order = await this.prisma.sales.findUnique({ where: { id: dto.saleId } });
//     if (!order) {
//       throw new NotFoundException('Order not found');
//     }
//     return this.prisma.sales.update({
//       where: { id: dto.saleId },
//       data: {
//         totalAmount: dto.paymentAmount,
//         updatedAt: new Date(),
//       },
//       include: {
//         customer: true,
//       },
//     });
//   }

//   async validateOrder(saleId: string, userId: string) {
//     const user = await this.prisma.users.findUnique({ where: { id: userId } });
//     if (!user || user.position !== 'validator') {
//       throw new ForbiddenException('User is not a validator');
//     }

//     const order = await this.prisma.sales.findUnique({
//       where: { id: saleId },
//       include: { customer: true },
//     });
//     if (!order) {
//       throw new NotFoundException('Order not found');
//     }

//     // Update Sales record
//     const updatedOrder = await this.prisma.sales.update({
//       where: { id: saleId },
//       data: {
//         status: SaleStatus.VALIDATED,
//         validatorId: userId,
//         updatedAt: new Date(),
//       },
//     });

//     // Update or create BalanceSheet
//     const balanceSheet = await this.prisma.balanceSheet.findFirst({
//       where: { customerId: order.customerId, saleId: order.id },
//     });

//     if (balanceSheet) {
//       await this.prisma.balanceSheet.update({
//         where: { id: balanceSheet.id },
//         data: {
//           amountPaid: { increment: order.totalAmount },
//           remainingAmount: { decrement: order.totalAmount },
//           paymentStatus: order.totalAmount >= balanceSheet.remainingAmount ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
//           updatedAt: new Date(),
//         },
//       });
//     } else {
//       await this.prisma.balanceSheet.create({
//         data: {
//           customerId: order.customerId,
//           saleId: order.id,
//           amountPaid: order.totalAmount,
//           remainingAmount: 0,
//           paymentStatus: PaymentStatus.PAID,
//           createdAt: new Date(),
//           updatedAt: new Date(),
//         },
//       });
//     }

//     return updatedOrder;
//   }
// }