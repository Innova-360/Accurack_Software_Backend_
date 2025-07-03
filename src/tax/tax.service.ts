import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantContextService } from '../tenant/tenant-context.service';
import {
  CreateTaxTypeDto,
  UpdateTaxTypeDto,
  CreateTaxCodeDto,
  UpdateTaxCodeDto,
  CreateRegionDto,
  UpdateRegionDto,
  CreateTaxRateDto,
  UpdateTaxRateDto,
  CreateTaxAssignmentDto,
  UpdateTaxAssignmentDto,
  CreateTaxBundleDto,
  BulkAssignTaxDto,
  AssignTaxDto,
} from './dto';
import { UpdateTaxBundleDto } from './dto/update-tax-bundle.dto';
import { EntityType } from '@prisma/client';

@Injectable()
export class TaxService {
  constructor(private readonly tenantContext: TenantContextService) {}

  // --- TaxType CRUD ---
  async createTaxType(dto: CreateTaxTypeDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxType.create({ data: dto });
  }
  async getAllTaxTypes() {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxType.findMany();
  }
  async getTaxTypeById(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const found = await prisma.taxType.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('TaxType not found');
    return found;
  }
  async updateTaxType(id: string, dto: UpdateTaxTypeDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxType.update({ where: { id }, data: dto });
  }
  async deleteTaxType(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxType.delete({ where: { id } });
  }

  // --- TaxCode CRUD ---
  async createTaxCode(dto: CreateTaxCodeDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxCode.create({ data: dto });
  }
  async getAllTaxCodes() {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxCode.findMany();
  }
  async getTaxCodeById(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const found = await prisma.taxCode.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('TaxCode not found');
    return found;
  }
  async updateTaxCode(id: string, dto: UpdateTaxCodeDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxCode.update({ where: { id }, data: dto });
  }
  async deleteTaxCode(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxCode.delete({ where: { id } });
  }

  // --- Region CRUD ---
  async createRegion(dto: CreateRegionDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.region.create({ data: dto });
  }
  async getAllRegions() {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.region.findMany();
  }
  async getRegionById(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const found = await prisma.region.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Region not found');
    return found;
  }
  async updateRegion(id: string, dto: UpdateRegionDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.region.update({ where: { id }, data: dto });
  }
  async deleteRegion(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.region.delete({ where: { id } });
  }

  // --- TaxRate CRUD ---
  async createTaxRate(dto: CreateTaxRateDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxRate.create({ data: dto });
  }
  async getAllTaxRates() {
    const prisma = await this.tenantContext.getPrismaClient();

    // Step 1: Fetch all tax rates and their assignments
    const taxRates = await prisma.taxRate.findMany({
      select: {
        id: true,
        rate: true,
        rateType: true,
        effectiveFrom: true,
        effectiveTo: true,
        createdAt: true,
        updatedAt: true,
        assignments: {
          select: {
            id: true,
            entityId: true,
            entityType: true,
            assignedAt: true,
          },
        },
        region: {
          select: { id: true, name: true, code: true, description: true },
        },
        taxType: {
          select: { id: true, name: true, description: true, payer: true },
        },
        taxCode: { select: { id: true, code: true, description: true } },
      },
    });

    const allAssignments = taxRates.flatMap((rate) => rate.assignments);
    if (allAssignments.length === 0) {
      return taxRates;
    }

    // Step 2: Group IDs by entity type for efficient batch fetching
    const entityIdsByType = allAssignments.reduce(
      (acc, assignment) => {
        if (!acc[assignment.entityType]) {
          acc[assignment.entityType] = new Set<string>();
        }
        acc[assignment.entityType].add(assignment.entityId);
        return acc;
      },
      {} as Record<EntityType, Set<string>>,
    );

    // Step 3: Fetch all entities in batches and build map with known types
    const entityMap = new Map<string, any>();

    const entityPromises = Object.entries(entityIdsByType).map(
      async ([type, idsSet]) => {
        const ids = Array.from(idsSet);
        if (ids.length === 0) return { type, entities: [] };

        let entities: any[] = [];
        switch (type) {
          case EntityType.PRODUCT:
            entities = await prisma.products.findMany({
              where: { id: { in: ids } },
            });
            break;
          case EntityType.CATEGORY:
            entities = await prisma.category.findMany({
              where: { id: { in: ids } },
            });
            break;
          case EntityType.SUPPLIER:
            entities = await prisma.suppliers.findMany({
              where: { id: { in: ids } },
            });
            break;
          case EntityType.STORE:
            entities = await prisma.stores.findMany({
              where: { id: { in: ids } },
            });
            break;
          case EntityType.CUSTOMER:
            entities = await prisma.customer.findMany({
              where: { id: { in: ids } },
            });
            break;
          default:
            entities = [];
        }
        return { type, entities };
      },
    );

    const entityResults = await Promise.all(entityPromises);

    // Step 4: Build the lookup map using the known entity types
    entityResults.forEach(({ type, entities }) => {
      entities.forEach((entity) => {
        const key = `${type}:${entity.id}`;
        entityMap.set(key, entity);
      });
    });

    // Step 5: Map the fetched entities back to their assignments
    return taxRates.map((rate) => ({
      ...rate,
      assignments: rate.assignments.map((assignment) => {
        const key = `${assignment.entityType}:${assignment.entityId}`;
        return {
          ...assignment,
          entity: entityMap.get(key) || null,
        };
      }),
    }));
  }
  async getTaxRateById(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const found = await prisma.taxRate.findUnique({
      where: { id },
      include: {
        region: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
          },
        },
        taxType: {
          select: {
            id: true,
            name: true,
            description: true,
            payer: true,
          },
        },
        taxCode: {
          select: {
            id: true,
            code: true,
            description: true,
          },
        },
      },
    });
    if (!found) throw new NotFoundException('TaxRate not found');
    return found;
  }
  async updateTaxRate(id: string, dto: UpdateTaxRateDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxRate.update({ where: { id }, data: dto });
  }
  async deleteTaxRate(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxRate.delete({ where: { id } });
  }

  // --- TaxAssignment CRUD ---
  async createTaxAssignment(dto: CreateTaxAssignmentDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxAssignment.create({ data: dto });
  }
  async getAllTaxAssignments() {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxAssignment.findMany();
  }
  async getTaxAssignmentById(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    const found = await prisma.taxAssignment.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('TaxAssignment not found');
    return found;
  }
  async updateTaxAssignment(id: string, dto: UpdateTaxAssignmentDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxAssignment.update({ where: { id }, data: dto });
  }
  async deleteTaxAssignment(id: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    return prisma.taxAssignment.delete({ where: { id } });
  }

  // --- Tax Bundle (Atomic Creation) ---
  /**
   * Atomically creates TaxType, TaxCode, and TaxRate in a single transaction.
   * All entities are linked appropriately. Throws BadRequestException if any step fails.
   * Checks for duplicate TaxType (by name) and TaxCode (by code) before creation.
   */
  async createTaxBundle(dto: CreateTaxBundleDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    // Check for duplicate TaxType by name
    const existingType = await prisma.taxType.findUnique({
      where: { name: dto.taxType.name },
    });
    if (existingType) {
      throw new BadRequestException(
        `TaxType with name '${dto.taxType.name}' already exists.`,
      );
    }
    // Check for duplicate TaxCode by code
    const existingCode = await prisma.taxCode.findUnique({
      where: { code: dto.taxCode.code },
    });
    if (existingCode) {
      throw new BadRequestException(
        `TaxCode with code '${dto.taxCode.code}' already exists.`,
      );
    }
    try {
      return await prisma.$transaction(async (tx) => {
        // Create TaxType
        const taxType = await tx.taxType.create({ data: dto.taxType });
        // Create TaxCode, link to TaxType
        const taxCode = await tx.taxCode.create({
          data: {
            ...dto.taxCode,
            taxTypeId: taxType.id,
          },
        });
        // Create TaxRate, link to TaxCode (and region, if required by your schema)
        const taxRate = await tx.taxRate.create({
          data: {
            ...dto.taxRate,
            taxCodeId: taxCode.id,
          },
        });
        return { taxType, taxCode, taxRate };
      });
    } catch (err) {
      throw new BadRequestException(
        'Failed to create tax bundle: ' + err.message,
      );
    }
  }

  /**
   * Atomically updates TaxType, TaxCode, and TaxRate in a single transaction by TaxCode ID.
   * Fails if any entity is missing.
   */
  async updateTaxBundle(taxCodeId: string, dto: UpdateTaxBundleDto) {
    const prisma = await this.tenantContext.getPrismaClient();
    // Find TaxCode and related TaxType/TaxRate
    const taxCode = await prisma.taxCode.findUnique({
      where: { id: taxCodeId },
    });
    if (!taxCode) throw new NotFoundException('TaxCode not found');
    const taxType = await prisma.taxType.findUnique({
      where: { id: taxCode.taxTypeId },
    });
    if (!taxType) throw new NotFoundException('TaxType not found');
    const taxRate = await prisma.taxRate.findFirst({ where: { taxCodeId } });
    if (!taxRate) throw new NotFoundException('TaxRate not found');
    try {
      return await prisma.$transaction(async (tx) => {
        const updatedTaxType = await tx.taxType.update({
          where: { id: taxType.id },
          data: dto.taxType,
        });
        const updatedTaxCode = await tx.taxCode.update({
          where: { id: taxCodeId },
          data: dto.taxCode,
        });
        const updatedTaxRate = await tx.taxRate.update({
          where: { id: taxRate.id },
          data: dto.taxRate,
        });
        return {
          taxType: updatedTaxType,
          taxCode: updatedTaxCode,
          taxRate: updatedTaxRate,
        };
      });
    } catch (err) {
      throw new BadRequestException(
        'Failed to update tax bundle: ' + err.message,
      );
    }
  }

  /**
   * Atomically deletes TaxRate, TaxCode, and TaxType in a single transaction by TaxCode ID.
   * Fails if any entity is missing.
   */
  async deleteTaxBundle(taxCodeId: string) {
    const prisma = await this.tenantContext.getPrismaClient();
    // Find TaxCode and related TaxType/TaxRate
    const taxCode = await prisma.taxCode.findUnique({
      where: { id: taxCodeId },
    });
    if (!taxCode) throw new NotFoundException('TaxCode not found');
    const taxType = await prisma.taxType.findUnique({
      where: { id: taxCode.taxTypeId },
    });
    if (!taxType) throw new NotFoundException('TaxType not found');
    const taxRate = await prisma.taxRate.findFirst({ where: { taxCodeId } });
    if (!taxRate) throw new NotFoundException('TaxRate not found');
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.taxRate.delete({ where: { id: taxRate.id } });
        await tx.taxCode.delete({ where: { id: taxCodeId } });
        await tx.taxType.delete({ where: { id: taxType.id } });
        return { success: true };
      });
    } catch (err) {
      throw new BadRequestException(
        'Failed to delete tax bundle: ' + err.message,
      );
    }
  }

  /**
   * Bulk assign taxes to multiple entities (product, category, store, supplier, customer) in one call.
   */
  async bulkAssignTaxes(assignments: AssignTaxDto[]) {
    const prisma = await this.tenantContext.getPrismaClient();
    // Validate input: ensure all required fields are present
    if (
      !assignments ||
      !Array.isArray(assignments) ||
      assignments.length === 0
    ) {
      throw new BadRequestException('No assignments provided');
    }
    // Create all assignments in a single transaction
    return prisma.taxAssignment.createMany({
      data: assignments.map((a) => ({
        entityType: a.entityType,
        entityId: a.entityId,
        taxRateId: a.taxRateId,
        assignedAt: new Date(),
      })),
    });
  }
}
