import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DraftStatus, Prisma } from '@prisma/client';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import {
  CreateInvoiceDraftDto,
  UpdateInvoiceDraftDto,
  GetDraftsDto,
  SubmitDraftDto,
  ApproveDraftDto,
  RejectDraftDto,
  ConvertToDraftDto,
} from './dto/invoice-draft.dto';
import { InvoiceDraftVersionService } from './invoice-draft-version.service';

interface User {
  id: string;
  clientId: string;
  businessId?: string;
}

@Injectable()
export class InvoiceDraftService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly tenantContext: TenantContextService,
    private readonly versionService: InvoiceDraftVersionService,
  ) {}

  async createDraft(dto: CreateInvoiceDraftDto, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    // 1. Validate store exists and user has access
    const store = await this.validateStoreAccess(dto.storeId, user);

    // 2. Generate draft number
    const draftNumber = await this.generateDraftNumber(dto.storeId, prisma);

    // 3. Validate customer if provided
    if (dto.customerId) {
      await this.validateCustomerAccess(dto.customerId, user, prisma);
    }

    // 4. Create draft data
    const draftData: Prisma.InvoiceDraftCreateInput = {
      draftNumber,
      version: 1,
      status: DraftStatus.DRAFT,
      notes: dto.notes,
      dueDate: dto.dueDate,
      shippingAddress: dto.shippingAddress,
      logoUrl: dto.logoUrl,
      totalAmount: dto.totalAmount,
      netAmount: dto.netAmount,
      tax: dto.tax,
      paymentMethod: dto.paymentMethod,
      cashierName: dto.cashierName,
      store: { connect: { id: dto.storeId } },
      user: { connect: { id: user.id } },
      ...(user.clientId && { client: { connect: { id: user.clientId } } }),
      ...(dto.customerId && { customer: { connect: { id: dto.customerId } } }),
    };

    // 5. Create draft with custom fields
    const draft = await prisma.invoiceDraft.create({
      data: {
        ...draftData,
        customFields: {
          create: dto.customFields?.map((field) => ({
            fieldName: field.name,
            fieldValue: field.value,
          })) || [],
        },
      },
      include: {
        store: true,
        customer: true,
        customFields: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return draft;
  }

  async getDrafts(dto: GetDraftsDto, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();
    const { page = 1, limit = 20, status, storeId, customerId, dateFrom, dateTo, search } = dto;

    const where: Prisma.InvoiceDraftWhereInput = {
      clientId: user.clientId,
      ...(status && { status }),
      ...(storeId && { storeId }),
      ...(customerId && { customerId }),
      ...(dateFrom && dateTo && {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      }),
      ...(search && {
        OR: [
          { draftNumber: { contains: search, mode: 'insensitive' } },
          { customer: { customerName: { contains: search, mode: 'insensitive' } } },
          { notes: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [drafts, total] = await Promise.all([
      prisma.invoiceDraft.findMany({
        where,
        include: {
          store: { select: { id: true, name: true } },
          customer: { select: { id: true, customerName: true, phoneNumber: true } },
          customFields: true,
          user: { select: { id: true, firstName: true, lastName: true } },
          submittedByUser: { select: { id: true, firstName: true, lastName: true } },
          approvedByUser: { select: { id: true, firstName: true, lastName: true } },
          rejectedByUser: { select: { id: true, firstName: true, lastName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoiceDraft.count({ where }),
    ]);

    return {
      drafts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDraft(draftId: string, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    const draft = await prisma.invoiceDraft.findFirst({
      where: {
        id: draftId,
        clientId: user.clientId,
      },
      include: {
        store: true,
        customer: true,
        customFields: true,
        originalInvoice: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        submittedByUser: { select: { id: true, firstName: true, lastName: true } },
        approvedByUser: { select: { id: true, firstName: true, lastName: true } },
        rejectedByUser: { select: { id: true, firstName: true, lastName: true } },
        versions: {
          orderBy: { version: 'desc' },
          include: {
            createdByUser: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    return draft;
  }

  async updateDraft(draftId: string, dto: UpdateInvoiceDraftDto, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    // 1. Get current draft
    const currentDraft = await this.getDraft(draftId, user);

    // 2. Validate draft can be updated
    this.validateDraftUpdateable(currentDraft);

    // 3. Validate customer if provided
    if (dto.customerId && dto.customerId !== currentDraft.customerId) {
      await this.validateCustomerAccess(dto.customerId, user, prisma);
    }

    // 4. Create version snapshot
    await this.versionService.createVersionSnapshot(currentDraft, user);

    // 5. Update draft with new version
    const updatedDraft = await prisma.invoiceDraft.update({
      where: { id: draftId },
      data: {
        version: currentDraft.version + 1,
        notes: dto.notes !== undefined ? dto.notes : currentDraft.notes,
        dueDate: dto.dueDate !== undefined ? dto.dueDate : currentDraft.dueDate,
        shippingAddress: dto.shippingAddress !== undefined ? dto.shippingAddress : currentDraft.shippingAddress,
        logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : currentDraft.logoUrl,
        customerId: dto.customerId !== undefined ? dto.customerId : currentDraft.customerId,
        totalAmount: dto.totalAmount !== undefined ? dto.totalAmount : currentDraft.totalAmount,
        netAmount: dto.netAmount !== undefined ? dto.netAmount : currentDraft.netAmount,
        tax: dto.tax !== undefined ? dto.tax : currentDraft.tax,
        paymentMethod: dto.paymentMethod !== undefined ? dto.paymentMethod : currentDraft.paymentMethod,
        cashierName: dto.cashierName !== undefined ? dto.cashierName : currentDraft.cashierName,
        updatedAt: new Date(),
      },
      include: {
        store: true,
        customer: true,
        customFields: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // 6. Update custom fields if provided
    if (dto.customFields !== undefined) {
      // Delete existing custom fields
      await prisma.invoiceDraftCustomField.deleteMany({
        where: { draftId },
      });

      // Create new custom fields
      if (dto.customFields.length > 0) {
        await prisma.invoiceDraftCustomField.createMany({
          data: dto.customFields.map((field) => ({
            draftId,
            fieldName: field.name,
            fieldValue: field.value,
          })),
        });
      }

      // Refetch with updated custom fields
      return this.getDraft(draftId, user);
    }

    return updatedDraft;
  }

  async deleteDraft(draftId: string, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    // 1. Validate draft exists and user has access
    const draft = await this.getDraft(draftId, user);

    // 2. Validate draft can be deleted
    this.validateDraftDeletable(draft);

    // 3. Delete draft (cascade will handle custom fields and versions)
    await prisma.invoiceDraft.delete({
      where: { id: draftId },
    });

    return { message: 'Draft deleted successfully' };
  }

  async submitForApproval(draftId: string, dto: SubmitDraftDto, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    // 1. Get and validate draft
    const draft = await this.getDraft(draftId, user);
    this.validateDraftSubmittable(draft);

    // 2. Update draft status
    const updatedDraft = await prisma.invoiceDraft.update({
      where: { id: draftId },
      data: {
        status: DraftStatus.PENDING_APPROVAL,
        submittedForApprovalAt: new Date(),
        submittedBy: user.id,
        ...(dto.notes && { notes: dto.notes }),
      },
      include: {
        store: true,
        customer: true,
        customFields: true,
        submittedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return {
      message: 'Draft submitted for approval',
      draft: updatedDraft,
    };
  }

  async rejectDraft(draftId: string, dto: RejectDraftDto, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    // 1. Get and validate draft
    const draft = await this.getDraft(draftId, user);
    this.validateDraftApprovable(draft);

    // 2. Update draft status
    const updatedDraft = await prisma.invoiceDraft.update({
      where: { id: draftId },
      data: {
        status: DraftStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedBy: user.id,
        rejectionReason: dto.reason,
      },
      include: {
        store: true,
        customer: true,
        customFields: true,
        rejectedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return {
      message: 'Draft rejected',
      draft: updatedDraft,
    };
  }

  async convertInvoiceToDraft(invoiceId: string, dto: ConvertToDraftDto, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    // 1. Get existing invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId },
      include: {
        customFields: true,
        sale: { include: { store: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.isConverted) {
      throw new BadRequestException('Invoice has already been converted to draft');
    }

    // 2. Mark invoice as converted
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { isConverted: true },
    });

    // 3. Generate draft number
    const draftNumber = await this.generateDraftNumber(invoice.sale.storeId, prisma);

    // 4. Create draft with invoice data
    const draft = await prisma.invoiceDraft.create({
      data: {
        draftNumber,
        version: 1,
        status: DraftStatus.DRAFT,
        notes: dto.notes,
        totalAmount: invoice.totalAmount,
        netAmount: invoice.netAmount,
        tax: invoice.tax,
        paymentMethod: invoice.paymentMethod,
        cashierName: invoice.cashierName,
        shippingAddress: invoice.shippingAddress,
        logoUrl: invoice.logoUrl,
        store: { connect: { id: invoice.sale.storeId } },
        originalInvoice: { connect: { id: invoice.id } },
        user: { connect: { id: user.id } },
        ...(user.clientId && { client: { connect: { id: user.clientId } } }),
        ...(invoice.customerId && { customer: { connect: { id: invoice.customerId } } }),
        customFields: {
          create: invoice.customFields.map((field) => ({
            fieldName: field.fieldName,
            fieldValue: field.fieldValue,
          })),
        },
      },
      include: {
        store: true,
        customer: true,
        customFields: true,
        originalInvoice: true,
      },
    });

    return {
      message: 'Invoice converted to draft successfully',
      draft,
    };
  }

  async approveDraft(draftId: string, dto: ApproveDraftDto, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    // 1. Get and validate draft
    const draft = await this.getDraft(draftId, user);
    this.validateDraftApprovable(draft);

    // 2. Check if user has business information (required for invoice creation)
    const userWithBusiness = await prisma.users.findFirst({
      where: { id: user.id },
      include: { business: true },
    });

    if (!userWithBusiness || !userWithBusiness.businessId) {
      throw new BadRequestException({
        message: 'Please fill in all required business details to continue. Business name, contact number, and address are mandatory.',
        showBusinessForm: true,
        requiredFields: ['businessName', 'contactNo', 'address'],
        error: 'BUSINESS_INFO_REQUIRED',
      });
    }

    // 3. Create a sale first (invoice creation requires a sale)
    // For drafts without customers, we'll need to handle this case
    if (!draft.customerId) {
      throw new BadRequestException('Cannot approve draft without a customer. Please assign a customer to the draft first.');
    }

    const sale = await prisma.sales.create({
      data: {
        storeId: draft.storeId,
        customerId: draft.customerId,
        totalAmount: draft.totalAmount || 0,
        tax: draft.tax || 0,
        paymentMethod: draft.paymentMethod || 'CASH',
        cashierName: draft.cashierName || 'System',
        status: 'COMPLETED',
        allowance: 0,
        quantitySend: 0,
        userId: user.id,
        clientId: user.clientId,
      },
    });

    // 4. Generate QR code for invoice
    const qrCodeData = `Invoice:${sale.id}:${new Date().toISOString()}`;
    const QRCode = require('qrcode');
    const qrCode = await new Promise<string>((resolve, reject) => {
      QRCode.toDataURL(qrCodeData, { width: 128, margin: 1 }, (err: any, url: string) => {
        if (err) reject(err);
        resolve(url);
      });
    });

    // 5. Create invoice from the approved draft
    const invoice = await prisma.invoice.create({
      data: {
        saleId: sale.id,
        customerId: draft.customerId!, // We already validated this exists above
        businessId: userWithBusiness.businessId,
        invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        customerName: draft.customer?.customerName || 'Guest',
        customerPhone: draft.customer?.phoneNumber || '',
        customerMail: draft.customer?.customerMail || undefined,
        customerWebsite: draft.customer?.website || undefined,
        customerAddress: draft.customer?.customerAddress || undefined,
        businessName: userWithBusiness.business?.businessName || '',
        businessContact: userWithBusiness.business?.contactNo || '',
        businessWebsite: userWithBusiness.business?.website || undefined,
        businessAddress: userWithBusiness.business?.address || undefined,
        shippingAddress: draft.shippingAddress || draft.customer?.customerAddress || undefined,
        paymentMethod: draft.paymentMethod || 'CASH',
        totalAmount: draft.totalAmount || 0,
        netAmount: draft.netAmount || 0,
        tax: draft.tax || 0,
        status: 'COMPLETED',
        cashierName: draft.cashierName || 'System',
        logoUrl: draft.logoUrl || userWithBusiness.business?.logoUrl || undefined,
        qrCode,
        customFields: {
          create: draft.customFields?.map((field) => ({
            fieldName: field.fieldName,
            fieldValue: field.fieldValue,
          })) || [],
        },
        originalDraftId: draft.id, // Link the invoice to the draft
      },
      include: {
        sale: true,
        customer: true,
        business: true,
        customFields: true,
      },
    });

    // 6. Update draft status to approved
    const updatedDraft = await prisma.invoiceDraft.update({
      where: { id: draftId },
      data: {
        status: DraftStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: user.id,
      },
      include: {
        store: true,
        customer: true,
        customFields: true,
        approvedByUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return {
      message: 'Draft approved and invoice created successfully',
      draft: updatedDraft,
      invoice,
    };
  }

  // Helper methods
  private async validateStoreAccess(storeId: string, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();
    
    const store = await prisma.stores.findFirst({
      where: {
        id: storeId,
        clientId: user.clientId,
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found or access denied');
    }

    return store;
  }

  private async validateCustomerAccess(customerId: string, user: User, prisma: any) {
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        clientId: user.clientId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found or access denied');
    }

    return customer;
  }

  private async generateDraftNumber(storeId: string, prisma: any): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const count = await prisma.invoiceDraft.count({
      where: {
        storeId,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    });

    return `DRAFT-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }

  private validateDraftUpdateable(draft: any) {
    if (draft.status !== DraftStatus.DRAFT) {
      throw new BadRequestException('Only drafts with DRAFT status can be updated');
    }
  }

  private validateDraftDeletable(draft: any) {
    if (draft.status !== DraftStatus.DRAFT) {
      throw new BadRequestException('Only drafts with DRAFT status can be deleted');
    }
  }

  private validateDraftSubmittable(draft: any) {
    if (draft.status !== DraftStatus.DRAFT) {
      throw new BadRequestException('Only drafts with DRAFT status can be submitted for approval');
    }
  }

  private validateDraftApprovable(draft: any) {
    if (draft.status !== DraftStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only drafts with PENDING_APPROVAL status can be approved or rejected');
    }
  }
}
