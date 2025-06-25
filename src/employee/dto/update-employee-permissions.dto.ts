import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmployeePermissionDto } from './employee-permission.dto';

export class UpdateEmployeePermissionsDto {
  @ApiProperty({ type: [EmployeePermissionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployeePermissionDto)
  permissions: EmployeePermissionDto[];
}
