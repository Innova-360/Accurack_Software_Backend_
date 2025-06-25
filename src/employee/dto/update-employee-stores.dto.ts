import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateEmployeeStoresDto {
  @ApiProperty({
    type: [String],
    description: 'Array of store IDs to assign to the employee',
    example: ['store-123', 'store-456'],
  })
  @IsArray()
  @IsString({ each: true })
  storeIds: string[];
}
