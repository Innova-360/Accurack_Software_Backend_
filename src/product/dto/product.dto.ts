import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, Min, IsInt } from "class-validator";

export class CreateProductDto {
  @ApiProperty({ 
    description: 'Product name', 
    example: 'Premium Coffee Beans' 
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ 
    description: 'Product description', 
    example: 'High-quality Arabica coffee beans from Colombia' 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ 
    description: 'Stock keeping unit (SKU)', 
    example: 'COFFEE-001' 
  })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional({ 
    description: 'Product barcode', 
    example: '1234567890123' 
  })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({ 
    description: 'Selling price of the product', 
    example: 29.99 
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({ 
    description: 'Cost price of the product', 
    example: 19.99 
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice: number;

  @ApiProperty({ 
    description: 'Initial quantity in stock', 
    example: 100 
  })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ 
    description: 'Store ID where the product belongs', 
    example: 'uuid-store-id' 
  })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  // Purchase Order related fields
  @ApiProperty({ 
    description: 'Supplier ID for initial purchase order', 
    example: 'uuid-supplier-id' 
  })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

  @ApiPropertyOptional({ 
    description: 'Purchase quantity for initial order', 
    example: 50 
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  purchaseQuantity?: number;

  @ApiPropertyOptional({ 
    description: 'Purchase price per unit', 
    example: 18.99 
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  purchasePrice?: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({ 
    description: 'Supplier ID for purchase order (optional for updates)', 
  })
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ 
    description: 'Purchase quantity (optional for updates)', 
  })
  @IsOptional()
  purchaseQuantity?: number;

  @ApiPropertyOptional({ 
    description: 'Purchase price (optional for updates)', 
  })
  @IsOptional()
  purchasePrice?: number;
}

export class ProductResponseDto {
  @ApiProperty({ description: 'Product ID', example: 'uuid-product-id' })
  id: string;

  @ApiProperty({ description: 'Product name', example: 'Premium Coffee Beans' })
  name: string;

  @ApiPropertyOptional({ description: 'Product description' })
  description?: string;

  @ApiProperty({ description: 'Product SKU', example: 'COFFEE-001' })
  sku: string;

  @ApiPropertyOptional({ description: 'Product barcode' })
  barcode?: string;

  @ApiProperty({ description: 'Selling price', example: 29.99 })
  price: number;

  @ApiProperty({ description: 'Cost price', example: 19.99 })
  costPrice: number;

  @ApiProperty({ description: 'Current quantity', example: 100 })
  quantity: number;

  @ApiProperty({ description: 'Client ID', example: 'uuid-client-id' })
  clientId: string;

  @ApiProperty({ description: 'Store ID', example: 'uuid-store-id' })
  storeId: string;

  @ApiProperty({ description: 'Product status', example: 'active' })
  status: string;

  @ApiProperty({ description: 'Creation date', example: '2025-06-18T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date', example: '2025-06-18T10:30:00.000Z' })
  updatedAt: Date;
}

// Inventory related DTOs
export class InventoryEntryDto {
  @ApiProperty({ description: 'Product ID', example: 'uuid-product-id' })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Store ID', example: 'uuid-store-id' })
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ description: 'Quantity change', example: 10 })
  @IsInt()
  quantity: number;

  @ApiProperty({ description: 'Entry type', example: 'purchase' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({ description: 'Notes about the entry', example: 'Initial stock' })
  @IsString()
  @IsOptional()
  notes?: string;
}
