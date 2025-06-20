import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { BaseAuthController, ResponseService } from '../common';
import { PermissionEndpoint } from '../common/decorators/permission-endpoint.decorator';
import { PermissionsService } from './permissions.service';
import {
  CreatePermissionDto,
  BulkAssignPermissionsDto,
  CreateRoleTemplateDto,
  AssignRoleTemplateDto,
  CheckPermissionDto,
  RevokePermissionDto,
  UpdateRoleTemplateDto,
} from './dto/permission.dto';

@ApiTags('permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController extends BaseAuthController {
  constructor(
    private readonly permissionsService: PermissionsService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  // User Permission Management
  @PermissionEndpoint.GetUserPermissions()
  @Get('user/:userId')
  async getUserPermissions(
    @Param('userId') userId: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.handleServiceOperation(
      () => this.permissionsService.getUserPermissions(userId, storeId),
      'User permissions retrieved successfully',
    );
  }

  @PermissionEndpoint.AssignPermission(CreatePermissionDto)
  @Post('assign')
  async assignPermission(
    @Body() dto: CreatePermissionDto,
    @Request() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.permissionsService.assignPermission(dto, req.user.id),
      'Permission assigned successfully',
      201,
    );
  }

  @PermissionEndpoint.RevokePermission(RevokePermissionDto)
  @Delete('revoke')
  async revokePermission(
    @Body() dto: RevokePermissionDto,
    @Request() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.permissionsService.revokePermission(dto, req.user.id),
      'Permission revoked successfully',
    );
  }

  @PermissionEndpoint.BulkAssignPermissions(BulkAssignPermissionsDto)
  @Post('bulk-assign')
  async bulkAssignPermissions(
    @Body() dto: BulkAssignPermissionsDto,
    @Request() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.permissionsService.bulkAssignPermissions(dto, req.user.id),
      'Permissions assigned successfully',
      201,
    );
  }

  @PermissionEndpoint.CheckPermission(CheckPermissionDto)
  @Post('check')
  async checkPermission(@Body() dto: CheckPermissionDto, @Request() req: any) {
    return this.handleServiceOperation(
      () => this.permissionsService.checkPermission(dto, req.user.id),
      'Permission check completed',
    );
  }

  // Role Template Management
  @PermissionEndpoint.GetRoleTemplates()
  @Get('templates')
  async getRoleTemplates() {
    return this.handleServiceOperation(
      () => this.permissionsService.getRoleTemplates(),
      'Role templates retrieved successfully',
    );
  }

  @PermissionEndpoint.CreateRoleTemplate(CreateRoleTemplateDto)
  @Post('templates')
  async createRoleTemplate(
    @Body() dto: CreateRoleTemplateDto,
    @Request() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.permissionsService.createRoleTemplate(dto, req.user.id),
      'Role template created successfully',
      201,
    );
  }

  @PermissionEndpoint.UpdateRoleTemplate(UpdateRoleTemplateDto)
  @Put('templates/:id')
  async updateRoleTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateRoleTemplateDto,
    @Request() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.permissionsService.updateRoleTemplate(id, dto, req.user.id),
      'Role template updated successfully',
    );
  }

  @PermissionEndpoint.DeleteRoleTemplate()
  @Delete('templates/:id')
  async deleteRoleTemplate(@Param('id') id: string, @Request() req: any) {
    return this.handleServiceOperation(
      () => this.permissionsService.deleteRoleTemplate(id, req.user.id),
      'Role template deleted successfully',
    );
  }

  @PermissionEndpoint.AssignRoleTemplate(AssignRoleTemplateDto)
  @Post('templates/assign')
  async assignRoleTemplate(
    @Body() dto: AssignRoleTemplateDto,
    @Request() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.permissionsService.assignRoleTemplate(dto, req.user.id),
      'Role template assigned successfully',
      201,
    );
  }
  // Utility endpoints
  @PermissionEndpoint.GetUserPermissions()
  @Get('my-permissions')
  async getMyPermissions(
    @Request() req: any,
    @Query('storeId') storeId?: string,
  ) {
    return this.handleServiceOperation(
      () => this.permissionsService.getUserPermissions(req.user.id, storeId),
      'Your permissions retrieved successfully',
    );
  }

  @PermissionEndpoint.CheckPermission(CheckPermissionDto)
  @Post('check-my-permission')
  async checkMyPermission(
    @Body() dto: CheckPermissionDto,
    @Request() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.permissionsService.checkPermission(dto, req.user.id),
      'Permission check completed',
    );
  }
}
