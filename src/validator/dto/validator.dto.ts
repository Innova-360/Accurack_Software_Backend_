import { IsNumber, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePaymentDto {
  @ApiProperty({
    description: 'The unique identifier of the sale/order',
    example: 'uuid-string-here',
    format: 'uuid'
  })
  @IsUUID()
  saleId: string;

  @ApiProperty({
    description: 'The new payment amount for the order',
    example: 175.50,
    type: 'number'
  })
  @IsNumber()
  paymentAmount: number;
}

export class ValidateOrderDto {
  @ApiProperty({
    description: 'The unique identifier of the sale/order to validate',
    example: 'uuid-string-here',
    format: 'uuid'
  })
  @IsUUID()
  saleId: string;
}