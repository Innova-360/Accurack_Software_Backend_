import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsEnum,
  IsDate,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaymentMethod, DraftStatus } from '@prisma/client';

export class CustomFieldDto {
  @ApiProperty({ example: 'VAT Number', description: 'Custom field name' })
  @IsString()
  name: string;

  @ApiProperty({ example: '123456789', description: 'Custom field value' })
  @IsString()
  value: string;
}

export class CreateInvoiceDraftDto {
  @ApiProperty({
    example: 'store-uuid-123',
    description: 'Store ID for which to create the draft',
  })
  @IsString()
  storeId: string;

  @ApiPropertyOptional({
    example: 'Draft invoice notes',
    description: 'Optional notes for the draft',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: '2025-01-15T00:00:00Z',
    description: 'Due date for the invoice',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({
    example: 'Custom shipping address',
    description: 'Shipping address for the invoice',
  })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    description: 'Logo URL for the invoice',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: 'customer-uuid-123',
    description: 'Customer ID for the invoice',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    example: 1500.0,
    description: 'Total amount for the invoice',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({
    example: 1400.0,
    description: 'Net amount for the invoice',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  netAmount?: number;

  @ApiPropertyOptional({
    example: 100.0,
    description: 'Tax amount for the invoice',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
    description: 'Payment method for the invoice',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    example: 'John Smith',
    description: 'Cashier name for the invoice',
  })
  @IsOptional()
  @IsString()
  cashierName?: string;

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

export class UpdateInvoiceDraftDto {
  @ApiPropertyOptional({
    example: 'Updated draft notes',
    description: 'Updated notes for the draft',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: '2025-01-20T00:00:00Z',
    description: 'Updated due date for the invoice',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({
    example: 'Updated shipping address',
    description: 'Updated shipping address for the invoice',
  })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/new-logo.png',
    description: 'Updated logo URL for the invoice',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: 'customer-uuid-456',
    description: 'Updated customer ID for the invoice',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    example: 1600.0,
    description: 'Updated total amount for the invoice',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({
    example: 1500.0,
    description: 'Updated net amount for the invoice',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  netAmount?: number;

  @ApiPropertyOptional({
    example: 100.0,
    description: 'Updated tax amount for the invoice',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
    description: 'Updated payment method for the invoice',
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    example: 'Jane Doe',
    description: 'Updated cashier name for the invoice',
  })
  @IsOptional()
  @IsString()
  cashierName?: string;

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

export class GetDraftsDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Number of items per page',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: DraftStatus,
    example: DraftStatus.DRAFT,
    description: 'Filter by draft status',
  })
  @IsOptional()
  @IsEnum(DraftStatus)
  status?: DraftStatus;

  @ApiPropertyOptional({
    example: 'store-uuid-123',
    description: 'Filter by store ID',
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({
    example: 'customer-uuid-123',
    description: 'Filter by customer ID',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    example: '2025-01-01T00:00:00Z',
    description: 'Filter from date (ISO string)',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateFrom?: Date;

  @ApiPropertyOptional({
    example: '2025-01-31T23:59:59Z',
    description: 'Filter to date (ISO string)',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateTo?: Date;

  @ApiPropertyOptional({
    example: 'DRAFT-2025',
    description: 'Search in customer name or draft number',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class SubmitDraftDto {
  @ApiPropertyOptional({
    example: 'Ready for review',
    description: 'Optional notes for submission',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveDraftDto {
  @ApiPropertyOptional({
    example: 'Approved for invoice creation',
    description: 'Optional notes for approval',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectDraftDto {
  @ApiProperty({
    example: 'Missing required information',
    description: 'Reason for rejection',
  })
  @IsString()
  reason: string;
}

export class ConvertToDraftDto {
  @ApiPropertyOptional({
    example: 'Converting to draft for review',
    description: 'Optional notes for conversion',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
