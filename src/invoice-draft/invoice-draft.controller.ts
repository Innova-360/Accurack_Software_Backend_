import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InvoiceDraftService } from './invoice-draft.service';
import {
  CreateInvoiceDraftDto,
  UpdateInvoiceDraftDto,
  GetDraftsDto,
  SubmitDraftDto,
  ApproveDraftDto,
  RejectDraftDto,
  ConvertToDraftDto,
} from './dto/invoice-draft.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { BaseAuthController, ResponseService } from '../common';

@ApiTags('invoice-drafts')
@ApiBearerAuth()
@Controller({ path: 'invoice-drafts', version: '1' })
@UseGuards(JwtAuthGuard)
export class InvoiceDraftController extends BaseAuthController {
  constructor(
    private readonly invoiceDraftService: InvoiceDraftService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  @ApiOperation({ summary: 'Create a new invoice draft' })
  @ApiBody({ type: CreateInvoiceDraftDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Invoice draft created successfully',
    schema: {
      example: {
        success: true,
        message: 'Invoice draft created successfully',
        data: {
          id: 'draft-uuid-123',
          draftNumber: 'DRAFT-20250718-001',
          version: 1,
          status: 'DRAFT',
          storeId: 'store-uuid-123',
          totalAmount: 1500.0,
          // ... other draft fields
        },
        status: 201,
        timestamp: '2025-07-18T10:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Store or customer not found' })
  @Post()
  async createDraft(@Body() dto: CreateInvoiceDraftDto, @Req() req: any) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.createDraft(dto, req.user),
      'Invoice draft created successfully',
      201,
    );
  }

  @ApiOperation({ summary: 'Get all invoice drafts with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'], description: 'Filter by status' })
  @ApiQuery({ name: 'storeId', required: false, type: String, description: 'Filter by store ID' })
  @ApiQuery({ name: 'customerId', required: false, type: String, description: 'Filter by customer ID' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Filter to date (ISO string)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search in draft number, customer name, or notes' })
  @ApiResponse({ 
    status: 200, 
    description: 'Invoice drafts retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Invoice drafts retrieved successfully',
        data: {
          drafts: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0
        },
        status: 200,
        timestamp: '2025-07-18T10:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @Get()
  async getDrafts(@Query() dto: GetDraftsDto, @Req() req: any) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.getDrafts(dto, req.user),
      'Invoice drafts retrieved successfully',
    );
  }

  @ApiOperation({ summary: 'Get a specific invoice draft by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice draft ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Invoice draft retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'Invoice draft retrieved successfully',
        data: {
          id: 'draft-uuid-123',
          draftNumber: 'DRAFT-20250718-001',
          version: 1,
          status: 'DRAFT',
          // ... full draft details with relations
        },
        status: 200,
        timestamp: '2025-07-18T10:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invoice draft not found' })
  @Get(':id')
  async getDraft(@Param('id') id: string, @Req() req: any) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.getDraft(id, req.user),
      'Invoice draft retrieved successfully',
    );
  }

  @ApiOperation({ summary: 'Update an existing invoice draft' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice draft ID' })
  @ApiBody({ type: UpdateInvoiceDraftDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Invoice draft updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Invoice draft updated successfully',
        data: {
          id: 'draft-uuid-123',
          version: 2,
          // ... updated draft fields
        },
        status: 200,
        timestamp: '2025-07-18T10:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed or draft cannot be updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invoice draft not found' })
  @Put(':id')
  async updateDraft(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDraftDto,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.updateDraft(id, dto, req.user),
      'Invoice draft updated successfully',
    );
  }

  @ApiOperation({ summary: 'Delete an invoice draft' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice draft ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Invoice draft deleted successfully',
    schema: {
      example: {
        success: true,
        message: 'Invoice draft deleted successfully',
        data: {
          message: 'Draft deleted successfully'
        },
        status: 200,
        timestamp: '2025-07-18T10:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - draft cannot be deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invoice draft not found' })
  @Delete(':id')
  async deleteDraft(@Param('id') id: string, @Req() req: any) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.deleteDraft(id, req.user),
      'Invoice draft deleted successfully',
    );
  }

  @ApiOperation({ summary: 'Submit invoice draft for approval' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice draft ID' })
  @ApiBody({ type: SubmitDraftDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Invoice draft submitted for approval',
    schema: {
      example: {
        success: true,
        message: 'Invoice draft submitted for approval',
        data: {
          message: 'Draft submitted for approval',
          draft: {
            id: 'draft-uuid-123',
            status: 'PENDING_APPROVAL',
            submittedForApprovalAt: '2025-07-18T10:00:00Z',
            // ... other fields
          }
        },
        status: 200,
        timestamp: '2025-07-18T10:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - draft cannot be submitted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invoice draft not found' })
  @Post(':id/submit')
  async submitForApproval(
    @Param('id') id: string,
    @Body() dto: SubmitDraftDto,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.submitForApproval(id, dto, req.user),
      'Invoice draft submitted for approval',
    );
  }

  @ApiOperation({ summary: 'Approve an invoice draft' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice draft ID' })
  @ApiBody({ type: ApproveDraftDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Invoice draft approved successfully',
    schema: {
      example: {
        success: true,
        message: 'Invoice draft approved successfully',
        data: {
          message: 'Draft approved',
          draft: {
            id: 'draft-uuid-123',
            status: 'APPROVED',
            approvedAt: '2025-07-18T10:00:00Z',
            // ... other fields
          }
        },
        status: 200,
        timestamp: '2025-07-18T10:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - draft cannot be approved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invoice draft not found' })
  @Post(':id/approve')
  async approveDraft(
    @Param('id') id: string,
    @Body() dto: ApproveDraftDto,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.approveDraft(id, dto, req.user),
      'Invoice draft approved and invoice created successfully',
    );
  }

  @ApiOperation({ summary: 'Reject an invoice draft' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice draft ID' })
  @ApiBody({ type: RejectDraftDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Invoice draft rejected',
    schema: {
      example: {
        success: true,
        message: 'Invoice draft rejected',
        data: {
          message: 'Draft rejected',
          draft: {
            id: 'draft-uuid-123',
            status: 'REJECTED',
            rejectedAt: '2025-07-18T10:00:00Z',
            rejectionReason: 'Missing required information',
            // ... other fields
          }
        },
        status: 200,
        timestamp: '2025-07-18T10:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - draft cannot be rejected' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invoice draft not found' })
  @Post(':id/reject')
  async rejectDraft(
    @Param('id') id: string,
    @Body() dto: RejectDraftDto,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.rejectDraft(id, dto, req.user),
      'Invoice draft rejected',
    );
  }

  @ApiOperation({ summary: 'Convert an existing invoice to draft' })
  @ApiParam({ name: 'invoiceId', type: String, description: 'Original invoice ID' })
  @ApiBody({ type: ConvertToDraftDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Invoice converted to draft successfully',
    schema: {
      example: {
        success: true,
        message: 'Invoice converted to draft successfully',
        data: {
          message: 'Invoice converted to draft successfully',
          draft: {
            id: 'draft-uuid-123',
            draftNumber: 'DRAFT-20250718-001',
            originalInvoiceId: 'invoice-uuid-456',
            status: 'DRAFT',
            // ... other draft fields
          }
        },
        status: 201,
        timestamp: '2025-07-18T10:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invoice already converted or invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @Post('convert/:invoiceId')
  async convertInvoiceToDraft(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: ConvertToDraftDto,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.convertInvoiceToDraft(invoiceId, dto, req.user),
      'Invoice converted to draft successfully',
      201,
    );
  }
}
