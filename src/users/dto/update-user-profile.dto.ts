import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ 
    example: 'John',
    description: 'User first name',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName?: string;

  @ApiPropertyOptional({ 
    example: 'Doe',
    description: 'User last name',
    minLength: 2,
    maxLength: 50
  })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;

  @ApiPropertyOptional({ 
    example: '+1-555-123-4567',
    description: 'User phone number',
    minLength: 10,
    maxLength: 20
  })
  @IsString()
  @IsOptional()
  @MinLength(10, { message: 'Phone number must be at least 10 characters long' })
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  phone?: string;
}
