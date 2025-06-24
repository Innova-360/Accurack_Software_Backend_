import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Patch,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto, UpdateTenantStatusDto } from './dto/tenant.dto';
import { TenantEndpoint, ResponseService, UseMasterDB } from '../common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';

ApiTags('Tenant');
@Controller('tenant')
@UseMasterDB() // Always use master database for tenant management
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly responseService: ResponseService,
  ) {}
  @TenantEndpoint.CreateTenant(CreateTenantDto)
  @Post('create')
  async createTenant(@Body() createTenantDto: CreateTenantDto) {
    const tenant = await this.tenantService.createTenant(createTenantDto);
    return this.responseService.created('Tenant created successfully', tenant);
  }

  @TenantEndpoint.GetAllTenants()
  @Get('list')
  async getAllTenants() {
    const tenants = await this.tenantService.getAllTenants();
    return this.responseService.success(
      'Tenants retrieved successfully',
      tenants,
    );
  }

  @TenantEndpoint.GetTenantById()
  @Get(':tenantId')
  async getTenant(@Param('tenantId') tenantId: string) {
    const tenant = await this.tenantService.getTenant(tenantId);
    return this.responseService.success(
      'Tenant retrieved successfully',
      tenant,
    );
  }

  @TenantEndpoint.GetTenantDatabaseStatus()
  @Get(':tenantId/status')
  async getTenantStatus(@Param('tenantId') tenantId: string) {
    const status = await this.tenantService.getTenantStatus(tenantId);
    return this.responseService.success(
      'Tenant status retrieved successfully',
      status,
    );
  }

  @TenantEndpoint.UpdateTenantStatus(UpdateTenantStatusDto)
  @Patch(':tenantId/status')
  async updateTenantStatus(
    @Param('tenantId') tenantId: string,
    @Body() body: UpdateTenantStatusDto,
  ) {
    const tenant = await this.tenantService.updateTenantStatus(
      tenantId,
      body.status,
    );
    return this.responseService.success(
      'Tenant status updated successfully',
      tenant,
    );
  }
  @TenantEndpoint.DeleteTenant()
  @Delete(':tenantId')
  async deleteTenant(@Param('tenantId') tenantId: string) {
    await this.tenantService.deleteTenant(tenantId);
    return this.responseService.success('Tenant deleted successfully');
  }
  @ApiOperation({
    summary: 'Safely delete a tenant with optional soft delete',
    description: 'Delete a tenant with validation and optional soft delete capability. Use force=true to bypass data checks.',
  })
  @ApiParam({
    name: 'tenantId',
    description: 'The unique identifier of the tenant',
    required: true,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        softDelete: {
          type: 'boolean',
          description: 'If true, tenant will be deactivated instead of deleted',
          default: false,
        },
        force: {
          type: 'boolean',
          description: 'If true, bypass data existence checks and force deletion',
          default: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant deleted or deactivated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        deletedRecords: {
          type: 'object',
          properties: {
            users: { type: 'number' },
            stores: { type: 'number' },
            products: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Tenant has active data' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @Post(':tenantId/delete-safe')
  async deleteTenantSafe(
    @Param('tenantId') tenantId: string,
    @Body() options?: { softDelete?: boolean; force?: boolean },
  ) {
    try {
      const result = await this.tenantService.deleteTenantSafe(
        tenantId,
        options,
      );

      return this.responseService.success(result.message, result);
    } catch (error) {
      return this.responseService.error(error.repsonse.message, 400, error);
    }
  }

  @TenantEndpoint.InitializeTenantSchema()
  @Post(':tenantId/initialize-schema')
  async initializeTenantSchema(@Param('tenantId') tenantId: string) {
    const result = await this.tenantService.initializeTenantSchema(tenantId);
    return this.responseService.success(
      'Tenant schema initialized successfully',
      result,
    );
  }

  @Get(':tenantId/test-permissions')
  async testTenantPermissions(@Param('tenantId') tenantId: string) {
    const result = await this.tenantService.testTenantPermissions(tenantId);
    return this.responseService.success('Tenant permissions tested', result);
  }

  @Get(':tenantId/connection-details')
  async getTenantConnectionDetails(@Param('tenantId') tenantId: string) {
    const result =
      await this.tenantService.getTenantConnectionDetails(tenantId);
    return this.responseService.success(
      'Tenant connection details retrieved',
      result,
    );
  }

  @Get(':tenantId/delete-preview')
  async previewTenantDeletion(@Param('tenantId') tenantId: string) {
    const result = await this.tenantService.previewTenantDeletion(tenantId);
    return this.responseService.success(
      'Tenant deletion preview generated',
      result,
    );
  }
}
