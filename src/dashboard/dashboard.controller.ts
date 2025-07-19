import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { RevenueSummaryQueryDto, RevenueSummaryResponseDto } from './dto/revenue-summary.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { ResponseService } from '../common';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PermissionResource, PermissionAction } from '../permissions/enums/permission.enum';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly responseService: ResponseService,
  ) {}

  @Get('revenue-summary')
  @RequirePermissions(PermissionResource.DASHBOARD, PermissionAction.READ)
  @ApiOperation({
    summary: 'Get revenue summary',
    description: 'Returns a summary of revenue, profit, cost, tax, discount, and product sales for the given store and date range. Start date is required, end date defaults to today if not provided. Used for powering dashboard summary cards, tables, and drill-downs.',
  })
  @ApiQuery({
    name: 'storeId',
    required: true,
    description: 'The store to fetch data for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: true,
    description: 'Start date (inclusive) - Required',
    example: '2024-06-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'End date (inclusive) - Optional, defaults to today if not provided',
    example: '2024-06-30T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Revenue summary retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            totalRevenue: { type: 'number', example: 12500.50 },
            totalProfit: { type: 'number', example: 3200.75 },
            totalCost: { type: 'number', example: 9300.00 },
            totalTax: { type: 'number', example: 500.00 },
            totalDiscount: { type: 'number', example: 200.00 },
            totalProductsSold: { type: 'number', example: 350 },
            sales: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  saleId: { type: 'string', example: 'sale-uuid-1' },
                  date: { type: 'string', example: '2024-06-01T12:34:56Z' },
                  customerName: { type: 'string', example: 'John Doe' },
                  totalAmount: { type: 'number', example: 250.00 },
                  tax: { type: 'number', example: 10.00 },
                  discount: { type: 'number', example: 5.00 },
                  profit: { type: 'number', example: 60.00 },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        productId: { type: 'string', example: 'prod-uuid-1' },
                        productName: { type: 'string', example: 'Product A' },
                        quantity: { type: 'number', example: 2 },
                        costPrice: { type: 'number', example: 40.00 },
                        sellingPrice: { type: 'number', example: 60.00 },
                        discountApplied: { type: 'number', example: 2.50 },
                        taxApplied: { type: 'number', example: 2.00 },
                        profit: { type: 'number', example: 40.00 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters or missing required dateFrom parameter',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getRevenueSummary(@Query() query: RevenueSummaryQueryDto) {
    try {
      const result = await this.dashboardService.getRevenueSummary(query);
      return this.responseService.success(
        'Revenue summary retrieved successfully',
        result,
        200,
      );
    } catch (error) {
      return this.responseService.error(
        error.message || 'Failed to retrieve revenue summary',
        error.status || 500,
      );
    }
  }
} 