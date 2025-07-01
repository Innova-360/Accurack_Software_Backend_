import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';

enum SupplierState {
  primary = 'primary',
  secondary = 'secondary',
}

// Class for additional dynamic properties in variants
class DynamicProperties {
  [key: string]: any;
}

class AssignSupplierProduct{
   @ApiProperty({
    example: 'uuid-product-id',
    description: 'ID of the product',
  })
  @IsString()
  productId: string;

  @ApiProperty({ example: 19.99, description: 'Cost price from this supplier' })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  costPrice: number;


  @ApiProperty({
    example: 'primary',
    description: 'State for this supplier',
  })
  @IsString()
  state: string;
}

export class AssignSupplierDto {
  @ApiProperty({ example: 'uuid-supplier-id', description: 'ID of the supplier' })
  supplierId: string;

  @ApiProperty({ example: 'uuid-store-id', description: 'ID of the store' })
  storeId: string;

  @ApiProperty({
    type: AssignSupplierProduct,
    example: {
      productId: '8bb688a6-9759-434a-90c9-83f8f8e196e3',
      costPrice: '56.9',
      state: 'primary'
    }
  })
  products?: AssignSupplierProduct | { [key: string]: any };
 
}


class ProductSupplierDto {
  @ApiProperty({
    example: 'uuid-supplier-id',
    description: 'ID of the supplier',
  })
  @IsString()
  supplierId: string;

  @ApiProperty({ example: 19.99, description: 'Cost price from this supplier' })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  costPrice: number;

  @ApiProperty({
    example: 'Beverages',
    description: 'Category for this supplier relationship',
  })
  @IsString()
  categoryId: string;

  @ApiProperty({
    example: 'primary',
    description: 'Supplier state (primary or secondary)',
    enum: SupplierState,
  })
  @IsEnum(SupplierState)
  state: SupplierState;
}

class PackDto {
  @ApiProperty({
    example: 10,
    description: 'Minimum quantity that can be sold per pack',
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  minimumSellingQuantity: number;

  @ApiProperty({
    example: 50,
    description: 'Total quantity of packs available',
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  totalPacksQuantity: number;

  @ApiProperty({ example: 18.99, description: 'Price per pack when ordered' })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  orderedPacksPrice: number;

  @ApiProperty({
    example: 2.5,
    description: 'Discount amount applied to the pack',
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiProperty({
    example: 5,
    description: 'Percentage discount applied to the pack',
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  })
  @IsNumber()
  @IsOptional()
  percentDiscount?: number;
}

class VariantDto {
  @ApiProperty({
    example: 'Dark Roast',
    description: 'Name of the variant (REQUIRED)',
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    return typeof value === 'string' ? value : String(value);
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 27.99,
    description: 'Price of the variant (REQUIRED)',
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    example: 'UPC123456',
    description: 'PLU/UPC code of the variant (REQUIRED)',
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    return typeof value === 'string' ? value : String(value);
  })
  @IsString()
  pluUpc: string;

  @ApiProperty({
    example: 2.5,
    description: 'Discount amount applied to the variant (OPTIONAL)',
    required: false,
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

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

  // Allow any additional dynamic properties beyond the required fields
  // Examples: color, size, weight, material, origin, roastLevel, isOrganic, quantity, msrpPrice, etc.
  [key: string]: any;
}

export class CreateProductDto {
  @ApiProperty({
    example: 'Premium Coffee Beans',
    description: 'Name of the product',
  })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Beverages', description: 'Category of the product' })
  @IsString()
  categoryId: string;

  @ApiProperty({
    example: '1234567890123',
    description: 'EAN code of the product',
    required: false,
  })
  @IsString()
  @IsOptional()
  ean?: string;
  @ApiProperty({
    example: 'UPC123456',
    description: 'PLU/UPC code of the product',
    required: false,
  })
  @IsString()
  @IsOptional()
  pluUpc?: string;
  @ApiProperty({
    type: [ProductSupplierDto],
    example: [
      {
        supplierId: 'uuid-supplier-id',
        costPrice: 19.99,
        category: 'Beverages',
        state: 'primary',
      },
    ],
    description: 'Array of suppliers for this product',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSupplierDto)
  @IsOptional()
  productSuppliers?: ProductSupplierDto[];

  @ApiProperty({ example: '5465768923921', description: 'Supplier of this product' })
  @IsString()
  supplierId: string;

  @ApiProperty({
    example: 'COFFEE-001',
    description: 'SKU of the product',
    required: false,
  })
  @IsString()
  @IsOptional()
  sku?: string;
  @ApiProperty({
    example: 19.99,
    description: 'Cost price per single item (from primary supplier)',
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  @IsOptional()
  singleItemCostPrice?: number;

  @ApiProperty({ example: 100, description: 'Quantity of items in stock' })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  itemQuantity: number;

  @ApiProperty({
    example: 29.99,
    description: 'Manufacturer suggested retail price',
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  @IsOptional()
  msrpPrice?: number;

  @ApiProperty({ example: 25.99, description: 'Selling price per single item' })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  @IsOptional()
  singleItemSellingPrice?: number;

  @ApiProperty({
    example: 2.0,
    description: 'Discount amount applied to the product',
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiProperty({
    example: 10,
    description: 'Percentage discount applied to the product',
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  })
  @IsNumber()
  @IsOptional()
  percentDiscount?: number;

  @ApiProperty({ example: 'uuid-client-id', description: 'ID of the client' })
  @IsString()
  clientId: string;

  @ApiProperty({ example: 'uuid-store-id', description: 'ID of the store' })
  @IsString()
  storeId: string;

  @ApiProperty({
    example: false,
    description: 'Whether the product has variants',
  })
  @IsBoolean()
  hasVariants: boolean;
  @ApiProperty({
    type: [PackDto],
    example: [
      {
        minimumSellingQuantity: 10,
        totalPacksQuantity: 50,
        orderedPacksPrice: 18.99,
        discountAmount: 2.5,
        percentDiscount: 5,
      },
    ],
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
    example: [
      {
        name: 'Dark Roast',
        price: 27.99,
        pluUpc: 'COFFEE-001-DR',
        quantity: 100,
        packs: [
          {
            minimumSellingQuantity: 10,
            totalPacksQuantity: 50,
            orderedPacksPrice: 18.99,
            percentDiscount: 5,
          },
        ],
        // Dynamic properties example - these can be anything
        color: 'Brown',
        weight: 500,
        origin: 'Colombia',
        roastLevel: 'Dark',
        isOrganic: true,
      },
    ],
    description:
      'Array of variants for the product when hasVariants is true. Each variant can include standard properties and any additional dynamic properties.',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  @IsOptional()
  variants?: VariantDto[];
}

export class UpdateProductDto {
  @ApiProperty({
    example: 'Updated Coffee Beans',
    description: 'Name of the product',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'Beverages',
    description: 'Category of the product',
    required: false,
  })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    example: '1234567890123',
    description: 'EAN code of the product',
    required: false,
  })
  @IsString()
  @IsOptional()
  ean?: string;
  @ApiProperty({
    example: 'UPC123456',
    description: 'PLU/UPC code of the product',
    required: false,
  })
  @IsString()
  @IsOptional()
  pluUpc?: string;

  @ApiProperty({
    type: [ProductSupplierDto],
    example: [
      {
        supplierId: 'uuid-supplier-id',
        costPrice: 22.99,
        category: 'Beverages',
        state: 'primary',
      },
    ],
    description: 'Array of suppliers for this product',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSupplierDto)
  @IsOptional()
  productSuppliers?: ProductSupplierDto[];

  @ApiProperty({
    example: 'COFFEE-001-UPDATED',
    description: 'SKU of the product',
    required: false,
  })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({
    example: 22.99,
    description: 'Cost price per single item',
    required: false,
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  @IsOptional()
  singleItemCostPrice?: number;

  @ApiProperty({
    example: 150,
    description: 'Quantity of items in stock',
    required: false,
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  @IsOptional()
  itemQuantity?: number;

  @ApiProperty({
    example: 35.99,
    description: 'Manufacturer suggested retail price',
    required: false,
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  @IsOptional()
  msrpPrice?: number;

  @ApiProperty({
    example: 30.99,
    description: 'Selling price per single item',
    required: false,
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  @IsOptional()
  singleItemSellingPrice?: number;

  @ApiProperty({
    example: 3.0,
    description: 'Discount amount applied to the product',
    required: false,
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiProperty({
    example: 15,
    description: 'Percentage discount applied to the product',
    required: false,
  })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  })
  @IsNumber()
  @IsOptional()
  percentDiscount?: number;

  @ApiProperty({
    example: 'uuid-client-id',
    description: 'ID of the client',
    required: false,
  })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiProperty({
    example: 'uuid-store-id',
    description: 'ID of the store',
    required: false,
  })
  @IsString()
  @IsOptional()
  storeId?: string;

  @ApiProperty({
    example: false,
    description: 'Whether the product has variants',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  hasVariants?: boolean;

  @ApiProperty({
    type: [PackDto],
    example: [
      {
        minimumSellingQuantity: 10,
        totalPacksQuantity: 50,
        orderedPacksPrice: 21.99,
        percentDiscount: 5,
      },
    ],
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
    example: [
      {
        name: 'Dark Roast',
        price: 27.99,
        pluUpc: 'COFFEE-001-DR',
        quantity: 100,
        packs: [
          {
            minimumSellingQuantity: 10,
            totalPacksQuantity: 50,
            orderedPacksPrice: 18.99,
            percentDiscount: 5,
          },
        ],
        // Dynamic properties example - these can be anything
        color: 'Brown',
        weight: 500,
        origin: 'Colombia',
        roastLevel: 'Dark',
        isOrganic: true,
      },
    ],
    description:
      'Array of variants for the product when hasVariants is true. Each variant can include standard properties and any additional dynamic properties.',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  @IsOptional()
  variants?: VariantDto[];
}

export class ProductResponseDto {
  @ApiProperty({
    example: 'uuid-product-id',
    description: 'Unique identifier of the product',
  })
  id: string;

  @ApiProperty({
    example: 'Premium Coffee Beans',
    description: 'Name of the product',
  })
  name: string;

  @ApiProperty({ example: 'Beverages', description: 'Category of the product' })
  categoryId: string;

  @ApiProperty({
    type: CreateCategoryDto,
    example: {
      id: '8bb688a6-9759-434a-90c9-83f8f8e196e3',
      name: 'Electronics',
      code: 'ELEC',
      description: 'All electronic items',
      parentId: 'uuid-parent-category-id',
    },
    description: 'Category of the product',
    required: false,
  })
  category?: CreateCategoryDto | CreateCategoryDto | { [key: string]: any };

  @ApiProperty({
    example: '1234567890123',
    description: 'EAN code of the product',
    required: false,
  })
  ean?: string;
  @ApiProperty({
    example: 'UPC123456',
    description: 'PLU/UPC code of the product',
    required: false,
  })
  pluUpc?: string;
  @ApiProperty({
    type: [ProductSupplierDto],
    example: [
      {
        supplierId: 'uuid-supplier-id',
        costPrice: 19.99,
        category: 'Beverages',
        state: 'primary',
      },
    ],
    description: 'Array of supplier relationships for this product',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSupplierDto)
  @IsOptional()
  productSuppliers?: ProductSupplierDto[];

  @ApiProperty({
    example: 'COFFEE-001',
    description: 'SKU of the product',
    required: false,
  })
  sku?: string;

  @ApiProperty({
    example: 19.99,
    description: 'Cost price per single item (from primary supplier)',
    required: false,
  })
  singleItemCostPrice?: number;

  @ApiProperty({ example: 100, description: 'Quantity of items in stock' })
  itemQuantity: number;

  @ApiProperty({
    example: 29.99,
    description: 'Manufacturer suggested retail price',
  })
  msrpPrice: number;
  @ApiProperty({ example: 25.99, description: 'Selling price per single item' })
  singleItemSellingPrice: number;

  @ApiProperty({
    example: 2.0,
    description: 'Discount amount applied to the product',
  })
  discountAmount: number;

  @ApiProperty({
    example: 10,
    description: 'Percentage discount applied to the product',
  })
  percentDiscount: number;

  @ApiProperty({ example: 'uuid-client-id', description: 'ID of the client' })
  clientId: string;

  @ApiProperty({ example: 'uuid-store-id', description: 'ID of the store' })
  storeId: string;

  @ApiProperty({
    example: false,
    description: 'Whether the product has variants',
  })
  hasVariants: boolean;

  @ApiProperty({
    example: ['uuid-pack-id-1', 'uuid-pack-id-2'],
    description: 'Array of pack IDs when hasVariants is false',
    required: false,
  })
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
        // Required fields
        name: 'Dark Roast',
        price: 27.99,
        pluUpc: 'COFFEE-001-DR',
        // Optional field
        discountAmount: 2.5,
        // System fields
        packIds: ['uuid-pack-id-1'],
        // Dynamic properties examples
        color: 'Brown',
        origin: 'Colombia',
        roastLevel: 'Dark',
        isOrganic: true,
        quantity: 100,
      },
    ],
    description:
      'Array of variants for the product with required fields (name, price, pluUpc) and any dynamic properties',
    required: false,
  })
  variants?: VariantDto[];

  @ApiProperty({
    example: '2025-06-20T21:12:00.000Z',
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-06-20T21:12:00.000Z',
    description: 'Last update timestamp',
  })
  updatedAt: Date;

  @ApiProperty({
    example: 6.0,
    description: 'Profit amount (selling price - cost price)',
    required: false,
  })
  profitAmount?: number;
  @ApiProperty({
    example: 30.02,
    description: 'Profit margin percentage',
    required: false,
  })
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


