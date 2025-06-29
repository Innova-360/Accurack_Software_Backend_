import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityType } from '@prisma/client';
import { TenantContextService } from '../../tenant/tenant-context.service';
import {
  CalculateTaxByEntityDto,
  CalculateComprehensiveTaxDto,
  TaxCalculationResponseDto,
} from '../dto/calculate-tax.dto';

@Injectable()
export class TaxCalculationService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async calculateTaxByEntity(
    dto: CalculateTaxByEntityDto,
  ): Promise<TaxCalculationResponseDto> {
    const prisma = await this.tenantContext.getPrismaClient();

    const taxAssignments = await prisma.taxAssignment.findMany({
      where: {
        entityType: dto.entityType,
        entityId: dto.entityId,
      },
      include: {
        taxRate: {
          include: {
            taxCode: true,
            taxType: true,
          },
        },
      },
    });

    if (taxAssignments.length === 0) {
      return {
        subtotal: dto.amount,
        taxAmount: 0,
        total: dto.amount,
        effectiveRate: 0,
        entityType: dto.entityType,
        entityId: dto.entityId,
        appliedTaxes: [],
      };
    }

    const totalRate = taxAssignments.reduce(
      (sum, assignment) => sum + assignment.taxRate.rate,
      0,
    );
    const taxAmount = dto.amount * totalRate * (dto.quantity || 1);

    return {
      subtotal: dto.amount * (dto.quantity || 1),
      taxAmount,
      total: dto.amount * (dto.quantity || 1) + taxAmount,
      effectiveRate: totalRate,
      entityType: dto.entityType,
      entityId: dto.entityId,
      appliedTaxes: taxAssignments.map((assignment) => ({
        id: assignment.id,
        entityType: assignment.entityType,
        entityId: assignment.entityId,
        rate: assignment.taxRate.rate,
        taxAmount: dto.amount * assignment.taxRate.rate * (dto.quantity || 1),
        taxCode: assignment.taxRate.taxCode.code,
        taxType: assignment.taxRate.taxType.name,
      })),
    };
  }

  async calculateComprehensiveTax(
    dto: CalculateComprehensiveTaxDto,
  ): Promise<TaxCalculationResponseDto> {
    const prisma = await this.tenantContext.getPrismaClient();

    // Get product with category info
    const product = await prisma.products.findUnique({
      where: { id: dto.productId },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Collect all possible tax assignments
    const entityQueries = [
      { entityType: EntityType.PRODUCT, entityId: dto.productId },
    ] as Array<{ entityType: EntityType; entityId: string }>;

    if (product.categoryId) {
      entityQueries.push({
        entityType: EntityType.CATEGORY,
        entityId: product.categoryId,
      });
    }

    if (dto.storeId) {
      entityQueries.push({
        entityType: EntityType.STORE,
        entityId: dto.storeId,
      });
    }

    if (dto.supplierId) {
      entityQueries.push({
        entityType: EntityType.SUPPLIER,
        entityId: dto.supplierId,
      });
    }

    const taxAssignments = await prisma.taxAssignment.findMany({
      where: {
        OR: entityQueries,
      },
      include: {
        taxRate: {
          include: {
            taxCode: true,
            taxType: true,
          },
        },
      },
    });

    if (taxAssignments.length === 0) {
      return {
        subtotal: dto.amount * (dto.quantity || 1),
        taxAmount: 0,
        total: dto.amount * (dto.quantity || 1),
        effectiveRate: 0,
        appliedTaxes: [],
      };
    }

    // Apply tax precedence: PRODUCT > CATEGORY > STORE > SUPPLIER
    const precedenceOrder = [
      EntityType.PRODUCT,
      EntityType.CATEGORY,
      EntityType.STORE,
      EntityType.SUPPLIER,
    ];
    const applicableTaxes = this.applyTaxPrecedence(
      taxAssignments,
      precedenceOrder,
    );

    const totalRate = applicableTaxes.reduce(
      (sum, assignment) => sum + assignment.taxRate.rate,
      0,
    );
    const lineTotal = dto.amount * (dto.quantity || 1);
    const taxAmount = lineTotal * totalRate;

    return {
      subtotal: lineTotal,
      taxAmount,
      total: lineTotal + taxAmount,
      effectiveRate: totalRate,
      appliedTaxes: applicableTaxes.map((assignment) => ({
        id: assignment.id,
        entityType: assignment.entityType,
        entityId: assignment.entityId,
        rate: assignment.taxRate.rate,
        taxAmount: lineTotal * assignment.taxRate.rate,
        taxCode: assignment.taxRate.taxCode.code,
        taxType: assignment.taxRate.taxType.name,
      })),
    };
  }

  private applyTaxPrecedence(
    taxAssignments: any[],
    precedenceOrder: EntityType[],
  ) {
    // Group by entity type
    const groupedTaxes = taxAssignments.reduce((acc, assignment) => {
      if (!acc[assignment.entityType]) {
        acc[assignment.entityType] = [];
      }
      acc[assignment.entityType].push(assignment);
      return acc;
    }, {});

    // Apply precedence - use highest priority entity type that has taxes
    for (const entityType of precedenceOrder) {
      if (groupedTaxes[entityType] && groupedTaxes[entityType].length > 0) {
        return groupedTaxes[entityType];
      }
    }

    return [];
  }

  async getTaxAssignmentsByEntity(entityType: EntityType, entityId: string) {
    const prisma = await this.tenantContext.getPrismaClient();

    return prisma.taxAssignment.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        taxRate: {
          include: {
            taxCode: true,
            taxType: true,
            region: true,
          },
        },
      },
    });
  }
}
