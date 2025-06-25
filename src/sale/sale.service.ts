import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { 
  CreateSaleDto, 
  UpdateSaleDto, 
  CreateSaleReturnDto, 
  CreatePaymentDto, 
  SaleQueryDto,
  CreateCustomerDto,
  UpdateCustomerDto,
  PaymentMethod,
  SaleStatus,
  ReturnCategory,
  PaymentStatus
} from './dto/sale.dto';

@Injectable()
export class SaleService {
  constructor(private prisma: PrismaClientService) {}

  // Customer Management
  async createCustomer(dto: CreateCustomerDto) {
    // Check if customer already exists
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (existingCustomer) {
      throw new BadRequestException('Customer with this phone number already exists');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Create customer
      const customer = await tx.customer.create({
        data: dto,
      });

      // Create initial balance sheet for customer
      await tx.balanceSheet.create({
        data: {
          customerId: customer.id,
          remainingAmount: 0,
          amountPaid: 0,
          paymentStatus: PaymentStatus.PAID,
          description: 'Initial balance sheet created',
        },
      });

      return customer;
    });
  }

  async findCustomerByPhone(phoneNumber: string) {
    return await this.prisma.customer.findUnique({
      where: { phoneNumber },
      include: {
        balanceSheets: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async updateCustomer(customerId: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return await this.prisma.customer.update({
      where: { id: customerId },
      data: dto,
    });
  }

  async getCustomers(storeId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: { storeId },
        include: {
          balanceSheets: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { sales: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where: { storeId } }),
    ]);

    return {
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Sale Management
  async createSale(dto: CreateSaleDto, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      let customer;

      // Find or create customer
      const existingCustomer = await tx.customer.findUnique({
        where: { phoneNumber: dto.customerPhone },
      });

      if (existingCustomer) {
        customer = existingCustomer;
      } else {
        if (!dto.customerData) {
          throw new BadRequestException('Customer data required for new customer');
        }
        
        customer = await tx.customer.create({
          data: dto.customerData,
        });

        // Create initial balance sheet
        await tx.balanceSheet.create({
          data: {
            customerId: customer.id,
            remainingAmount: 0,
            amountPaid: 0,
            paymentStatus: PaymentStatus.PAID,
            description: 'Initial balance sheet created',
          },
        });
      }

      // Validate products and update inventory
      for (const item of dto.saleItems) {
        const product = await tx.products.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        if (product.itemQuantity < item.quantity) {
          throw new BadRequestException(`Insufficient inventory for product ${product.name}`);
        }

        // Update product inventory
        await tx.products.update({
          where: { id: item.productId },
          data: {
            itemQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Create sale
      const sale = await tx.sales.create({
        data: {
          customerId: customer.id,
          userId,
          storeId: dto.storeId,
          clientId: dto.clientId,
          paymentMethod: dto.paymentMethod,
          totalAmount: dto.totalAmount,
          tax: dto.tax || 0,
          status: SaleStatus.COMPLETED,
          generateInvoice: dto.generateInvoice ?? true,
          cashierName: dto.cashierName,
        },
      });

      // Create sale items
      for (const item of dto.saleItems) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
            totalPrice: item.totalPrice,
          },
        });
      }

      // Generate invoice if requested
      let invoice: any = null;
      if (dto.generateInvoice) {
        const invoiceNumber = await this.generateInvoiceNumber();
        
        invoice = await tx.invoice.create({
          data: {
            saleId: sale.id,
            customerId: customer.id,
            invoiceNumber,
            customerName: customer.customerName,
            customerPhone: customer.phoneNumber,
            customerMail: customer.customerMail || dto.companyMail,
            companyName: dto.companyName,
            companyMail: dto.companyMail,
            companyAddress: dto.companyAddress,
            companyNo: dto.companyNo,
            shippingAddress: dto.shippingAddress,
            paymentMethod: dto.paymentMethod,
            totalAmount: dto.totalAmount,
            tax: dto.tax || 0,
            status: SaleStatus.COMPLETED,
            cashierName: dto.cashierName,
          },
        });
      }

      // Update customer balance sheet
      await tx.balanceSheet.create({
        data: {
          customerId: customer.id,
          saleId: sale.id,
          remainingAmount: dto.totalAmount,
          amountPaid: 0,
          paymentStatus: PaymentStatus.UNPAID,
          description: `Sale #${sale.id} - ${dto.totalAmount}`,
        },
      });

      return {
        sale,
        customer,
        invoice,
      };
    });
  }

  async getSales(query: SaleQueryDto, storeId: string) {
    const { page = 1, limit = 20, customerId, status, paymentMethod, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;

    const where: any = { storeId };

    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [sales, total] = await Promise.all([
      this.prisma.sales.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              customerName: true,
              phoneNumber: true,
            },
          },
          saleItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
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
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sales.count({ where }),
    ]);

    return {
      sales,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSaleById(saleId: string) {
    const sale = await this.prisma.sales.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                category: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        invoices: true,
        returns: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return sale;
  }

  async updateSale(saleId: string, dto: UpdateSaleDto) {
    const sale = await this.prisma.sales.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return await this.prisma.sales.update({
      where: { id: saleId },
      data: dto,
    });
  }

  async deleteSale(saleId: string) {
    const sale = await this.prisma.sales.findUnique({
      where: { id: saleId },
      include: { saleItems: true },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Restore inventory
      for (const item of sale.saleItems) {
        await tx.products.update({
          where: { id: item.productId },
          data: {
            itemQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      // Delete related records
      await tx.saleItem.deleteMany({ where: { saleId } });
      await tx.invoice.deleteMany({ where: { saleId } });
      await tx.balanceSheet.deleteMany({ where: { saleId } });

      // Delete sale
      await tx.sales.delete({ where: { id: saleId } });
    });
  }

  // Sale Returns
  async createSaleReturn(dto: CreateSaleReturnDto, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Verify sale and sale item exist
      const sale = await tx.sales.findUnique({
        where: { id: dto.saleId },
        include: {
          saleItems: {
            where: { productId: dto.productId },
          },
          customer: true,
        },
      });

      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      const saleItem = sale.saleItems[0];
      if (!saleItem) {
        throw new NotFoundException('Product not found in this sale');
      }

      if (dto.quantity > saleItem.quantity) {
        throw new BadRequestException('Return quantity cannot exceed purchased quantity');
      }

      // Create return record
      const returnRecord = await tx.saleReturn.create({
        data: {
          saleId: dto.saleId,
          productId: dto.productId,
          quantity: dto.quantity,
          returnCategory: dto.returnCategory,
          reason: dto.reason,
          processedBy: userId,
        },
      });

      // Update inventory based on return category
      const product = await tx.products.findUnique({
        where: { id: dto.productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      switch (dto.returnCategory) {
        case ReturnCategory.SALEABLE:
        case ReturnCategory.SCRAP:
          // Add back to inventory
          await tx.products.update({
            where: { id: dto.productId },
            data: {
              itemQuantity: {
                increment: dto.quantity,
              },
            },
          });
          break;
        case ReturnCategory.NON_SALEABLE:
          // Remove from inventory (already sold, now damaged)
          await tx.products.update({
            where: { id: dto.productId },
            data: {
              itemQuantity: {
                decrement: Math.min(dto.quantity, product.itemQuantity),
              },
            },
          });
          break;
      }

      // Update customer balance sheet if sale was paid
      const lastBalance = await tx.balanceSheet.findFirst({
        where: { customerId: sale.customerId },
        orderBy: { createdAt: 'desc' },
      });

      if (lastBalance && lastBalance.paymentStatus === PaymentStatus.PAID) {
        const returnAmount = dto.quantity * saleItem.sellingPrice;
        
        await tx.balanceSheet.create({
          data: {
            customerId: sale.customerId,
            saleId: dto.saleId,
            remainingAmount: -returnAmount, // Negative for return
            amountPaid: 0,
            paymentStatus: PaymentStatus.PAID,
            description: `Return #${returnRecord.id} - ${returnAmount}`,
          },
        });
      }

      return returnRecord;
    });
  }

  // Payment Management
  async createPayment(dto: CreatePaymentDto) {
    return await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: dto.customerId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      // Get current balance
      const lastBalance = await tx.balanceSheet.findFirst({
        where: { customerId: dto.customerId },
        orderBy: { createdAt: 'desc' },
      });

      const currentBalance = lastBalance ? lastBalance.remainingAmount : 0;
      const newBalance = currentBalance - dto.amountPaid;

      // Create payment record
      const payment = await tx.balanceSheet.create({
        data: {
          customerId: dto.customerId,
          saleId: dto.saleId,
          remainingAmount: newBalance,
          amountPaid: dto.amountPaid,
          paymentStatus: newBalance <= 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
          description: dto.description || `Payment - ${dto.amountPaid}`,
        },
      });

      return payment;
    });
  }

  async getCustomerBalance(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const balanceSheets = await this.prisma.balanceSheet.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const currentBalance = balanceSheets[0]?.remainingAmount || 0;
    const totalPaid = balanceSheets.reduce((sum, sheet) => sum + sheet.amountPaid, 0);

    return {
      customer,
      currentBalance,
      totalPaid,
      balanceHistory: balanceSheets,
    };
  }

  // Utility methods
  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const prefix = `INV-${year}${month}${day}`;
    
    // Find the last invoice number for today
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        invoiceNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }
}
