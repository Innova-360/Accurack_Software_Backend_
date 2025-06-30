import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsArray,
  ValidateNested,
  IsOptional,
  IsDate,
  IsEnum,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmployeePermissionDto } from './employee-permission.dto';

export class CreateEmployeeDto {
  @ApiProperty({
    example: 'StrongPassword123!',
    description:
      'Optional password for the employee account. If not provided, a random password will be generated. Must contain at least 8 characters, including uppercase, lowercase, number, and special character.',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)',
    },
  )
  password?: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Employee email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'Employee first name',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Employee last name',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    example: '+1234567890',
    description: 'Employee phone number',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    example: 'EMP001',
    description: 'Employee code/ID number',
    required: false,
  })
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @ApiProperty({
    example: 'Senior Developer',
    description: 'Employee position/title',
  })
  @IsString()
  position: string;

  @ApiProperty({
    example: 'Engineering',
    description: 'Employee department',
  })
  @IsString()
  @IsOptional()
  department: string;

  @ApiProperty({
    example: 'role-template-uuid-123',
    description: 'Role template ID to assign to the employee',
  })
  @IsString()
  roleTemplateId: string;

  @ApiProperty({
    example: 'active',
    description: 'Employee status',
    enum: ['active', 'inactive', 'pending', 'suspended'],
  })
  @IsEnum(['active', 'inactive', 'pending', 'suspended'])
  status: string;

  @ApiProperty({
    example: '2025-06-24',
    description: 'Employee joining date',
    required: true,
  })
  @Type(() => Date)
  @IsOptional()
  joiningDate?: Date;

  @ApiProperty({
    type: [EmployeePermissionDto],
    description: 'Array of resource permissions for the employee',
    example: [
      {
        resource: 'PRODUCT',
        actions: ['CREATE', 'READ'],
        scope: 'STORE',
        storeId: 'store-123',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeePermissionDto)
  permissions: EmployeePermissionDto[];

  @ApiProperty({
    type: [String],
    description: 'Array of store IDs to assign to the employee',
    example: ['store-123', 'store-456'],
  })
  @IsArray()
  @IsOptional()
  storeIds?: string[];
}
