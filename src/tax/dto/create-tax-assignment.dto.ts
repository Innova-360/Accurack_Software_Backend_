import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EntityType } from '@prisma/client';

export class CreateTaxAssignmentDto {
  @ApiProperty({
    enum: EntityType,
    example: EntityType.PRODUCT,
    description:
      'Type of entity being assigned the tax (PRODUCT, CATEGORY, SUPPLIER, STORE, CUSTOMER)',
  })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({
    example: 'entityId',
    description:
      'ID of the entity (product, category, supplier, store, or customer)',
  })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ example: 'taxRateId', description: 'ID of the tax rate' })
  @IsString()
  @IsNotEmpty()
  taxRateId: string;
}
