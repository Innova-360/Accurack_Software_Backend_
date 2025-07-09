import { Invoice } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { businessInfoDto, CreateInvoiceDto } from './dto/invoice.dto';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';

interface User {
  id: string;
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

      // Validate required fields
      if (!businessName || !contactNo) {
        return {
          success: false,
          message:
            'Please fill in all required business details to continue. Business name, contact number are mandatory.',
          showBusinessForm: true,
          requiredFields: ['businessName', 'contactNo'],
          data: null,
        };
      }

      // Create the business record
      const createdBusiness = await prisma.business.create({
        data: {
          clientId: user.clientId,
          businessName,
          contactNo,
          website: website || null,
          address: address || null,
          logoUrl: logoUrl || null,
        },
      });

      // Update the user's businessId in the Users table
      await prisma.users.update({
        where: { id: user.id }, // Assuming user.id is available in the user object
        data: {
          businessId: createdBusiness.id,
        },
      });

      return {
        success: true,
        message: 'Business information saved successfully and user updated.',
        showBusinessForm: false,
        data: createdBusiness,
      };
    } catch (error) {
      console.error('Error setting business info:', error);

      // Handle known Prisma constraint errors
      if (error.code === 'P2002') {
        return {
          success: false,
          message: 'Business info already exists for this client.',
          showBusinessForm: false,
          data: null,
        };
      }

      throw new Error(
        'An error occurred while saving business information: ' +
          (error.message || 'Unknown error'),
      );
    }
  }

  async getBusinessInfo(user: any) {
    const prisma = await this.tenantContext.getPrismaClient();

    try {
      // Check if business exists for this client
      const business = await prisma.business.findUnique({
        where: { clientId: user.clientId },
      });

      if (!business) {
        return {
          success: false,
          message:
            'Please fill in all required business details to continue. Business name, contact number, and address are mandatory.',
          showBusinessForm: true,
          requiredFields: ['businessName', 'contactNo', 'address'],
          data: null,
        };
      }

      return {
        success: true,
        message: 'Business information found.',
        showBusinessForm: false,
        data: business,
      };
    } catch (error) {
      console.error('Error getting business info:', error);
      throw new Error(
        'An error occurred while retrieving business information: ' +
          (error.message || 'Unknown error'),
      );
    }
  }

  async createInvoice(dto: CreateInvoiceDto, user: User): Promise<Invoice> {
    const prisma = await this.tenantContext.getPrismaClient();
    const { saleId, customFields } = dto;
    const { id } = user;

    const userExist = await prisma.users.findFirst({
      where: { id },
    });

    console.log(user);

    // Check if user exists and business information exists first
    if (!userExist || !userExist.businessId) {
      throw new NotFoundException({
        message:
          'Please fill in all required business details to continue. Business name, contact number, and address are mandatory.',
        showBusinessForm: true,
        requiredFields: ['businessName', 'contactNo', 'address'],
        error: 'BUSINESS_INFO_REQUIRED',
      });
    }

    const { logoUrl } = user.business || {};

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
      where: { id: userExist.businessId },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Calculate net amount (totalAmount - allowance)
    const netAmount = sale.totalAmount - (sale.allowance || 0);

    // Generate QR code
    const qrCodeData = `Invoice:${sale.id}:${new Date().toISOString()}`;
    const qrCode = await new Promise<string>((resolve, reject) => {
      QRCode.toDataURL(qrCodeData, { width: 128, margin: 1 }, (err, url) => {
        if (err) reject(err);
        resolve(url);
      });
    });

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        saleId,
        customerId: sale.customerId,
        businessId: userExist.businessId,
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

  async updateBusinessInfo(dto: any, user: any) {
    const prisma = await this.tenantContext.getPrismaClient();

    try {
      // Check if business exists for this client
      const existingBusiness = await prisma.business.findUnique({
        where: { clientId: user.clientId },
      });

      if (!existingBusiness) {
        return {
          success: false,
          message:
            'Business information not found. Please create business details first.',
          showBusinessForm: true,
          data: null,
        };
      }

      // Filter out undefined values to only update provided fields
      const updateData: any = {};
      if (dto.businessName !== undefined)
        updateData.businessName = dto.businessName;
      if (dto.contactNo !== undefined) updateData.contactNo = dto.contactNo;
      if (dto.website !== undefined) updateData.website = dto.website;
      if (dto.address !== undefined) updateData.address = dto.address;
      if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;

      // Check if there's actually anything to update
      if (Object.keys(updateData).length === 0) {
        return {
          success: false,
          message: 'No valid fields provided for update.',
          data: existingBusiness,
        };
      }

      // Update the business record
      const updatedBusiness = await prisma.business.update({
        where: { clientId: user.clientId },
        data: updateData,
      });

      return {
        success: true,
        message: 'Business information updated successfully.',
        showBusinessForm: false,
        data: updatedBusiness,
      };
    } catch (error) {
      console.error('Error updating business info:', error);

      // Handle known Prisma errors
      if (error.code === 'P2025') {
        return {
          success: false,
          message: 'Business information not found.',
          data: null,
        };
      }

      throw new Error(
        'An error occurred while updating business information: ' +
          (error.message || 'Unknown error'),
      );
    }
  }
}
