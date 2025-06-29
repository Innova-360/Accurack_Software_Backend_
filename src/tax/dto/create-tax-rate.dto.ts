import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaxRateDto {
  @ApiProperty({
    example: 0.18,
    description: 'Tax rate as a decimal (e.g., 0.18 for 18%)',
  })
  @IsNumber()
  @IsNotEmpty()
  rate: number;

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
