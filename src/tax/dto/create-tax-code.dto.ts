import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaxCodeDto {
  @ApiProperty({ example: 'TX001', description: 'Unique code for the tax' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    example: 'Standard VAT code',
    description: 'Description of the tax code',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 'taxTypeId',
    description: 'ID of the related tax type',
  })
  @IsString()
  @IsNotEmpty()
  taxTypeId: string;
}
