import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'John Doe Company' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'admin@johndoe.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class TenantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  contactName?: string;

  @ApiProperty()
  phone?: string;

  @ApiProperty()
  databaseName: string;

  @ApiProperty()
  status: 'active' | 'inactive' | 'provisioning';

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UpdateTenantStatusDto {
  @ApiProperty({ 
    example: 'active',
    description: 'New status for the tenant',
    enum: ['active', 'inactive', 'suspended']
  })
  @IsString()
  status: 'active' | 'inactive' | 'suspended';
}

export class TenantStatusDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  databaseName: string;

  @ApiProperty()
  status: 'connected' | 'disconnected' | 'error';

  @ApiProperty()
  databaseSize?: string;

  @ApiProperty()
  connectionCount?: number;

  @ApiProperty({ description: 'Whether the database schema is properly initialized' })
  schemaInitialized: boolean;

  @ApiProperty({ description: 'Number of tables in the tenant database' })
  tableCount: number;

  @ApiProperty()
  lastChecked: Date;
}
