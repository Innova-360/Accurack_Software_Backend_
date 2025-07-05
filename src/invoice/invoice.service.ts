import { Invoice } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { generate } from 'qrcode';
import { businessInfoDto, CreateInvoiceDto } from './dto/invoice.dto';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';

interface User {
  businessId: string;
  business: {
    logoUrl?: string;
  };
}

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaClientService, // Keep for fallback/master DB operations
    private readonly tenantContext: TenantContextService, // Add tenant context
  ) {
    console.log(
      'InvoiceService initialized with tenantContext:',
      tenantContext,
    );
  }

  async setBusinessInfo(storeId: string, dto: businessInfoDto, user: any) {
    const prisma = await this.tenantContext.getPrismaClient();
    const { businessName, contactNo, website, address, logoUrl } = dto;

    try {
      // Check if business already exists for this client (clientId is unique in the model)
      const existingBusiness = await prisma.business.findUnique({
        where: { clientId: user.clientId },
      });

      if (existingBusiness) {
        return {
          message: 'Business information already set for this client.',
          data: existingBusiness,
        };
      }

      const createdBusiness = await prisma.business.create({
        data: {
          clientId: user.clientId,
          businessName,
          contactNo,
          website,
          address,
          logoUrl,
        },
      });

      return {
        message: 'Business information saved successfully.',
        data: createdBusiness,
      };
    } catch (error) {
      console.error('Error setting business info:', error);

      // Handle known Prisma constraint errors
      if (error.code === 'P2002') {
        return {
          message: 'Business info already exists for this client.',
          data: null,
        };
      }

      throw new Error(
        'An error occurred while saving business information: ' +
          (error.message || 'Unknown error'),
      );
    }
  }

  async createInvoice(dto: CreateInvoiceDto, user: User): Promise<Invoice> {
    const prisma = await this.tenantContext.getPrismaClient();
    const { saleId, customFields } = dto;
    const { businessId } = user;
    if (!businessId) {
      throw new NotFoundException('Business ID not found for user');
    }
    const { logoUrl } = user.business || {};
    if (!logoUrl) {
      throw new NotFoundException('Logo URL not found for business');
    }

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
        cashierName: sale.cashierName || 'nan',
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
