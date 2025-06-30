import {
  PrismaClient,
  Invoice,
  SaleStatus,
  PaymentMethod,
} from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { generate } from 'qrcode';
import { CreateInvoiceDto } from './dto/invoice.dto';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';


interface User {
  businessId: string;
  business: {
    logoUrl?: string;
  };
}

export class InvoiceService {
  constructor(
    private readonly prisma: PrismaClientService, // Keep for fallback/master DB operations
    private readonly tenantContext: TenantContextService, // Add tenant context
  ) {}

  async createInvoice(dto: CreateInvoiceDto, user: User): Promise<Invoice> {
    const prisma = await this.tenantContext.getPrismaClient();
    const { saleId, customFields } = dto;
    const { businessId } = user; 
    const { logoUrl } = user.business;

    // Fetch sale with related data
    const sale = await prisma.sales.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        saleItems: true,
        store: true,
        client: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    // Fetch business data
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Calculate net amount (totalAmount - allowance)
    const netAmount = sale.totalAmount - (sale.allowance || 0);

    // Generate QR code
    const qrCodeData = `Invoice:${sale.id}:${new Date().toISOString()}`;
    const qrCode = await new Promise<string>((resolve, reject) => {
      generate(qrCodeData, { small: true }, (err, url) => {
        if (err) reject(err);
        resolve(url);
      });
    });

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        saleId,
        customerId: sale.customerId,
        businessId,
        invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        customerName: sale.customer.customerName,
        customerPhone: sale.customer.phoneNumber,
        customerMail: sale.customer.customerMail || undefined,
        customerWebsite: sale.customer.website || undefined,
        customerAddress: sale.customer.customerAddress || undefined,
        businessName: business.businessName,
        businessContact: business.contactNo,
        businessWebsite: business.website || undefined,
        businessAddress: business.address || undefined,
        shippingAddress: sale.customer.customerAddress || undefined,
        paymentMethod: sale.paymentMethod,
        totalAmount: sale.totalAmount,
        netAmount,
        tax: sale.tax,
        status: sale.status,
        cashierName: sale.cashierName,
        logoUrl: logoUrl || business.logoUrl || undefined,
        qrCode,
        customFields: {
          create: customFields?.map((field) => ({
            fieldName: field.name,
            fieldValue: field.value,
          })),
        },
      },
      include: {
        sale: {
          include: {
            saleItems: {
              include: {
                product: true,
              },
            },
          },
        },
        customer: true,
        business: true,
        customFields: true,
      },
    });

    return invoice;
  }

  async getInvoice(id: string): Promise<Invoice> {
    const prisma = await this.tenantContext.getPrismaClient();

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        sale: {
          include: {
            saleItems: {
              include: {
                product: true,
              },
            },
          },
        },
        customer: true,
        business: true,
        customFields: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async getInvoicesByStore(storeId: string): Promise<Invoice[]> {
    const prisma = await this.tenantContext.getPrismaClient();

    return prisma.invoice.findMany({
      where: { sale: { storeId } },
      include: {
        sale: {
          include: {
            saleItems: {
              include: {
                product: true,
              },
            },
          },
        },
        customer: true,
        business: true,
        customFields: true,
      },
    });
  }
}
