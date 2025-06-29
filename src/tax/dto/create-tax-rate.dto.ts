import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaxRateType } from '@prisma/client';

export class CreateTaxRateDto {
  @ApiProperty({
    example: 0.18,
    description: 'Tax rate as a decimal (e.g., 0.18 for 18%) or fixed amount (e.g., 5.00 for $5)',
  })
  @IsNumber()
  @IsNotEmpty()
  rate: number;

  @ApiPropertyOptional({
    enum: TaxRateType,
    default: TaxRateType.PERCENTAGE,
    description: 'Type of tax rate - PERCENTAGE or FIXED_AMOUNT',
  })
  @IsEnum(TaxRateType)
  @IsOptional()
  rateType?: TaxRateType = TaxRateType.PERCENTAGE;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Effective from date',
  })
  @IsDateString()
  @IsNotEmpty()
  effectiveFrom: string;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.000Z',
    description: 'Effective to date (optional)',
  })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiProperty({ example: 'regionId', description: 'ID of the region' })
  @IsString()
  @IsNotEmpty()
  regionId: string;

  @ApiProperty({ example: 'taxTypeId', description: 'ID of the tax type' })
  @IsString()
  @IsNotEmpty()
  taxTypeId: string;

  @ApiProperty({ example: 'taxCodeId', description: 'ID of the tax code' })
  @IsString()
  @IsNotEmpty()
  taxCodeId: string;
}
