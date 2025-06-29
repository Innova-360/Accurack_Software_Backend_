import { PartialType } from '@nestjs/swagger';
import { CreateTaxAssignmentDto } from './create-tax-assignment.dto';

export class UpdateTaxAssignmentDto extends PartialType(
  CreateTaxAssignmentDto,
) {}
