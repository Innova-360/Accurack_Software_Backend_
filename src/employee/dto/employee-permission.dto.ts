import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import {
  PermissionAction,
  PermissionResource,
  PermissionScope,
} from 'src/permissions/enums/permission.enum';

export class EmployeePermissionDto {
  @ApiProperty({
    enum: PermissionResource,
    example: PermissionResource.PRODUCT,
    description: 'Resource type for the permission',
  })
  @IsEnum(PermissionResource)
  resource: PermissionResource;

  @ApiProperty({
    type: [String],
    enum: PermissionAction,
    isArray: true,
    example: [PermissionAction.READ, PermissionAction.CREATE],
    description: 'Array of actions allowed for this resource',
  })
  @IsArray()
  actions: PermissionAction[];

  @ApiProperty({
    enum: PermissionScope,
    example: PermissionScope.STORE,
    required: false,
  })
  @IsEnum(PermissionScope)
  @IsOptional()
  scope?: PermissionScope;

  @ApiProperty({
    example: 'store-123',
    description: 'Store ID if permission is store-specific',
    required: false,
  })
  @IsOptional()
  storeId?: string;
}
