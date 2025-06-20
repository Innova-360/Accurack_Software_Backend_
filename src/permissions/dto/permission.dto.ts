import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsDateString,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '../enums/permission.enum';

// Custom validator for action field
export function IsValidAction(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidAction',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          // Allow "*" for all actions
          if (value === '*') return true;

          // Allow single action
          if (
            typeof value === 'string' &&
            Object.values(PermissionAction).includes(value as PermissionAction)
          ) {
            return true;
          }

          // Allow array of actions
          if (Array.isArray(value)) {
            return value.every(
              (action) =>
                typeof action === 'string' &&
                Object.values(PermissionAction).includes(
                  action as PermissionAction,
                ),
            );
          }

          return false;
        },
        defaultMessage(args: ValidationArguments) {
          return 'action must be a valid PermissionAction, array of PermissionActions, or "*"';
        },
      },
    });
  };
}

export class PermissionActionDto {
  @ApiProperty({
    enum: PermissionResource,
    example: PermissionResource.INVENTORY,
  })
  @IsEnum(PermissionResource)
  resource: PermissionResource;

  @ApiProperty({ enum: PermissionAction, example: PermissionAction.READ })
  @IsEnum(PermissionAction)
  action: PermissionAction;

  @ApiPropertyOptional({
    enum: PermissionScope,
    example: PermissionScope.STORE,
  })
  @IsEnum(PermissionScope)
  @IsOptional()
  scope?: PermissionScope;
}

// New grouped permission response DTO
export class GroupedPermissionDto {
  @ApiProperty({
    enum: PermissionResource,
    example: PermissionResource.INVENTORY,
  })
  resource: PermissionResource;

  @ApiProperty({
    type: [String],
    example: ['read', 'create', 'update'],
    description: 'Array of actions for this resource',
  })
  actions: string[];

  @ApiPropertyOptional({ example: 'store123' })
  storeId?: string;

  @ApiPropertyOptional({ example: 'resource123' })
  resourceId?: string;

  @ApiPropertyOptional({ example: { timeRestricted: true } })
  conditions?: Record<string, any>;

  @ApiPropertyOptional()
  expiresAt?: string;
}

export class CreatePermissionDto {
  @ApiProperty({ example: 'user123' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ example: 'store456' })
  @IsString()
  @IsOptional()
  storeId?: string;

  @ApiProperty({
    enum: PermissionResource,
    example: PermissionResource.STORE,
  })
  @IsEnum(PermissionResource)
  resource: PermissionResource;

  @ApiProperty({
    description: 'Single action, array of actions, or "*" for all actions',
    examples: {
      single: { value: 'read', description: 'Single action' },
      multiple: {
        value: ['create', 'read', 'update'],
        description: 'Multiple actions',
      },
      all: { value: '*', description: 'All actions' },
    },
  })
  @IsValidAction()
  action: PermissionAction | PermissionAction[] | '*';

  @ApiPropertyOptional({ example: 'resource123' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  granted?: boolean;

  @ApiPropertyOptional({ example: { timeRestricted: true } })
  @IsOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class BulkAssignPermissionsDto {
  @ApiProperty({ type: [String], example: ['user1', 'user2'] })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ type: [PermissionActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionActionDto)
  permissions: PermissionActionDto[];

  @ApiPropertyOptional({ example: 'store123' })
  @IsString()
  @IsOptional()
  storeId?: string;
}

export class CreateRoleTemplateDto {
  @ApiProperty({ example: 'Store Manager' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Full access to store operations' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [PermissionActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionActionDto)
  permissions: PermissionActionDto[];

  @ApiPropertyOptional({ example: 'parent_role_id' })
  @IsString()
  @IsOptional()
  inheritsFrom?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  priority?: number;
}

export class AssignRoleTemplateDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ example: 'role_template_id' })
  @IsString()
  roleTemplateId: string;

  @ApiPropertyOptional({ example: 'store123' })
  @IsString()
  @IsOptional()
  storeId?: string;
}

export class CheckPermissionDto {
  @ApiProperty({
    enum: PermissionResource,
    example: PermissionResource.INVENTORY,
  })
  @IsEnum(PermissionResource)
  resource: PermissionResource;

  @ApiProperty({ enum: PermissionAction, example: PermissionAction.READ })
  @IsEnum(PermissionAction)
  action: PermissionAction;

  @ApiPropertyOptional({ example: 'store123' })
  @IsString()
  @IsOptional()
  storeId?: string;

  @ApiPropertyOptional({ example: 'resource123' })
  @IsString()
  @IsOptional()
  resourceId?: string;
}

export class RevokePermissionDto {
  @ApiProperty({ example: 'user123' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: PermissionResource })
  @IsEnum(PermissionResource)
  resource: PermissionResource;

  @ApiProperty({
    description: 'Single action, array of actions, or "*" for all actions',
    examples: {
      single: { value: 'read', description: 'Single action' },
      multiple: {
        value: ['create', 'read', 'update'],
        description: 'Multiple actions',
      },
      all: { value: '*', description: 'All actions' },
    },
  })
  @IsValidAction()
  action: PermissionAction | PermissionAction[] | '*';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  storeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  resourceId?: string;
}

export class UpdateRoleTemplateDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [PermissionActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionActionDto)
  @IsOptional()
  permissions?: PermissionActionDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  inheritsFrom?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UserPermissionsResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  storeId?: string;

  @ApiProperty({
    type: [GroupedPermissionDto],
    description: 'Permissions grouped by resource with actions array',
  })
  permissions: GroupedPermissionDto[];

  @ApiProperty()
  roleTemplates: string[];
}

export class PermissionCheckResponseDto {
  @ApiProperty()
  hasPermission: boolean;

  @ApiProperty()
  resource: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  storeId?: string;

  @ApiProperty()
  source: 'direct' | 'role' | 'inherited';
}

export class CheckUserStorePermissionDto {
  @ApiProperty({
    example: 'user123',
    description: 'ID of the user to check permissions for',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    example: 'store456',
    description: 'ID of the store to check permissions in',
  })
  @IsString()
  storeId: string;

  @ApiProperty({
    enum: PermissionResource,
    example: PermissionResource.INVENTORY,
    description: 'Resource to check permission for',
  })
  @IsEnum(PermissionResource)
  resource: PermissionResource;

  @ApiProperty({
    enum: PermissionAction,
    example: PermissionAction.CREATE,
    description: 'Action to check permission for',
  })
  @IsEnum(PermissionAction)
  action: PermissionAction;
}

export class UserStorePermissionResponseDto {
  @ApiProperty({ description: 'Whether the user has the requested permission' })
  hasPermission: boolean;

  @ApiProperty({ description: 'Source of the permission' })
  source: 'global' | 'store' | 'none';

  @ApiProperty({ description: 'User ID that was checked' })
  userId: string;

  @ApiProperty({ description: 'Store ID that was checked' })
  storeId: string;

  @ApiProperty({ description: 'Resource that was checked' })
  resource: string;

  @ApiProperty({ description: 'Action that was checked' })
  action: string;
}

export class AssignCrudPermissionsDto {
  @ApiProperty({ example: 'user123' })
  @IsString()
  userId: string;

  @ApiProperty({
    enum: PermissionResource,
    example: PermissionResource.INVENTORY,
  })
  @IsEnum(PermissionResource)
  resource: PermissionResource;

  @ApiPropertyOptional({ example: 'store456' })
  @IsString()
  @IsOptional()
  storeId?: string;

  @ApiPropertyOptional({ example: 'resource123' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({ example: { timeRestricted: true } })
  @IsOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class StorePermissionSetupDto {
  @ApiProperty({ example: 'user123' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'store456' })
  @IsString()
  storeId: string;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        resource: { enum: Object.values(PermissionResource) },
        actions: {
          oneOf: [
            { type: 'string', enum: ['*'] },
            { type: 'array', items: { enum: Object.values(PermissionAction) } },
          ],
        },
      },
    },
    example: [
      { resource: 'inventory', actions: ['read', 'create'] },
      { resource: 'store', actions: '*' },
    ],
  })
  @IsArray()
  permissions: Array<{
    resource: PermissionResource;
    actions: PermissionAction[] | '*';
  }>;
}
