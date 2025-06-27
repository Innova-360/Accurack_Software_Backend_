import { IsUUID, IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsArray, ValidateNested, IsPositive, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK',
  DIGITAL_WALLET = 'DIGITAL_WALLET'
}

export enum SaleStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_RETURNED = 'PARTIALLY_RETURNED'
}

export enum ReturnCategory {
  SALEABLE = 'SALEABLE',
  NON_SALEABLE = 'NON_SALEABLE',
  SCRAP = 'SCRAP'
}

export enum PaymentStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  UNPAID = 'UNPAID',
  OVERDUE = 'OVERDUE'
}

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer name' })
  @IsString()
  customerName: string;

  @ApiPropertyOptional({ description: 'Customer address' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Telephone number' })
  @IsOptional()
  @IsString()
  telephoneNumber?: string;

  @ApiPropertyOptional({ description: 'Customer email' })
  @IsOptional()
  @IsEmail()
  customerMail?: string;

  @ApiProperty({ description: 'Store ID' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Client ID' })
  @IsUUID()
  clientId: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ description: 'Customer name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer address' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional({ description: 'Telephone number' })
  @IsOptional()
  @IsString()
  telephoneNumber?: string;

  @ApiPropertyOptional({ description: 'Customer email' })
  @IsOptional()
  @IsEmail()
  customerMail?: string;
}

export class SaleItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId?: string;

  @ApiProperty({ description: 'Product PLU/UPC' })
  pluUpc: string;

  @ApiProperty({ description: 'Product name' })
  @IsString()
  productName: string;

  @ApiProperty({ description: 'Quantity purchased' })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Selling price per unit' })
  @IsNumber()
  @IsPositive()
  sellingPrice: number;

  @ApiProperty({ description: 'Total price for this item' })
  @IsNumber()
  @IsPositive()
  totalPrice: number;
}

export class CreateSaleDto {
  @ApiProperty({ description: 'Customer phone number (for existing customer) or customer data' })
  @IsString()
  customerPhone: string;

  @ApiPropertyOptional({ description: 'Customer data if new customer' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  customerData?: CreateCustomerDto;

  @ApiProperty({ description: 'Store ID' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Client ID' })
  @IsUUID()
  clientId: string;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Total amount' })
  @IsNumber()
  // @IsPositive()
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Tax amount', default: 0 })
  @IsOptional()
  @IsNumber()
  tax?: number;

  @ApiProperty({ description: 'Cashier name' })
  @IsString()
  cashierName: string;

  @ApiPropertyOptional({ description: 'Generate invoice', default: true })
  @IsOptional()
  @IsBoolean()
  generateInvoice?: boolean;

  @ApiProperty({ description: 'Sale items', type: [SaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  saleItems: SaleItemDto[];

  // Invoice specific fields (optional, used only when generating invoice)
  @ApiPropertyOptional({ description: 'Company name for invoice' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Company email for invoice' })
  @IsOptional()
  @IsEmail()
  companyMail?: string;

  @ApiPropertyOptional({ description: 'Company address for invoice' })
  @IsOptional()
  @IsString()
  companyAddress?: string;

  @ApiPropertyOptional({ description: 'Company number for invoice' })
  @IsOptional()
  @IsString()
  companyNo?: string;

  @ApiPropertyOptional({ description: 'Shipping address for invoice' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;
}

export class UpdateSaleDto {
  @ApiPropertyOptional({ description: 'Payment method', enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Sale status', enum: SaleStatus })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({ description: 'Total amount' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Tax amount' })
  @IsOptional()
  @IsNumber()
  tax?: number;

  @ApiPropertyOptional({ description: 'Cashier name' })
  @IsOptional()
  @IsString()
  cashierName?: string;
}

export class CreateSaleReturnDto {
  @ApiProperty({ description: 'Sale ID' })
  @IsUUID()
  saleId: string;

  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId?: string;

  @ApiProperty({ description: 'Product PLU/UPC' })
  pluUpc: string;

  @ApiProperty({ description: 'Quantity to return' })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Return category', enum: ReturnCategory })
  @IsEnum(ReturnCategory)
  returnCategory: ReturnCategory;

  @ApiPropertyOptional({ description: 'Reason for return' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ description: 'Sale ID (if payment is for specific sale)' })
  @IsOptional()
  @IsUUID()
  saleId?: string;

  @ApiProperty({ description: 'Amount paid' })
  @IsNumber()
  @IsPositive()
  amountPaid: number;

  @ApiPropertyOptional({ description: 'Payment description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class InvoiceQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Limit per page', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Customer ID filter' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Date from (ISO string)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to (ISO string)' })
  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class SaleQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Limit per page', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Customer ID filter' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Sale status filter', enum: SaleStatus })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({ description: 'Payment method filter', enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Date from (ISO string)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to (ISO string)' })
  @IsOptional()
  @IsString()
  dateTo?: string;
}
