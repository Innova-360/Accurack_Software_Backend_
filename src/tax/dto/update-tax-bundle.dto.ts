import { PartialType } from '@nestjs/swagger';
import { CreateTaxTypeDto } from './create-tax-type.dto';
import { UpdateTaxTypeDto } from './update-tax-type.dto';
import { CreateTaxCodeDto } from './create-tax-code.dto';
import { UpdateTaxCodeDto } from './update-tax-code.dto';
import { CreateTaxRateDto } from './create-tax-rate.dto';
import { UpdateTaxRateDto } from './update-tax-rate.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTaxBundleDto {
  @ApiProperty({ type: UpdateTaxTypeDto })
  taxType: UpdateTaxTypeDto;

  @ApiProperty({ type: UpdateTaxCodeDto })
  taxCode: UpdateTaxCodeDto;

  @ApiProperty({ type: UpdateTaxRateDto })
  taxRate: UpdateTaxRateDto;
}
