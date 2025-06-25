import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsArray } from 'class-validator';

export enum ResourceType {
  PRODUCT = 'PRODUCT',
  SUPPLIER = 'SUPPLIER',
  STORE = 'STORE',
  EMPLOYEE = 'EMPLOYEE',
  INVENTORY = 'INVENTORY',
}

export enum ActionType {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export class ResourcePermissionDto {
  @ApiProperty({
    enum: ResourceType,
    description: 'Resource type for permission',
    example: ResourceType.PRODUCT,
  })
  @IsEnum(ResourceType)
  resource: ResourceType;

  @ApiProperty({
    enum: ActionType,
    isArray: true,
    description: 'Array of actions allowed on the resource',
    example: [ActionType.READ, ActionType.CREATE],
  })
  @IsArray()
  @IsEnum(ActionType, { each: true })
  actions: ActionType[];
}
