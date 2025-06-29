import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { Version } from '@nestjs/common';

const standardErrorResponses = () => [
  ApiResponse({ status: 400, description: 'Bad request - validation failed' }),
  ApiResponse({ status: 401, description: 'Unauthorized' }),
  ApiResponse({ status: 403, description: 'Forbidden' }),
  ApiResponse({ status: 404, description: 'Not found' }),
  ApiResponse({ status: 500, description: 'Internal server error' }),
];

export const TaxEndpoint = {
  CalculateByEntity: (dtoType: any) =>
    applyDecorators(
      ApiTags('tax'),
      ApiOperation({ 
        summary: 'Calculate tax by entity type',
        description: 'Calculate tax for a specific entity (product, category, store, supplier)'
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({ status: 200, description: 'Tax calculated successfully' }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  CalculateComprehensive: (dtoType: any) =>
    applyDecorators(
      ApiTags('tax'),
      ApiOperation({ 
        summary: 'Calculate comprehensive tax',
        description: 'Calculate tax considering all applicable entity types with precedence'
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({ status: 200, description: 'Tax calculated successfully' }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  GetTaxAssignments: () =>
    applyDecorators(
      ApiTags('tax'),
      ApiOperation({ 
        summary: 'Get tax assignments by entity',
        description: 'Retrieve all tax assignments for a specific entity'
      }),
      ApiResponse({ status: 200, description: 'Tax assignments retrieved successfully' }),
      ...standardErrorResponses(),
      Version('1'),
    ),
};