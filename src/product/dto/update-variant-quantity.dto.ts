import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVariantQuantityDto {
  @ApiProperty({
    description: 'New quantity for the variant',
    example: 50,
    minimum: 0,
  })
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(0, { message: 'Quantity must be at least 0' })
  quantity: number;
}
