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

  // Alias method for controller consistency
  async submitDraft(draftId: string, dto: SubmitDraftDto, user: User) {
    return this.submitForApproval(draftId, dto, user);
  }

  async approveDraft(draftId: string, dto: ApproveDraftDto, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    // 1. Get and validate draft
    const draft = await this.getDraft(draftId, user);
    this.validateDraftApprovable(draft);

    // 2. Update draft status to approved
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

    // TODO: Create invoice from approved draft
    // This will be implemented when integrating with the invoice service
    
    return {
      message: 'Draft approved successfully',
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
        storeId: invoice.sale.storeId,
        originalInvoiceId: invoice.id,
        draftNumber,
        version: 1,
        status: DraftStatus.DRAFT,
        notes: dto.notes,
        customerId: invoice.customerId,
        totalAmount: invoice.totalAmount,
        netAmount: invoice.netAmount,
        tax: invoice.tax,
        paymentMethod: invoice.paymentMethod,
        cashierName: invoice.cashierName,
        shippingAddress: invoice.shippingAddress,
        logoUrl: invoice.logoUrl,
        userId: user.id,
        clientId: user.clientId,
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

  async finalizeDraft(draftId: string, dto: ApproveDraftDto, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    try {
      // 1. Get and validate draft
      const draft = await this.getDraft(draftId, user);
      
      // Log current status for debugging
      console.log(`[FinalizeDraft] Draft ${draftId} current status: ${draft.status}`);
      
      // Simple validation: only allow DRAFT status
      if (draft.status !== DraftStatus.DRAFT) {
        if (draft.status === DraftStatus.APPROVED) {
          throw new BadRequestException(
            'This draft has already been finalized and an invoice was created. Check your invoices list.'
          );
        }
        
        throw new BadRequestException(
          `Cannot finalize draft with status ${draft.status}. Only drafts with DRAFT status can be finalized.`
        );
      }

      // 2. Create invoice from draft
      const { InvoiceService } = await import('../invoice/invoice.service');
      const invoiceService = new InvoiceService(this.prisma, this.tenantContext);
      
      console.log(`[FinalizeDraft] Creating invoice from draft ${draftId}`);
      const invoice = await invoiceService.createInvoiceFromDraft(draft, user);
      console.log(`[FinalizeDraft] Invoice created: ${invoice?.id || 'N/A'}`);

      // 3. Update draft status to approved
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

      console.log(`[FinalizeDraft] Draft ${draftId} finalized successfully`);

      return {
        message: 'Invoice created successfully from draft',
        draft: updatedDraft,
        invoice: invoice,
      };
    } catch (error) {
      console.error('Error finalizing draft:', error);
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(
        'Failed to create invoice from draft: ' + (error.message || 'Unknown error')
      );
    }
  }

  async getDraftStatus(draftId: string, user: User) {
    const draft = await this.getDraft(draftId, user);
    
    const availableActions = this.getAvailableActions(draft.status);
    
    return {
      draftId: draft.id,
      currentStatus: draft.status,
      availableActions,
      statusDescription: this.getStatusDescription(draft.status),
    };
  }

  private getAvailableActions(status: DraftStatus): string[] {
    switch (status) {
      case DraftStatus.DRAFT:
        return ['edit', 'delete', 'submit', 'finalize'];
      case DraftStatus.PENDING_APPROVAL:
        return ['approve', 'reject', 'view'];
      case DraftStatus.APPROVED:
        return ['view', 'convert-to-new-draft'];
      case DraftStatus.REJECTED:
        return ['edit', 'delete', 'resubmit', 'view'];
      default:
        return ['view'];
    }
  }

  private getStatusDescription(status: DraftStatus): string {
    switch (status) {
      case DraftStatus.DRAFT:
        return 'Draft is ready for editing or finalization';
      case DraftStatus.PENDING_APPROVAL:
        return 'Draft is waiting for approval';
      case DraftStatus.APPROVED:
        return 'Draft has been approved and invoice created';
      case DraftStatus.REJECTED:
        return 'Draft was rejected and needs revisions';
      default:
        return `Draft has ${status} status`;
    }
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
      const statusMessage = draft.status === DraftStatus.PENDING_APPROVAL
        ? 'Draft is already pending approval.'
        : draft.status === DraftStatus.APPROVED
        ? 'Draft is already approved.'
        : draft.status === DraftStatus.REJECTED
        ? 'Draft was rejected. Revert to DRAFT status first.'
        : `Draft has ${draft.status} status.`;
      
      throw new BadRequestException(
        `Only drafts with DRAFT status can be submitted for approval. ${statusMessage}`
      );
    }
  }

  private validateDraftApprovable(draft: any) {
    if (draft.status !== DraftStatus.PENDING_APPROVAL) {
      const statusMessage = draft.status === DraftStatus.DRAFT 
        ? 'Draft has DRAFT status. Use the /finalize endpoint to create an invoice directly, or submit the draft for approval first.'
        : `Draft has ${draft.status} status.`;
      
      throw new BadRequestException(
        `Only drafts with PENDING_APPROVAL status can be approved or rejected. ${statusMessage}`
      );
    }
  }
}
