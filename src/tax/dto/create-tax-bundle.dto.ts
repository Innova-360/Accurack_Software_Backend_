import {
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTaxTypeDto } from './create-tax-type.dto';
import { CreateTaxCodeDto } from './create-tax-code.dto';
import { CreateTaxRateDto } from './create-tax-rate.dto';

export class CreateTaxBundleDto {
  @ApiProperty({ type: CreateTaxTypeDto })
  @ValidateNested()
  @Type(() => CreateTaxTypeDto)
  taxType: CreateTaxTypeDto;

  @ApiProperty({ type: CreateTaxCodeDto })
  @ValidateNested()
  @Type(() => CreateTaxCodeDto)
  taxCode: CreateTaxCodeDto;

  @ApiProperty({ type: CreateTaxRateDto })
  @ValidateNested()
  @Type(() => CreateTaxRateDto)
  taxRate: CreateTaxRateDto;
}
