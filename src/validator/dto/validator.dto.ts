import { IsNumber, IsUUID } from 'class-validator';

export class UpdatePaymentDto {
  @IsUUID()
  saleId: string;

  @IsNumber()
  paymentAmount: number;
}

export class ValidateOrderDto {
  @IsUUID()
  saleId: string;
}