import { Injectable } from '@nestjs/common';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';
import { TenantContextService } from 'src/tenant/tenant-context.service';

interface User {
  id: string;
  clientId: string;
}

@Injectable()
export class InvoiceDraftVersionService {
  constructor(
    private readonly prisma: PrismaClientService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createVersionSnapshot(draft: any, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    // Create version snapshot with current draft data
    const versionData = {
      draftId: draft.id,
      version: draft.version,
      notes: draft.notes,
      dueDate: draft.dueDate,
      shippingAddress: draft.shippingAddress,
      logoUrl: draft.logoUrl,
      customerId: draft.customerId,
      totalAmount: draft.totalAmount,
      netAmount: draft.netAmount,
      tax: draft.tax,
      paymentMethod: draft.paymentMethod,
      cashierName: draft.cashierName,
      customFields: draft.customFields ? JSON.stringify(draft.customFields) : undefined,
      createdBy: user.id,
    };

    // Find the latest version to link as previous
    const latestVersion = await prisma.invoiceDraftVersion.findFirst({
      where: { draftId: draft.id },
      orderBy: { version: 'desc' },
    });

    const version = await prisma.invoiceDraftVersion.create({
      data: {
        ...versionData,
        previousVersionId: latestVersion?.id,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return version;
  }

  async getVersionHistory(draftId: string, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    // Verify draft access
    const draft = await prisma.invoiceDraft.findFirst({
      where: {
        id: draftId,
        clientId: user.clientId,
      },
    });

    if (!draft) {
      throw new Error('Draft not found or access denied');
    }

    const versions = await prisma.invoiceDraftVersion.findMany({
      where: { draftId },
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { version: 'desc' },
    });

    return {
      versions: versions.map((version) => ({
        ...version,
        customFields: version.customFields ? JSON.parse(version.customFields as string) : [],
      })),
    };
  }

  async revertToVersion(draftId: string, versionId: string, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    // Get the draft and version
    const [draft, version] = await Promise.all([
      prisma.invoiceDraft.findFirst({
        where: {
          id: draftId,
          clientId: user.clientId,
        },
        include: { customFields: true },
      }),
      prisma.invoiceDraftVersion.findFirst({
        where: {
          id: versionId,
          draftId,
        },
      }),
    ]);

    if (!draft) {
      throw new Error('Draft not found or access denied');
    }

    if (!version) {
      throw new Error('Version not found');
    }

    if (draft.status !== 'DRAFT') {
      throw new Error('Only drafts with DRAFT status can be reverted');
    }

    // Create snapshot of current state before reverting
    await this.createVersionSnapshot(draft, user);

    // Parse custom fields from version
    const customFields = version.customFields ? JSON.parse(version.customFields as string) : [];

    // Update draft with version data
    const updatedDraft = await prisma.invoiceDraft.update({
      where: { id: draftId },
      data: {
        version: draft.version + 1, // Increment version
        notes: version.notes,
        dueDate: version.dueDate,
        shippingAddress: version.shippingAddress,
        logoUrl: version.logoUrl,
        customerId: version.customerId,
        totalAmount: version.totalAmount,
        netAmount: version.netAmount,
        tax: version.tax,
        paymentMethod: version.paymentMethod,
        cashierName: version.cashierName,
        updatedAt: new Date(),
      },
      include: {
        store: true,
        customer: true,
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

    // Update custom fields
    await prisma.invoiceDraftCustomField.deleteMany({
      where: { draftId },
    });

    if (customFields.length > 0) {
      await prisma.invoiceDraftCustomField.createMany({
        data: customFields.map((field: any) => ({
          draftId,
          fieldName: field.fieldName || field.name,
          fieldValue: field.fieldValue || field.value,
        })),
      });
    }

    // Refetch with updated custom fields
    const finalDraft = await prisma.invoiceDraft.findUnique({
      where: { id: draftId },
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

    return {
      message: `Draft reverted to version ${version.version}`,
      draft: finalDraft,
    };
  }

  async compareVersions(draftId: string, version1Id: string, version2Id: string, user: User) {
    const prisma = await this.tenantContext.getPrismaClient();

    // Verify draft access
    const draft = await prisma.invoiceDraft.findFirst({
      where: {
        id: draftId,
        clientId: user.clientId,
      },
    });

    if (!draft) {
      throw new Error('Draft not found or access denied');
    }

    const [version1, version2] = await Promise.all([
      prisma.invoiceDraftVersion.findFirst({
        where: { id: version1Id, draftId },
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.invoiceDraftVersion.findFirst({
        where: { id: version2Id, draftId },
        include: {
          createdByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    // Compare the versions
    const comparison = {
      version1: {
        ...version1,
        customFields: version1.customFields ? JSON.parse(version1.customFields as string) : [],
      },
      version2: {
        ...version2,
        customFields: version2.customFields ? JSON.parse(version2.customFields as string) : [],
      },
      differences: this.calculateDifferences(version1, version2),
    };

    return comparison;
  }

  private calculateDifferences(version1: any, version2: any) {
    const differences: any[] = [];
    const fields = [
      'notes',
      'dueDate',
      'shippingAddress',
      'logoUrl',
      'customerId',
      'totalAmount',
      'netAmount',
      'tax',
      'paymentMethod',
      'cashierName',
    ];

    fields.forEach((field) => {
      if (version1[field] !== version2[field]) {
        differences.push({
          field,
          version1Value: version1[field],
          version2Value: version2[field],
        });
      }
    });

    // Compare custom fields
    const customFields1 = version1.customFields ? JSON.parse(version1.customFields) : [];
    const customFields2 = version2.customFields ? JSON.parse(version2.customFields) : [];

    if (JSON.stringify(customFields1) !== JSON.stringify(customFields2)) {
      differences.push({
        field: 'customFields',
        version1Value: customFields1,
        version2Value: customFields2,
      });
    }

    return differences;
  }
}
