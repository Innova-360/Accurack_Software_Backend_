import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
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
    timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
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
    timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
  },
});

const errorResponseSchema = (status: number, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: message },
    data: { type: 'null' },
    status: { type: 'number', example: status },
    timestamp: { type: 'string', example: '2025-06-18T10:30:00.000Z' },
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

export const InvoiceEndpoint = {
  CreateInvoice: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'Create a new invoice' }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Invoice created successfully',
        schema: createdResponseSchema('Invoice created successfully'),
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - validation failed',
        schema: errorResponseSchema(400, 'Bad request - validation failed'),
      }),
      ApiResponse({
        status: 404,
        description: 'Sale or Business not found',
        schema: errorResponseSchema(404, 'Sale or Business not found'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),
  GetInvoice: () =>
    applyDecorators(
      ApiOperation({ summary: 'Get invoice by ID' }),
      ApiParam({
        name: 'id',
        required: true,
        description: 'Invoice ID',
        example: 'invoice-uuid-123',
      }),
      ApiResponse({
        status: 200,
        description: 'Invoice retrieved successfully',
        schema: successResponseSchema('Invoice retrieved successfully'),
      }),
      ApiResponse({
        status: 404,
        description: 'Invoice not found',
        schema: errorResponseSchema(404, 'Invoice not found'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),
  GetInvoicesByStore: () =>
    applyDecorators(
      ApiOperation({ summary: 'Get all invoices for a store' }),
      ApiParam({
        name: 'storeId',
        required: true,
        description: 'Store ID',
        example: 'store-uuid-789',
      }),
      ApiResponse({
        status: 200,
        description: 'Invoices retrieved successfully',
        schema: successResponseSchema('Invoices retrieved successfully'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  setBusinessInfo: (businessInfoDto: any) =>
    applyDecorators(
      ApiBearerAuth('JWT-auth'),
      ApiBody({ type: businessInfoDto }),
      ApiResponse({
        status: 200,
        description: 'Business information saved successfully.',
        schema: successResponseSchema(
          'Business information saved successfully.',
          {
            id: 'uuid-business-id',
            clientId: 'uuid-client-id',
            businessName: 'Example Corp',
            contactNo: '123456789',
            website: 'https://example.com',
            address: '123 Street, City',
            logoUrl: 'https://example.com/logo.png',
            createdAt: '2025-06-01T12:00:00Z',
            updatedAt: '2025-06-01T12:00:00Z',
          },
        ),
      }),
      ApiResponse({
        status: 400,
        description: 'Invalid input or business already exists',
        schema: errorResponseSchema(400, 'Invalid input or duplicate entry'),
      }),
      ApiResponse({
        status: 500,
        description: 'Internal server error',
        schema: errorResponseSchema(500, 'An unexpected error occurred'),
      }),
      Version('1'),
    ),

  getBusinessInfo: () =>
    applyDecorators(
      ApiBearerAuth('JWT-auth'),
      ApiResponse({
        status: 200,
        description: 'Business information saved successfully.',
        schema: successResponseSchema(
          'Business information saved successfully.',
          {
            id: 'uuid-business-id',
            clientId: 'uuid-client-id',
            businessName: 'Example Corp',
            contactNo: '123456789',
            website: 'https://example.com',
            address: '123 Street, City',
            logoUrl: 'https://example.com/logo.png',
            createdAt: '2025-06-01T12:00:00Z',
            updatedAt: '2025-06-01T12:00:00Z',
          },
        ),
      }),
      ApiResponse({
        status: 400,
        description: 'Invalid input or business already exists',
        schema: errorResponseSchema(400, 'Invalid input or duplicate entry'),
      }),
      ApiResponse({
        status: 500,
        description: 'Internal server error',
        schema: errorResponseSchema(500, 'An unexpected error occurred'),
      }),
      Version('1'),
    ),

  updateBusinessInfo: (updateBusinessInfoDto: any) =>
    applyDecorators(
      ApiBearerAuth('JWT-auth'),
      ApiOperation({
        summary: 'Update business information',
        description:
          'Update existing business information with partial or complete data',
      }),
      ApiBody({ type: updateBusinessInfoDto }),
      ApiResponse({
        status: 200,
        description: 'Business information updated successfully.',
        schema: successResponseSchema(
          'Business information updated successfully.',
          {
            id: 'uuid-business-id',
            clientId: 'uuid-client-id',
            businessName: 'Updated Business Name',
            contactNo: '987654321',
            website: 'https://updated-website.com',
            address: '456 New Street, Updated City',
            logoUrl: 'https://example.com/new-logo.png',
            createdAt: '2025-06-01T12:00:00Z',
            updatedAt: '2025-06-10T15:30:00Z',
          },
        ),
      }),
      ApiResponse({
        status: 400,
        description: 'Invalid input or no fields to update',
        schema: errorResponseSchema(400, 'No valid fields provided for update'),
      }),
      ApiResponse({
        status: 404,
        description: 'Business information not found',
        schema: errorResponseSchema(
          404,
          'Business information not found. Please create business details first.',
        ),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),

  ConvertInvoiceToDraft: () =>
    applyDecorators(
      ApiOperation({ summary: 'Convert invoice to draft for editing' }),
      ApiParam({
        name: 'id',
        required: true,
        description: 'Invoice ID',
        example: 'invoice-uuid-123',
      }),
      ApiBody({
        schema: {
          type: 'object',
          properties: {
            notes: {
              type: 'string',
              description: 'Optional notes for the conversion',
              example: 'Converting to draft for editing',
            },
          },
        },
      }),
      ApiResponse({
        status: 201,
        description: 'Invoice converted to draft successfully',
        schema: createdResponseSchema('Invoice converted to draft successfully'),
      }),
      ApiResponse({
        status: 400,
        description: 'Invoice already converted or cannot be converted',
        schema: errorResponseSchema(400, 'Invoice already converted'),
      }),
      ApiResponse({
        status: 404,
        description: 'Invoice not found',
        schema: errorResponseSchema(404, 'Invoice not found'),
      }),
      ...standardErrorResponses(),
      Version('1'),
    ),
};
