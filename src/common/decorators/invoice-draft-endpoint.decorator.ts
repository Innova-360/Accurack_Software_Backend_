import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Version } from '@nestjs/common';

// Standard response schemas for Swagger
const successResponseSchema = (message: string, dataExample?: any) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: message },
    data: dataExample
      ? { type: 'object', example: dataExample }
      : { type: 'object' },
    status: { type: 'number', example: 200 },
    timestamp: { type: 'string', example: '2025-01-18T10:30:00.000Z' },
  },
});

const createdResponseSchema = (message: string, dataExample?: any) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: message },
    data: dataExample
      ? { type: 'object', example: dataExample }
      : { type: 'object' },
    status: { type: 'number', example: 201 },
    timestamp: { type: 'string', example: '2025-01-18T10:30:00.000Z' },
  },
});

const errorResponseSchema = (status: number, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: message },
    data: { type: 'null' },
    status: { type: 'number', example: status },
    timestamp: { type: 'string', example: '2025-01-18T10:30:00.000Z' },
  },
});

const standardErrorResponses = () => [
  ApiResponse({
    status: 400,
    description: 'Bad request',
    schema: errorResponseSchema(400, 'Bad request'),
  }),
  ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: errorResponseSchema(401, 'Unauthorized'),
  }),
  ApiResponse({
    status: 403,
    description: 'Forbidden',
    schema: errorResponseSchema(403, 'Forbidden'),
  }),
  ApiResponse({
    status: 404,
    description: 'Not found',
    schema: errorResponseSchema(404, 'Not found'),
  }),
  ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: errorResponseSchema(500, 'Internal server error'),
  }),
];

export const InvoiceDraftEndpoint = {
  CreateDraft: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'Create a new invoice draft' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Draft created successfully',
        schema: createdResponseSchema('Draft created successfully', {
          id: 'draft-uuid-123',
          draftNumber: 'DRAFT-20250118-001',
          version: 1,
          status: 'DRAFT',
          storeId: 'store-uuid-123',
          notes: 'Draft notes',
          createdAt: '2025-01-18T10:00:00Z',
        }),
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - validation failed',
        schema: errorResponseSchema(400, 'Validation failed'),
      }),
      ApiResponse({
        status: 404,
        description: 'Store not found',
        schema: errorResponseSchema(404, 'Store not found'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  GetDrafts: () =>
    applyDecorators(
      ApiOperation({ summary: 'Get all invoice drafts with pagination and filters' }),
      ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' }),
      ApiQuery({ name: 'limit', required: false, example: 20, description: 'Items per page' }),
      ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'], description: 'Filter by status' }),
      ApiQuery({ name: 'storeId', required: false, example: 'store-uuid-123', description: 'Filter by store ID' }),
      ApiQuery({ name: 'customerId', required: false, example: 'customer-uuid-123', description: 'Filter by customer ID' }),
      ApiQuery({ name: 'dateFrom', required: false, example: '2025-01-01T00:00:00Z', description: 'Filter from date' }),
      ApiQuery({ name: 'dateTo', required: false, example: '2025-01-31T23:59:59Z', description: 'Filter to date' }),
      ApiQuery({ name: 'search', required: false, example: 'DRAFT-2025', description: 'Search in draft number or customer name' }),
      ApiResponse({
        status: 200,
        description: 'Drafts retrieved successfully',
        schema: successResponseSchema('Drafts retrieved successfully', {
          drafts: [
            {
              id: 'draft-uuid-123',
              draftNumber: 'DRAFT-20250118-001',
              status: 'DRAFT',
              totalAmount: 1500.00,
              createdAt: '2025-01-18T10:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        }),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  GetDraft: () =>
    applyDecorators(
      ApiOperation({ summary: 'Get invoice draft by ID' }),
      ApiParam({
        name: 'id',
        required: true,
        description: 'Draft ID',
        example: 'draft-uuid-123',
      }),
      ApiResponse({
        status: 200,
        description: 'Draft retrieved successfully',
        schema: successResponseSchema('Draft retrieved successfully'),
      }),
      ApiResponse({
        status: 404,
        description: 'Draft not found',
        schema: errorResponseSchema(404, 'Draft not found'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  UpdateDraft: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'Update invoice draft' }),
      ApiParam({
        name: 'id',
        required: true,
        description: 'Draft ID',
        example: 'draft-uuid-123',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Draft updated successfully',
        schema: successResponseSchema('Draft updated successfully'),
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - draft cannot be updated',
        schema: errorResponseSchema(400, 'Only drafts with DRAFT status can be updated'),
      }),
      ApiResponse({
        status: 404,
        description: 'Draft not found',
        schema: errorResponseSchema(404, 'Draft not found'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  DeleteDraft: () =>
    applyDecorators(
      ApiOperation({ summary: 'Delete invoice draft' }),
      ApiParam({
        name: 'id',
        required: true,
        description: 'Draft ID',
        example: 'draft-uuid-123',
      }),
      ApiResponse({
        status: 200,
        description: 'Draft deleted successfully',
        schema: successResponseSchema('Draft deleted successfully'),
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - draft cannot be deleted',
        schema: errorResponseSchema(400, 'Only drafts with DRAFT status can be deleted'),
      }),
      ApiResponse({
        status: 404,
        description: 'Draft not found',
        schema: errorResponseSchema(404, 'Draft not found'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  SubmitDraft: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'Submit draft for approval' }),
      ApiParam({
        name: 'id',
        required: true,
        description: 'Draft ID',
        example: 'draft-uuid-123',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Draft submitted for approval',
        schema: successResponseSchema('Draft submitted for approval'),
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - draft cannot be submitted',
        schema: errorResponseSchema(400, 'Only drafts with DRAFT status can be submitted'),
      }),
      ApiResponse({
        status: 404,
        description: 'Draft not found',
        schema: errorResponseSchema(404, 'Draft not found'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  ApproveDraft: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'Approve draft and create invoice' }),
      ApiParam({
        name: 'id',
        required: true,
        description: 'Draft ID',
        example: 'draft-uuid-123',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Draft approved and invoice created',
        schema: successResponseSchema('Draft approved and invoice created', {
          draft: {
            id: 'draft-uuid-123',
            status: 'APPROVED',
            approvedAt: '2025-01-18T12:00:00Z',
          },
          invoice: {
            id: 'invoice-uuid-456',
            invoiceNumber: 'INV-20250118-001',
            originalDraftId: 'draft-uuid-123',
          },
        }),
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - draft cannot be approved',
        schema: errorResponseSchema(400, 'Only drafts with PENDING_APPROVAL status can be approved'),
      }),
      ApiResponse({
        status: 404,
        description: 'Draft not found',
        schema: errorResponseSchema(404, 'Draft not found'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  RejectDraft: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'Reject draft' }),
      ApiParam({
        name: 'id',
        required: true,
        description: 'Draft ID',
        example: 'draft-uuid-123',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Draft rejected',
        schema: successResponseSchema('Draft rejected'),
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - draft cannot be rejected',
        schema: errorResponseSchema(400, 'Only drafts with PENDING_APPROVAL status can be rejected'),
      }),
      ApiResponse({
        status: 404,
        description: 'Draft not found',
        schema: errorResponseSchema(404, 'Draft not found'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  GetVersionHistory: () =>
    applyDecorators(
      ApiOperation({ summary: 'Get version history of a draft' }),
      ApiParam({
        name: 'id',
        required: true,
        description: 'Draft ID',
        example: 'draft-uuid-123',
      }),
      ApiResponse({
        status: 200,
        description: 'Version history retrieved successfully',
        schema: successResponseSchema('Version history retrieved successfully', {
          versions: [
            {
              id: 'version-uuid-1',
              version: 1,
              notes: 'Initial draft',
              createdAt: '2025-01-18T10:00:00Z',
            },
          ],
        }),
      }),
      ApiResponse({
        status: 404,
        description: 'Draft not found',
        schema: errorResponseSchema(404, 'Draft not found'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  RevertToVersion: () =>
    applyDecorators(
      ApiOperation({ summary: 'Revert draft to a previous version' }),
      ApiParam({
        name: 'id',
        required: true,
        description: 'Draft ID',
        example: 'draft-uuid-123',
      }),
      ApiParam({
        name: 'versionId',
        required: true,
        description: 'Version ID to revert to',
        example: 'version-uuid-1',
      }),
      ApiResponse({
        status: 200,
        description: 'Draft reverted to previous version',
        schema: successResponseSchema('Draft reverted to previous version'),
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - draft cannot be reverted',
        schema: errorResponseSchema(400, 'Only drafts with DRAFT status can be reverted'),
      }),
      ApiResponse({
        status: 404,
        description: 'Draft or version not found',
        schema: errorResponseSchema(404, 'Draft or version not found'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  CompareVersions: () =>
    applyDecorators(
      ApiOperation({ summary: 'Compare two versions of a draft' }),
      ApiParam({
        name: 'id',
        required: true,
        description: 'Draft ID',
        example: 'draft-uuid-123',
      }),
      ApiParam({
        name: 'version1Id',
        required: true,
        description: 'First version ID',
        example: 'version-uuid-1',
      }),
      ApiParam({
        name: 'version2Id',
        required: true,
        description: 'Second version ID',
        example: 'version-uuid-2',
      }),
      ApiResponse({
        status: 200,
        description: 'Version comparison completed',
        schema: successResponseSchema('Version comparison completed', {
          version1: {
            id: 'version-uuid-1',
            version: 1,
            notes: 'Initial draft',
          },
          version2: {
            id: 'version-uuid-2',
            version: 2,
            notes: 'Updated draft',
          },
          differences: [
            {
              field: 'notes',
              version1Value: 'Initial draft',
              version2Value: 'Updated draft',
            },
          ],
        }),
      }),
      ApiResponse({
        status: 404,
        description: 'Draft or versions not found',
        schema: errorResponseSchema(404, 'Draft or versions not found'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  FinalizeDraft: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Finalize draft and create invoice directly',
        description: 'Directly create invoice from DRAFT status without approval workflow'
      }),
      ApiParam({
        name: 'id',
        required: true,
        description: 'Draft ID',
        example: 'draft-uuid-456',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Draft finalized and invoice created successfully',
        schema: successResponseSchema('Draft finalized and invoice created successfully', {
          draft: {
            id: 'draft-uuid-456',
            status: 'APPROVED',
            approvedAt: '2025-07-18T12:00:00Z'
          },
          invoice: {
            id: 'invoice-uuid-789',
            invoiceNumber: 'INV-20250718-001',
            totalAmount: 1500.00
          }
        }),
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - only DRAFT status can be finalized',
        schema: errorResponseSchema(400, 'Only drafts with DRAFT status can be finalized directly'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),
};
