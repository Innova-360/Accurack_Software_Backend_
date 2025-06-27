import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class InviteEmployeeDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'Sales Manager' })
  @IsString()
  position: string;

  @ApiProperty({ example: 'Sales' })
  @IsString()
  department: string;

  @ApiProperty({
    example: 'role-template-uuid-123',
    description:
      'Role template ID for the invited employee. Defaults to basic employee role template if not provided.',
    required: false,
  })
  @IsOptional()
  @IsString()
  roleTemplateId?: string;

  @ApiProperty({ example: ['store-123'] })
  @IsString({ each: true })
  storeIds: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
