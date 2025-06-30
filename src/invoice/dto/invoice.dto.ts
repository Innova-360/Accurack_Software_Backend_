import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomFieldDto {
  @ApiProperty({ example: 'VAT Number', description: 'Custom field name' })
  @IsString()
  name: string;

  @ApiProperty({ example: '123456789', description: 'Custom field value' })
  @IsString()
  value: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'sale-uuid-123', description: 'Sale ID for which to generate the invoice' })
  @IsString()
  saleId: string;

  // @ApiProperty({ example: 'business-uuid-456', description: 'Business ID for the invoice' })
  // @IsString()
  // businessId: string;

  // @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'Optional logo URL for the invoice' })
  // @IsOptional()
  // @IsString()
  // logoUrl?: string;

  @ApiPropertyOptional({
    type: [CustomFieldDto],
    description: 'Optional custom fields for the invoice',
    example: [
      { name: 'VAT Number', value: '123456789' },
      { name: 'PO Number', value: 'PO-2025-001' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  customFields?: CustomFieldDto[];
}