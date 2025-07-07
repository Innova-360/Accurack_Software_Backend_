import { IsString, IsEnum, IsNumber, IsUUID, IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod, SaleStatus } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty({
    description: 'The unique identifier of the customer placing the order',
    example: 'customer-uuid-here',
    format: 'uuid',
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({
    description: 'The unique identifier of the driver',
    example: 'driver-uuid-here',
    format: 'uuid',
  })
  @IsUUID()
  driverId: string;

  @ApiProperty({
    description: 'The name of the driver',
    example: 'John Doe',
  })
  @IsString()
  driverName: string;

  @ApiProperty({
    description: 'The unique identifier of the store',
    example: 'store-uuid-here',
    format: 'uuid',
  })
  @IsUUID()
  storeId: string;

  @ApiProperty({
    description: 'Total amount for the order',
    example: 150.5,
    type: 'number',
  })
  @IsNumber()
  paymentAmount: number;

  @ApiProperty({
    description: 'Payment method used for the order',
    enum: PaymentMethod,
    example: 'CASH',
    enumName: 'PaymentMethod',
  })
  @IsEnum(PaymentMethod)
  paymentType: PaymentMethod;
}

export class UpdateOrderDto {
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

  @ApiProperty({
    description: 'Updated status of the order',
    enum: SaleStatus,
    example: 'PENDING',
    enumName: 'SaleStatus',
  })
  @IsEnum(SaleStatus)
  status?: SaleStatus;
}

export class PaginationDto {
  @ApiProperty({
    description: 'Page number for pagination (1-based index)',
    example: 1,
    type: 'integer',
    minimum: 1,
    default: 1,
  })
  // @IsInt()
  // @IsPositive()
  page: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    type: 'integer',
    minimum: 1,
    default: 10,
  })
  // @IsInt()
  // @IsPositive()
  limit: number = 10;
}