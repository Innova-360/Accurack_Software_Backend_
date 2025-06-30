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
  @ApiProperty({ enum: EntityType })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty()
  @IsString()
  entityId: string;

  @ApiProperty()
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
