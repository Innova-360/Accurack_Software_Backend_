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

export class businessInfoDto {
  @ApiProperty({ example: 'abcaas', description: 'Business name for the invoice' })
  @IsString()
  businessName: string;

  @ApiProperty({ example: '56788989', description: 'Business contactNo' })
  @IsString()
  contactNo: string;

  @ApiProperty({ example: 'abcaas', description: 'Business website' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ example: 'abcaas', description: 'Business address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'Optional logo URL for the invoice' })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateBusinessInfoDto {
  @ApiPropertyOptional({ example: 'Updated Business Name', description: 'Updated business name' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ example: '987654321', description: 'Updated business contact number' })
  @IsOptional()
  @IsString()
  contactNo?: string;

  @ApiPropertyOptional({ example: 'https://updated-website.com', description: 'Updated business website' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: '456 New Street, Updated City', description: 'Updated business address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'https://example.com/new-logo.png', description: 'Updated logo URL for the business' })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ example: 'Updated Customer Name', description: 'Updated customer name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: '+1-555-0123', description: 'Updated customer phone' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'customer@example.com', description: 'Updated customer email' })
  @IsOptional()
  @IsString()
  customerMail?: string;

  @ApiPropertyOptional({ example: 'https://customer.com', description: 'Updated customer website' })
  @IsOptional()
  @IsString()
  customerWebsite?: string;

  @ApiPropertyOptional({ example: '123 Customer St, City, State', description: 'Updated customer address' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional({ example: '456 Shipping Ave, City, State', description: 'Updated shipping address' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'Updated logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    type: [CustomFieldDto],
    description: 'Updated custom fields for the invoice',
    example: [
      { name: 'VAT Number', value: '987654321' },
      { name: 'PO Number', value: 'PO-2025-002' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  customFields?: CustomFieldDto[];
}