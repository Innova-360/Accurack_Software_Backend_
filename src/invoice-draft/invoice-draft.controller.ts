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
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceDraftService } from './invoice-draft.service';
import { InvoiceDraftVersionService } from './invoice-draft-version.service';
import {
  CreateInvoiceDraftDto,
  UpdateInvoiceDraftDto,
  GetDraftsDto,
  SubmitDraftDto,
  ApproveDraftDto,
  RejectDraftDto,
} from './dto/invoice-draft.dto';
import { ResponseService } from '../common';
import { BaseInvoiceController } from '../common/decorators/base-invoice.controller';
import { InvoiceDraftEndpoint } from '../common/decorators/invoice-draft-endpoint.decorator';

@ApiTags('invoice-drafts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('invoice-drafts')
export class InvoiceDraftController extends BaseInvoiceController {
  constructor(
    private invoiceDraftService: InvoiceDraftService,
    private versionService: InvoiceDraftVersionService,
    protected responseService: ResponseService,
  ) {
    super(responseService);
  }

  @InvoiceDraftEndpoint.CreateDraft(CreateInvoiceDraftDto)
  @Post()
  async createDraft(@Body() dto: CreateInvoiceDraftDto, @Req() req: any) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.createDraft(dto, req.user),
      'Draft created successfully',
      201,
    );
  }

  @InvoiceDraftEndpoint.GetDrafts()
  @Get()
  async getDrafts(@Query() dto: GetDraftsDto, @Req() req: any) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.getDrafts(dto, req.user),
      'Drafts retrieved successfully',
    );
  }

  @InvoiceDraftEndpoint.GetDraft()
  @Get(':id')
  async getDraft(@Param('id') id: string, @Req() req: any) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.getDraft(id, req.user),
      'Draft retrieved successfully',
    );
  }

  @InvoiceDraftEndpoint.UpdateDraft(UpdateInvoiceDraftDto)
  @Put(':id')
  async updateDraft(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDraftDto,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.updateDraft(id, dto, req.user),
      'Draft updated successfully',
    );
  }

  @InvoiceDraftEndpoint.DeleteDraft()
  @Delete(':id')
  async deleteDraft(@Param('id') id: string, @Req() req: any) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.deleteDraft(id, req.user),
      'Draft deleted successfully',
    );
  }

  @InvoiceDraftEndpoint.SubmitDraft(SubmitDraftDto)
  @Post(':id/submit')
  async submitDraft(
    @Param('id') id: string,
    @Body() dto: SubmitDraftDto,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.submitDraft(id, dto, req.user),
      'Draft submitted for approval',
    );
  }

  @InvoiceDraftEndpoint.ApproveDraft(ApproveDraftDto)
  @Post(':id/approve')
  async approveDraft(
    @Param('id') id: string,
    @Body() dto: ApproveDraftDto,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.approveDraft(id, dto, req.user),
      'Draft approved successfully',
    );
  }

  @InvoiceDraftEndpoint.RejectDraft(RejectDraftDto)
  @Post(':id/reject')
  async rejectDraft(
    @Param('id') id: string,
    @Body() dto: RejectDraftDto,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.rejectDraft(id, dto, req.user),
      'Draft rejected',
    );
  }

  @InvoiceDraftEndpoint.GetVersionHistory()
  @Get(':id/versions')
  async getVersionHistory(@Param('id') id: string, @Req() req: any) {
    return this.handleServiceOperation(
      () => this.versionService.getVersionHistory(id, req.user),
      'Version history retrieved successfully',
    );
  }

  @InvoiceDraftEndpoint.RevertToVersion()
  @Post(':id/revert/:versionId')
  async revertToVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.versionService.revertToVersion(id, versionId, req.user),
      'Draft reverted to previous version',
    );
  }

  @InvoiceDraftEndpoint.CompareVersions()
  @Get(':id/versions/compare/:version1Id/:version2Id')
  async compareVersions(
    @Param('id') id: string,
    @Param('version1Id') version1Id: string,
    @Param('version2Id') version2Id: string,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.versionService.compareVersions(id, version1Id, version2Id, req.user),
      'Version comparison completed',
    );
  }

  @InvoiceDraftEndpoint.FinalizeDraft(ApproveDraftDto)
  @Post(':id/finalize')
  async finalizeDraft(
    @Param('id') id: string,
    @Body() dto: ApproveDraftDto,
    @Req() req: any,
  ) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.finalizeDraft(id, dto, req.user),
      'Invoice created successfully',
    );
  }

  @InvoiceDraftEndpoint.GetDraft()
  @Get(':id/status')
  async getDraftStatus(@Param('id') id: string, @Req() req: any) {
    return this.handleServiceOperation(
      () => this.invoiceDraftService.getDraftStatus(id, req.user),
      'Draft status retrieved successfully',
    );
  }
}
