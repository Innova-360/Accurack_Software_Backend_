import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityType } from '@prisma/client';
import { IsEnum, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CalculateTaxByEntityDto {
  @ApiProperty({ enum: EntityType, description: 'Type of entity to calculate tax for' })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({ description: 'ID of the entity' })
  @IsString()
  entityId: string;

  @ApiProperty({ description: 'Amount to calculate tax on', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Quantity for calculation', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number = 1;
}

export class CalculateComprehensiveTaxDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Amount to calculate tax on', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Store ID' })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Quantity for calculation', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number = 1;
}

export class TaxCalculationResponseDto {
  @ApiProperty({ description: 'Original amount before tax' })
  subtotal: number;

  @ApiProperty({ description: 'Total tax amount' })
  taxAmount: number;

  @ApiProperty({ description: 'Final total including tax' })
  total: number;

  @ApiProperty({ description: 'Effective tax rate applied' })
  effectiveRate: number;

  @ApiProperty({ description: 'Entity type used for calculation', enum: EntityType })
  entityType?: EntityType;

  @ApiProperty({ description: 'Entity ID used for calculation' })
  entityId?: string;

  @ApiProperty({ description: 'Breakdown of applied taxes', type: 'array' })
  appliedTaxes: {
    id: string;
    entityType: EntityType;
    entityId: string;
    rate: number;
    rateType: string;
    taxAmount: number;
    taxCode: string;
    taxType: string;
  }[];
}