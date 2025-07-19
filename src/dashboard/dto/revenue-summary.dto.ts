import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsISO8601 } from 'class-validator';

export class RevenueSummaryQueryDto {
  @ApiProperty({ description: 'The store to fetch data for' })
  @IsString()
  storeId: string;

  @ApiProperty({ description: 'Start date (inclusive)', example: '2024-06-01T00:00:00Z' })
  @IsISO8601()
  dateFrom: string;

  @ApiPropertyOptional({ description: 'End date (inclusive). If not provided, defaults to today', example: '2024-06-30T23:59:59Z' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}

export class SaleItemSummaryDto {
  @ApiProperty({ description: 'Product ID' })
  productId: string;

  @ApiProperty({ description: 'Product name' })
  productName: string;

  @ApiProperty({ description: 'Quantity sold' })
  quantity: number;

  @ApiProperty({ description: 'Cost price per unit' })
  costPrice: number;

  @ApiProperty({ description: 'Selling price per unit' })
  sellingPrice: number;

  @ApiProperty({ description: 'Discount applied to this item' })
  discountApplied: number;

  @ApiProperty({ description: 'Tax applied to this item' })
  taxApplied: number;

  @ApiProperty({ description: 'Profit for this item' })
  profit: number;
}

export class SaleSummaryDto {
  @ApiProperty({ description: 'Sale ID' })
  saleId: string;

  @ApiProperty({ description: 'Sale date' })
  date: string;

  @ApiProperty({ description: 'Customer name' })
  customerName: string;

  @ApiProperty({ description: 'Total amount for this sale' })
  totalAmount: number;

  @ApiProperty({ description: 'Tax amount for this sale' })
  tax: number;

  @ApiProperty({ description: 'Discount amount for this sale' })
  discount: number;

  @ApiProperty({ description: 'Profit for this sale' })
  profit: number;

  @ApiProperty({ description: 'Items in this sale', type: [SaleItemSummaryDto] })
  items: SaleItemSummaryDto[];
}

export class RevenueSummaryResponseDto {
  @ApiProperty({ description: 'Total revenue across all sales' })
  totalRevenue: number;

  @ApiProperty({ description: 'Total profit across all sales' })
  totalProfit: number;

  @ApiProperty({ description: 'Total cost across all items' })
  totalCost: number;

  @ApiProperty({ description: 'Total tax collected' })
  totalTax: number;

  @ApiProperty({ description: 'Total discounts given' })
  totalDiscount: number;

  @ApiProperty({ description: 'Total quantity of products sold' })
  totalProductsSold: number;

  @ApiProperty({ description: 'List of sales with details', type: [SaleSummaryDto] })
  sales: SaleSummaryDto[];
} 