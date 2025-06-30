import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'ELEC' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'All electronic items' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'parent-category-uuid' })
  @IsString()
  @IsOptional()
  parentId?: string;
}
