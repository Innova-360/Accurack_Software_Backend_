import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PayerType } from '@prisma/client';

export class CreateTaxTypeDto {
  @ApiProperty({ example: 'VAT', description: 'Name of the tax type' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Value Added Tax',
    description: 'Description of the tax type',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    enum: PayerType,
    example: PayerType.CUSTOMER,
    description: 'Who pays this tax',
  })
  @IsEnum(PayerType)
  payer: PayerType;
}
