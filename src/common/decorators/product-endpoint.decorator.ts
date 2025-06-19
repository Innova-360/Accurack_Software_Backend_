import { applyDecorators, UseGuards, Version } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";



// Standard response schemas
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

// Common error responses
const standardErrorResponses = () => [
  ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: errorResponseSchema(400, 'Bad request'),
  }),
  ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: errorResponseSchema(401, 'Unauthorized'),
  }),
  ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    schema: errorResponseSchema(500, 'Internal server error'),
  }),
];

// Product endpoint decorators
export const ProductEndpoint = {
  CreateProduct: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Create a new product',
        description: 'Creates a new product and optionally adds it to purchase orders. Only admins and managers can create products.'
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Product created successfully',
        schema: createdResponseSchema('Product created successfully', {
          product: {
            id: 'uuid-product-id',
            name: 'Premium Coffee Beans',
            description: 'High-quality Arabica coffee beans',
            sku: 'COFFEE-001',
            barcode: '1234567890123',
            price: 29.99,
            costPrice: 19.99,
            quantity: 100,
            storeId: 'uuid-store-id',
            status: 'active'
          },
          purchaseOrder: {
            id: 'uuid-purchase-order-id',
            quantity: 50,
            price: 18.99,
            total: 949.50,
            status: 'pending'
          }
        }),
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - SKU already exists or validation failed',
        schema: errorResponseSchema(400, 'SKU already exists'),
      }),
      ApiResponse({
        status: 403,
        description: 'Forbidden - insufficient permissions',
        schema: errorResponseSchema(403, 'Only admins and managers can create products'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
      UseGuards(JwtAuthGuard),
    ),

  GetProducts: () =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Get all products',
        description: 'Retrieves all products for the stores accessible to the user with pagination support.'
      }),
      ApiQuery({ name: 'storeId', required: false, description: 'Filter by specific store ID' }),
      ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination', example: 1 }),
      ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page', example: 10 }),
      ApiResponse({
        status: 200,
        description: 'Products retrieved successfully',
        schema: successResponseSchema('Products retrieved successfully', {
          products: [{
            id: 'uuid-product-id',
            name: 'Premium Coffee Beans',
            description: 'High-quality Arabica coffee beans',
            sku: 'COFFEE-001',
            barcode: '1234567890123',
            price: 29.99,
            costPrice: 19.99,
            quantity: 100,
            storeId: 'uuid-store-id',
            status: 'active',
            store: {
              id: 'uuid-store-id',
              name: 'Main Store'
            }
          }],
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3
          }
        }),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
      UseGuards(JwtAuthGuard),
    ),

  GetProductById: () =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Get product by ID',
        description: 'Retrieves a specific product by its ID with purchase order history.'
      }),
      ApiResponse({
        status: 200,
        description: 'Product retrieved successfully',
        schema: successResponseSchema('Product retrieved successfully', {
          id: 'uuid-product-id',
          name: 'Premium Coffee Beans',
          description: 'High-quality Arabica coffee beans',
          sku: 'COFFEE-001',
          barcode: '1234567890123',
          price: 29.99,
          costPrice: 19.99,
          quantity: 100,
          storeId: 'uuid-store-id',
          status: 'active',
          store: {
            id: 'uuid-store-id',
            name: 'Main Store'
          },
          purchaseOrders: [{
            id: 'uuid-purchase-order-id',
            quantity: 50,
            price: 18.99,
            total: 949.50,
            status: 'pending',
            supplier: {
              id: 'uuid-supplier-id',
              name: 'ABC Suppliers Ltd'
            }
          }]
        }),
      }),
      ApiResponse({
        status: 404,
        description: 'Product not found',
        schema: errorResponseSchema(404, 'Product not found'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
      UseGuards(JwtAuthGuard),
    ),

  UpdateProduct: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Update product',
        description: 'Updates an existing product. Only admins and managers can update products.'
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Product updated successfully',
        schema: successResponseSchema('Product updated successfully', {
          id: 'uuid-product-id',
          name: 'Updated Product Name',
          description: 'Updated description',
          sku: 'UPDATED-001',
          price: 35.99,
          costPrice: 22.99,
          quantity: 150,
          storeId: 'uuid-store-id',
          status: 'active'
        }),
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - SKU already exists or validation failed',
        schema: errorResponseSchema(400, 'SKU already exists'),
      }),
      ApiResponse({
        status: 403,
        description: 'Forbidden - insufficient permissions',
        schema: errorResponseSchema(403, 'Only admins and managers can update products'),
      }),
      ApiResponse({
        status: 404,
        description: 'Product not found',
        schema: errorResponseSchema(404, 'Product not found'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
      UseGuards(JwtAuthGuard),
    ),

  DeleteProduct: () =>
    applyDecorators(
      ApiOperation({ 
        summary: 'Delete product',
        description: 'Soft deletes a product by setting its status to inactive. Only admins can delete products.'
      }),
      ApiResponse({
        status: 200,
        description: 'Product deleted successfully',
        schema: successResponseSchema('Product deleted successfully', {
          id: 'uuid-product-id',
          deleted: true
        }),
      }),
      ApiResponse({
        status: 403,
        description: 'Forbidden - insufficient permissions',
        schema: errorResponseSchema(403, 'Only admins can delete products'),
      }),
      ApiResponse({
        status: 404,
        description: 'Product not found',
        schema: errorResponseSchema(404, 'Product not found'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
      Version('1'),
      UseGuards(JwtAuthGuard),
    ),
};
