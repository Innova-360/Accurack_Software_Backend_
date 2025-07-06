import { IsString, IsEnum, IsNumber, IsUUID, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, SaleStatus } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty({
    description: 'The unique identifier of the customer placing the order',
    example: 'customer-uuid-here',
    format: 'uuid'
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({
    description: 'The unique identifier of the store',
    example: 'store-uuid-here',
    format: 'uuid'
  })
  @IsUUID()
  storeId: string;

  @ApiProperty({
    description: 'Name of the cashier handling the order',
    example: 'John Smith',
    type: 'string'
  })
  @IsString()
  cashierName: string;

  @ApiProperty({
    description: 'Total amount for the order',
    example: 150.50,
    type: 'number'
  })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({
    description: 'Payment method used for the order',
    enum: PaymentMethod,
    example: 'cash',
    enumName: 'PaymentMethod'
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    description: 'Quantity of items being sent/delivered',
    example: 5,
    type: 'integer'
  })
  @IsInt()
  quantitySend: number;
}

export class UpdateOrderDto {
  @ApiProperty({
    description: 'New status for the order',
    enum: SaleStatus,
    example: 'COMPLETED',
    enumName: 'SaleStatus'
  })
  @IsEnum(SaleStatus)
  status: SaleStatus;

  @ApiProperty({
    description: 'Updated total amount for the order',
    example: 175.00,
    type: 'number'
  })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({
    description: 'Updated payment method for the order',
    enum: PaymentMethod,
    example: 'card',
    enumName: 'PaymentMethod'
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

export class SendForValidationDto {
  @ApiProperty({
    description: 'The unique identifier of the sale/order to send for validation',
    example: 'sale-uuid-here',
    format: 'uuid'
  })
  @IsUUID()
  saleId: string;
}