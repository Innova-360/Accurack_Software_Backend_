import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRegionDto {
  @ApiProperty({ example: 'California', description: 'Name of the region' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'CA', description: 'Unique code for the region' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    example: 'State of California',
    description: 'Description of the region',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
