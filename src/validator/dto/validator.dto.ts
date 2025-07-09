import { IsString, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class UpdatePaymentDto {
  @ApiProperty({
    description: 'The unique identifier of the order',
    example: 'order-uuid-here',
    format: 'uuid',
  })
  @IsUUID()
  orderId: string;

  // @ApiProperty({
  //   description: 'The unique identifier of the store',
  //   example: 'store-uuid-here',
  //   format: 'uuid',
  // })
  // @IsUUID()
  // storeId: string;

  @ApiProperty({
    description: 'Updated total amount for the order',
    example: 175.0,
    type: 'number',
  })
  @IsNumber()
  paymentAmount: number;

  @ApiProperty({
    description: 'Updated payment method for the order',
    enum: PaymentMethod,
    example: 'CARD',
    enumName: 'PaymentMethod',
  })
  @IsEnum(PaymentMethod)
  paymentType: PaymentMethod;
}
