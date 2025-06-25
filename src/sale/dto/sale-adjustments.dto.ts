import { IsUUID, IsInt, IsPositive, IsEnum, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdjustmentType, DamageSubCategory } from '@prisma/client';

export class CreateDamageDto {
  @ApiProperty({ description: 'Sale ID' })
  @IsUUID()
  saleId: string;

  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Store ID' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Quantity of damaged items' })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Amount of damage cost' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Type of damage', enum: DamageSubCategory })
  @IsEnum(DamageSubCategory)
  damageSubCategory: DamageSubCategory;

  @ApiPropertyOptional({ description: 'Reason for damage' })
  @IsOptional()
  reason?: string;
}

export class CreateRefundDto {
  @ApiProperty({ description: 'Sale ID' })
  @IsUUID()
  saleId: string;

  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Store ID' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Quantity to refund' })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Refund amount' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Whether to add to revenue' })
  @IsBoolean()
  addToRevenue: boolean;

  @ApiPropertyOptional({ description: 'Reason for refund' })
  @IsOptional()
  reason?: string;
}

export class CreateReturnDto {
  @ApiProperty({ description: 'Sale ID' })
  @IsUUID()
  saleId: string;

  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Store ID' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Quantity to return' })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Return amount' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Whether to add back to inventory' })
  @IsBoolean()
  addToInventory: boolean;

  @ApiPropertyOptional({ description: 'Reason for return' })
  @IsOptional()
  reason?: string;
}

export class CreateExchangeDto {
  @ApiProperty({ description: 'Sale ID' })
  @IsUUID()
  saleId: string;

  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Store ID' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Quantity to exchange' })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Exchange amount' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Replacement product ID' })
  @IsUUID()
  replacementProductId: string;

  @ApiPropertyOptional({ description: 'Reason for exchange' })
  @IsOptional()
  reason?: string;
}