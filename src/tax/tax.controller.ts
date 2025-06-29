import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
} from '@nestjs/common';
import { TaxService } from './tax.service';
import {
  CreateTaxTypeDto,
  UpdateTaxTypeDto,
  CreateTaxCodeDto,
  UpdateTaxCodeDto,
  CreateRegionDto,
  UpdateRegionDto,
  CreateTaxRateDto,
  UpdateTaxRateDto,
  CreateTaxAssignmentDto,
  UpdateTaxAssignmentDto,
  CreateTaxBundleDto,
} from './dto';
import { UpdateTaxBundleDto } from './dto/update-tax-bundle.dto';
import { ResponseService, BaseAuthController } from '../common';
import { ApiTags } from '@nestjs/swagger';
import { BulkAssignTaxDto } from './dto';

@ApiTags('tax')
@Controller('tax')
export class TaxController extends BaseAuthController {
  constructor(
    private readonly taxService: TaxService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }

  // --- TaxType Endpoints ---
  @Post('type')
  async createTaxType(@Body() dto: CreateTaxTypeDto) {
    return this.handleServiceOperation(
      () => this.taxService.createTaxType(dto),
      'TaxType created successfully',
      201,
    );
  }

  @Get('type')
  async getAllTaxTypes() {
    return this.handleServiceOperation(
      () => this.taxService.getAllTaxTypes(),
      'TaxTypes retrieved successfully',
    );
  }

  @Get('type/:id')
  async getTaxTypeById(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.getTaxTypeById(id),
      'TaxType retrieved successfully',
    );
  }

  @Put('type/:id')
  async updateTaxType(@Param('id') id: string, @Body() dto: UpdateTaxTypeDto) {
    return this.handleServiceOperation(
      () => this.taxService.updateTaxType(id, dto),
      'TaxType updated successfully',
    );
  }

  @Delete('type/:id')
  async deleteTaxType(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.deleteTaxType(id),
      'TaxType deleted successfully',
    );
  }

  // --- TaxCode Endpoints ---
  @Post('code')
  async createTaxCode(@Body() dto: CreateTaxCodeDto) {
    return this.handleServiceOperation(
      () => this.taxService.createTaxCode(dto),
      'TaxCode created successfully',
      201,
    );
  }

  @Get('code')
  async getAllTaxCodes() {
    return this.handleServiceOperation(
      () => this.taxService.getAllTaxCodes(),
      'TaxCodes retrieved successfully',
    );
  }

  @Get('code/:id')
  async getTaxCodeById(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.getTaxCodeById(id),
      'TaxCode retrieved successfully',
    );
  }

  @Put('code/:id')
  async updateTaxCode(@Param('id') id: string, @Body() dto: UpdateTaxCodeDto) {
    return this.handleServiceOperation(
      () => this.taxService.updateTaxCode(id, dto),
      'TaxCode updated successfully',
    );
  }

  @Delete('code/:id')
  async deleteTaxCode(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.deleteTaxCode(id),
      'TaxCode deleted successfully',
    );
  }

  // --- Region Endpoints ---
  @Post('region')
  async createRegion(@Body() dto: CreateRegionDto) {
    return this.handleServiceOperation(
      () => this.taxService.createRegion(dto),
      'Region created successfully',
      201,
    );
  }

  @Get('region')
  async getAllRegions() {
    return this.handleServiceOperation(
      () => this.taxService.getAllRegions(),
      'Regions retrieved successfully',
    );
  }

  @Get('region/:id')
  async getRegionById(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.getRegionById(id),
      'Region retrieved successfully',
    );
  }

  @Put('region/:id')
  async updateRegion(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.handleServiceOperation(
      () => this.taxService.updateRegion(id, dto),
      'Region updated successfully',
    );
  }

  @Delete('region/:id')
  async deleteRegion(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.deleteRegion(id),
      'Region deleted successfully',
    );
  }

  // --- TaxRate Endpoints ---
  @Post('rate')
  async createTaxRate(@Body() dto: CreateTaxRateDto) {
    return this.handleServiceOperation(
      () => this.taxService.createTaxRate(dto),
      'TaxRate created successfully',
      201,
    );
  }

  @Get('rate')
  async getAllTaxRates() {
    return this.handleServiceOperation(
      () => this.taxService.getAllTaxRates(),
      'TaxRates retrieved successfully',
    );
  }

  @Get('rate/:id')
  async getTaxRateById(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.getTaxRateById(id),
      'TaxRate retrieved successfully',
    );
  }

  @Put('rate/:id')
  async updateTaxRate(@Param('id') id: string, @Body() dto: UpdateTaxRateDto) {
    return this.handleServiceOperation(
      () => this.taxService.updateTaxRate(id, dto),
      'TaxRate updated successfully',
    );
  }

  @Delete('rate/:id')
  async deleteTaxRate(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.deleteTaxRate(id),
      'TaxRate deleted successfully',
    );
  }

  // --- TaxAssignment Endpoints ---
  @Post('assignment')
  async createTaxAssignment(@Body() dto: CreateTaxAssignmentDto) {
    return this.handleServiceOperation(
      () => this.taxService.createTaxAssignment(dto),
      'TaxAssignment created successfully',
      201,
    );
  }

  @Get('assignment')
  async getAllTaxAssignments() {
    return this.handleServiceOperation(
      () => this.taxService.getAllTaxAssignments(),
      'TaxAssignments retrieved successfully',
    );
  }

  @Get('assignment/:id')
  async getTaxAssignmentById(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.getTaxAssignmentById(id),
      'TaxAssignment retrieved successfully',
    );
  }

  @Put('assignment/:id')
  async updateTaxAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateTaxAssignmentDto,
  ) {
    return this.handleServiceOperation(
      () => this.taxService.updateTaxAssignment(id, dto),
      'TaxAssignment updated successfully',
    );
  }

  @Delete('assignment/:id')
  async deleteTaxAssignment(@Param('id') id: string) {
    return this.handleServiceOperation(
      () => this.taxService.deleteTaxAssignment(id),
      'TaxAssignment deleted successfully',
    );
  }

  // --- TaxBundle Endpoints ---
  @Post('bundle')
  async createTaxBundle(@Body() dto: CreateTaxBundleDto) {
    return this.handleServiceOperation(
      () => this.taxService.createTaxBundle(dto),
      'Tax bundle created successfully',
      201,
    );
  }

  @Put('bundle/:taxCodeId')
  async updateTaxBundle(
    @Param('taxCodeId') taxCodeId: string,
    @Body() dto: UpdateTaxBundleDto,
  ) {
    return this.handleServiceOperation(
      () => this.taxService.updateTaxBundle(taxCodeId, dto),
      'Tax bundle updated successfully',
    );
  }

  @Delete('bundle/:taxCodeId')
  async deleteTaxBundle(@Param('taxCodeId') taxCodeId: string) {
    return this.handleServiceOperation(
      () => this.taxService.deleteTaxBundle(taxCodeId),
      'Tax bundle deleted successfully',
    );
  }

  /**
   * Bulk assign taxes to multiple entities (product, category, store, supplier) in one call.
   */
  @Post('assign/bulk')
  async bulkAssignTaxes(@Body() dto: BulkAssignTaxDto) {
    return this.handleServiceOperation(
      () => this.taxService.bulkAssignTaxes(dto.assignments),
      'Taxes assigned successfully',
      201,
    );
  }
}
