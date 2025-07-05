import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ description: 'Store name', example: 'Downtown Store' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Store email address',
    example: 'store@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Store physical address',
    example: '123 Main St, City, State 12345',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Store phone number',
    example: '+1-555-123-4567',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Store currency', example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Store timezone',
    example: 'America/New_York',
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Store logo URL',
    example:
      'https://res.cloudinary.com/example/image/upload/v1234567890/logo.png',
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;
}

export class UpdateStoreDto {
  @ApiPropertyOptional({
    description: 'Store name',
    example: 'Updated Store Name',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Store email address',
    example: 'updated@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Store physical address',
    example: '456 Updated St, City, State 12345',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Store phone number',
    example: '+1-555-987-6543',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Store currency', example: 'EUR' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Store timezone',
    example: 'Europe/London',
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Store logo URL',
    example:
      'https://res.cloudinary.com/example/image/upload/v1234567890/updated-logo.png',
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Tax rate as decimal (0.08 = 8%)',
    example: 0.08,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  taxRate?: number;

  @ApiPropertyOptional({
    description: 'Tax calculation mode',
    enum: ['exclusive', 'inclusive'],
    example: 'exclusive',
  })
  @IsEnum(['exclusive', 'inclusive'])
  @IsOptional()
  taxMode?: 'exclusive' | 'inclusive';

  @ApiPropertyOptional({
    description: 'Low stock alert threshold (minimum quantity)',
    example: 10,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  lowStockAlert?: number;

  @ApiPropertyOptional({
    description: 'Enable notifications for alerts',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  enableNotifications?: boolean;
}
