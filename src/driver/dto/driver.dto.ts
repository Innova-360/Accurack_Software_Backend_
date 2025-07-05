import { IsString, IsEnum, IsNumber, IsUUID, IsInt } from 'class-validator';
import { PaymentMethod, SaleStatus } from '@prisma/client';

export class CreateOrderDto {
  @IsUUID()
  customerId: string;

  @IsString()
  cashierName: string;

  @IsNumber()
  totalAmount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsInt()
  quantitySend: number;
}

export class UpdateOrderDto {
  @IsEnum(SaleStatus)
  status: SaleStatus;

  @IsNumber()
  totalAmount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

export class SendForValidationDto {
  @IsUUID()
  saleId: string;
}