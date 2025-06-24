import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

enum SupplierState {
  primary = 'primary',
  secondary = 'secondary',
}

class ProductSupplierDto {
  @ApiProperty({ example: 'uuid-supplier-id', description: 'ID of the supplier' })
  @IsString()
  supplierId: string;

  @ApiProperty({ example: 19.99, description: 'Cost price from this supplier' })
  @IsNumber()
  costPrice: number;

  @ApiProperty({ example: 'Beverages', description: 'Category for this supplier relationship' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'primary', description: 'Supplier state (primary or secondary)', enum: SupplierState })
  @IsEnum(SupplierState)
  state: SupplierState;
}


class PackDto {
  @ApiProperty({ example: 10, description: 'Minimum quantity that can be sold per pack' })
  @IsNumber()
  minimumSellingQuantity: number;

  @ApiProperty({ example: 50, description: 'Total quantity of packs available' })
  @IsNumber()
  totalPacksQuantity: number;

  @ApiProperty({ example: 18.99, description: 'Price per pack when ordered' })
  @IsNumber()
  orderedPacksPrice: number;

  @ApiProperty({ example: 2.50, description: 'Discount amount applied to the pack' })
  @IsNumber()
  discountAmount: number;

  @ApiProperty({ example: 5, description: 'Percentage discount applied to the pack' })
  @IsNumber()
  percentDiscount: number;
}

class VariantDto {
  @ApiProperty({ example: 'Dark Roast', description: 'Name of the variant' })
  @IsString()
  name: string;

  @ApiProperty({ example: 27.99, description: 'Price of the variant' })
  @IsNumber()
  price: number;
  @ApiProperty({ example: 'UPC123456', description: 'PLU/UPC code of the variant', required: false })
  @IsString()
  @IsOptional()
  pluUpc?: string;

  @ApiProperty({
    type: [PackDto],
    example: [{ minimumSellingQuantity: 10, totalPacksQuantity: 50, orderedPacksPrice: 18.99, percentDiscount: 5 }],
    description: 'Array of packs for this variant when hasVariants is true',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackDto)
  @IsOptional()
  packs?: PackDto[];

  @ApiProperty({
    example: ['uuid-pack-id-1'],
    description: 'Array of pack IDs associated with this variant',
    required: false,
  })
  @IsArray()
  @IsOptional()
  packIds?: string[];
}



export class CreateProductDto {
  @ApiProperty({ example: 'Premium Coffee Beans', description: 'Name of the product' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Beverages', description: 'Category of the product' })
  @IsString()
  category: string;

  @ApiProperty({ example: '1234567890123', description: 'EAN code of the product', required: false })
  @IsString()
  @IsOptional()
  ean?: string;  @ApiProperty({ example: 'UPC123456', description: 'PLU/UPC code of the product', required: false })
  @IsString()
  @IsOptional()
  pluUpc?: string;
  @ApiProperty({ 
    type: [ProductSupplierDto],
    example: [{ supplierId: 'uuid-supplier-id', costPrice: 19.99, category: 'Beverages', state: 'primary' }],
    description: 'Array of suppliers for this product',
    required: false
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSupplierDto)
  @IsOptional()
  productSuppliers?: ProductSupplierDto[];

  @ApiProperty({ example: 'COFFEE-001', description: 'SKU of the product', required: false })
  @IsString()
  @IsOptional()
  sku?: string;
  @ApiProperty({ example: 19.99, description: 'Cost price per single item (from primary supplier)' })
  @IsNumber()
  @IsOptional()
  singleItemCostPrice?: number;

  @ApiProperty({ example: 100, description: 'Quantity of items in stock' })
  @IsNumber()
  itemQuantity: number;

  @ApiProperty({ example: 29.99, description: 'Manufacturer suggested retail price' })
  @IsNumber()
  msrpPrice: number;
  @ApiProperty({ example: 25.99, description: 'Selling price per single item' })
  @IsNumber()
  singleItemSellingPrice: number;

  @ApiProperty({ example: 2.00, description: 'Discount amount applied to the product' })
  @IsNumber()
  discountAmount: number;

  @ApiProperty({ example: 10, description: 'Percentage discount applied to the product' })
  @IsNumber()
  percentDiscount: number;

  @ApiProperty({ example: 'uuid-client-id', description: 'ID of the client' })
  @IsString()
  clientId: string;

  @ApiProperty({ example: 'uuid-store-id', description: 'ID of the store' })
  @IsString()
  storeId: string;

  @ApiProperty({ example: false, description: 'Whether the product has variants' })
  @IsBoolean()
  hasVariants: boolean;
  @ApiProperty({
    type: [PackDto],
    example: [{ minimumSellingQuantity: 10, totalPacksQuantity: 50, orderedPacksPrice: 18.99, discountAmount: 2.50, percentDiscount: 5 }],
    description: 'Array of packs for the product when hasVariants is false',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackDto)
  @IsOptional()
  packs?: PackDto[];

  @ApiProperty({
    type: [VariantDto],
    example: [{ name: 'Dark Roast', price: 27.99, sku: 'COFFEE-001-DR', packs: [{ minimumSellingQuantity: 10, totalPacksQuantity: 50, orderedPacksPrice: 18.99, percentDiscount: 5 }] }],
    description: 'Array of variants for the product when hasVariants is true',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  @IsOptional()
  variants?: VariantDto[];
}

export class UpdateProductDto {
  @ApiProperty({ example: 'Updated Coffee Beans', description: 'Name of the product', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Beverages', description: 'Category of the product', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: '1234567890123', description: 'EAN code of the product', required: false })
  @IsString()
  @IsOptional()
  ean?: string;
  @ApiProperty({ example: 'UPC123456', description: 'PLU/UPC code of the product', required: false })
  @IsString()
  @IsOptional()
  pluUpc?: string;

  @ApiProperty({ 
    type: [ProductSupplierDto],
    example: [{ supplierId: 'uuid-supplier-id', costPrice: 22.99, category: 'Beverages', state: 'primary' }],
    description: 'Array of suppliers for this product',
    required: false
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSupplierDto)
  @IsOptional()
  productSuppliers?: ProductSupplierDto[];

  @ApiProperty({ example: 'COFFEE-001-UPDATED', description: 'SKU of the product', required: false })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ example: 22.99, description: 'Cost price per single item', required: false })
  @IsNumber()
  @IsOptional()
  singleItemCostPrice?: number;

  @ApiProperty({ example: 150, description: 'Quantity of items in stock', required: false })
  @IsNumber()
  @IsOptional()
  itemQuantity?: number;

  @ApiProperty({ example: 35.99, description: 'Manufacturer suggested retail price', required: false })
  @IsNumber()
  @IsOptional()
  msrpPrice?: number;
  @ApiProperty({ example: 30.99, description: 'Selling price per single item', required: false })
  @IsNumber()
  @IsOptional()
  singleItemSellingPrice?: number;

  @ApiProperty({ example: 3.00, description: 'Discount amount applied to the product', required: false })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiProperty({ example: 15, description: 'Percentage discount applied to the product', required: false })
  @IsNumber()
  @IsOptional()
  percentDiscount?: number;

  @ApiProperty({ example: 'uuid-client-id', description: 'ID of the client', required: false })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiProperty({ example: 'uuid-store-id', description: 'ID of the store', required: false })
  @IsString()
  @IsOptional()
  storeId?: string;

  @ApiProperty({ example: false, description: 'Whether the product has variants', required: false })
  @IsBoolean()
  @IsOptional()
  hasVariants?: boolean;

  @ApiProperty({
    type: [PackDto],
    example: [{ minimumSellingQuantity: 10, totalPacksQuantity: 50, orderedPacksPrice: 21.99, percentDiscount: 5 }],
    description: 'Array of packs for the product when hasVariants is false',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackDto)
  @IsOptional()
  packs?: PackDto[];

  @ApiProperty({
    type: [VariantDto],
    example: [{ name: 'Dark Roast', price: 27.99, sku: 'COFFEE-001-DR', packs: [{ minimumSellingQuantity: 10, totalPacksQuantity: 50, orderedPacksPrice: 18.99, percentDiscount: 5 }] }],
    description: 'Array of variants for the product when hasVariants is true',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  @IsOptional()
  variants?: VariantDto[];
}

export class ProductResponseDto {
  @ApiProperty({ example: 'uuid-product-id', description: 'Unique identifier of the product' })
  id: string;

  @ApiProperty({ example: 'Premium Coffee Beans', description: 'Name of the product' })
  name: string;

  @ApiProperty({ example: 'Beverages', description: 'Category of the product' })
  category: string;

  @ApiProperty({ example: '1234567890123', description: 'EAN code of the product', required: false })
  ean?: string;  @ApiProperty({ example: 'UPC123456', description: 'PLU/UPC code of the product', required: false })
  pluUpc?: string;@ApiProperty({ 
    type: [ProductSupplierDto],
    example: [
      {
        supplierId: 'uuid-supplier-id',
        costPrice: 19.99,
        category: 'Beverages',
        state: 'primary'
      }
    ],
    description: 'Array of supplier relationships for this product',
    required: false
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSupplierDto)
  @IsOptional()
  productSuppliers?: ProductSupplierDto[];

  @ApiProperty({ example: 'COFFEE-001', description: 'SKU of the product', required: false })
  sku?: string;

  @ApiProperty({ example: 19.99, description: 'Cost price per single item (from primary supplier)', required: false })
  singleItemCostPrice?: number;

  @ApiProperty({ example: 100, description: 'Quantity of items in stock' })
  itemQuantity: number;

  @ApiProperty({ example: 29.99, description: 'Manufacturer suggested retail price' })
  msrpPrice: number;
  @ApiProperty({ example: 25.99, description: 'Selling price per single item' })
  singleItemSellingPrice: number;

  @ApiProperty({ example: 2.00, description: 'Discount amount applied to the product' })
  discountAmount: number;

  @ApiProperty({ example: 10, description: 'Percentage discount applied to the product' })
  percentDiscount: number;

  @ApiProperty({ example: 'uuid-client-id', description: 'ID of the client' })
  clientId: string;

  @ApiProperty({ example: 'uuid-store-id', description: 'ID of the store' })
  storeId: string;

  @ApiProperty({ example: false, description: 'Whether the product has variants' })
  hasVariants: boolean;

  @ApiProperty({ example: ['uuid-pack-id-1', 'uuid-pack-id-2'], description: 'Array of pack IDs when hasVariants is false', required: false })
  packIds?: string[];

  @ApiProperty({
    type: [PackDto],
    example: [
      {
        minimumSellingQuantity: 10,
        totalPacksQuantity: 50,
        orderedPacksPrice: 18.99,
        percentDiscount: 5,
      },
    ],
    description: 'Array of packs associated with the product',
    required: false,
  })
  packs?: PackDto[];

  @ApiProperty({
    type: [VariantDto],
    example: [
      {
        name: 'Dark Roast',
        price: 27.99,
        sku: 'COFFEE-001-DR',
        packIds: ['uuid-pack-id-1'],
      },
    ],
    description: 'Array of variants for the product',
    required: false,
  })
  variants?: VariantDto[];

  @ApiProperty({ example: '2025-06-20T21:12:00.000Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2025-06-20T21:12:00.000Z', description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ example: 6.0, description: 'Profit amount (selling price - cost price)', required: false })
  profitAmount?: number;
  @ApiProperty({ example: 30.02, description: 'Profit margin percentage', required: false })
  profitMargin?: number;

  @ApiProperty({
    example: {
      id: 'uuid-store-id',
      name: 'Main Store',
    },
    description: 'Store details',
    required: false,
  })
  store?: any;

  @ApiProperty({
    example: [],
    description: 'Array of sales records associated with the product',
    required: false,
  })
  sales?: any[];

  @ApiProperty({
    example: [
      {
        id: 'uuid-purchase-order-id',
        productId: 'uuid-product-id',
        supplierId: 'uuid-supplier-id',
        employeeId: 'uuid-employee-id',
        storeId: 'uuid-store-id',
        quantity: 100,
        price: 19.99,
        total: 1999.0,
        status: 'active',
      },
    ],
    description: 'Array of purchase orders associated with the product',
    required: false,
  })
  purchaseOrders?: any[];
}