import { ApiProperty } from '@nestjs/swagger';
import { EntityType } from '@prisma/client';
import {
  IsEnum,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssignTaxDto {
  @ApiProperty({
    enum: EntityType,
    description:
      'Type of entity (PRODUCT, CATEGORY, SUPPLIER, STORE, CUSTOMER)',
    example: EntityType.PRODUCT,
  })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({
    description: 'ID of the entity to assign tax to',
    example: 'uuid-of-entity',
  })
  @IsString()
  entityId: string;

  @ApiProperty({
    description: 'ID of the tax rate to assign',
    example: 'uuid-of-tax-rate',
  })
  @IsString()
  taxRateId: string;
}

export class BulkAssignTaxDto {
  @ApiProperty({ type: [AssignTaxDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssignTaxDto)
  assignments: AssignTaxDto[];
}
