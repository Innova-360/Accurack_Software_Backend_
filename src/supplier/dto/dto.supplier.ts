import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateSupplierDto {
  @ApiProperty({ description: 'Unique supplier identifier', example: 'SUP-001' })
  @IsString()
  @IsNotEmpty()
  supplier_id: string;

  @ApiProperty({ description: 'Supplier name', example: 'ABC Suppliers Ltd' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Supplier email address',
    example: 'supplier@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Supplier phone number',
    example: '+1-555-123-4567',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    description: 'Supplier physical address',
    example: '123 Main St, City, State 12345',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'Store ID this supplier belongs to',
    example: 'uuid-store-id',
  })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  storeId: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}

export class SupplierResponseDto {
  @ApiProperty({ description: 'Supplier ID', example: 'uuid-supplier-id' })
  id: string;

  @ApiProperty({ description: 'Unique supplier identifier', example: 'SUP-001' })
  supplier_id: string;

  @ApiProperty({ description: 'Supplier name', example: 'ABC Suppliers Ltd' })
  name: string;

  @ApiPropertyOptional({ description: 'Supplier email', example: 'supplier@example.com' })
  email?: string;

  @ApiProperty({ description: 'Supplier phone', example: '+1-555-123-4567' })
  phone: string;

  @ApiPropertyOptional({ description: 'Supplier address', example: '123 Main St' })
  address?: string;

  @ApiProperty({ description: 'Store ID', example: 'uuid-store-id' })
  storeId: string;

  @ApiProperty({ description: 'Supplier status', example: 'active' })
  status: string;

  @ApiProperty({ description: 'Creation date', example: '2025-06-18T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date', example: '2025-06-18T10:30:00.000Z' })
  updatedAt: Date;
}