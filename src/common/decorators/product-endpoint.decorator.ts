import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductResponseDto } from '../../product/dto/product.dto';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import {
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '../../permissions/enums/permission.enum';

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
    timestamp: { type: 'string', example: '2025-06-20T22:39:00.000Z' },
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
    timestamp: { type: 'string', example: '2025-06-20T22:39:00.000Z' },
  },
});

const errorResponseSchema = (status: number, message: string) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: message },
    data: { type: 'null' },
    status: { type: 'number', example: status },
    timestamp: { type: 'string', example: '2025-06-20T22:39:00.000Z' },
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
      RequirePermissions(
        PermissionResource.PRODUCT,
        PermissionAction.CREATE,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Create a new product',
        description:
          'Creates a new product and optionally adds it to purchase orders. Requires product creation permissions.',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 201,
        description: 'Product created successfully',
        type: ProductResponseDto,
        schema: createdResponseSchema('Product created successfully', {
          id: 'uuid-product-id',
          name: 'Premium Coffee Beans',
          category: 'Beverages',
          ean: '1234567890123',
          pluUpc: 'UPC123456',
          supplierId: 'uuid-supplier-id',
          sku: 'COFFEE-001',
          singleItemCostPrice: 19.99,
          itemQuantity: 100,
          msrpPrice: 29.99,
          singleItemSellingPrice: 25.99,
          clientId: 'uuid-client-id',
          storeId: 'uuid-store-id',
          hasVariants: false,
          packIds: ['uuid-pack-id-1', 'uuid-pack-id-2'],
          packs: [
            {
              id: 'uuid-pack-id-1',
              productId: 'uuid-product-id',
              minimumSellingQuantity: 10,
              totalPacksQuantity: 50,
              orderedPacksPrice: 18.99,
              percentDiscount: 5,
              createdAt: '2025-06-20T22:39:00.000Z',
              updatedAt: '2025-06-20T22:39:00.000Z',
            },
            {
              id: 'uuid-pack-id-2',
              productId: 'uuid-product-id',
              minimumSellingQuantity: 20,
              totalPacksQuantity: 30,
              orderedPacksPrice: 17.99,
              percentDiscount: 10,
              createdAt: '2025-06-20T22:39:00.000Z',
              updatedAt: '2025-06-20T22:39:00.000Z',
            },
          ],
          variants: [],
          createdAt: '2025-06-20T22:39:00.000Z',
          updatedAt: '2025-06-20T22:39:00.000Z',
          profitAmount: 6.0,
          profitMargin: 30.02,
          supplier: {
            id: 'uuid-supplier-id',
            name: 'ABC Suppliers Ltd',
            email: 'contact@abcsuppliers.com',
            phone: '123-456-7890',
          },
          store: {
            id: 'uuid-store-id',
            name: 'Main Store',
          },
          sales: [],
          purchaseOrders: [
            {
              id: 'uuid-purchase-order-id',
              productId: 'uuid-product-id',
              supplierId: 'uuid-supplier-id',
              employeeId: 'uuid-employee-id',
              storeId: 'uuid-store-id',
              quantity: 100,
              price: 19.99,
              total: 1999.0,
              status: 'active',
            },
          ],
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
        schema: errorResponseSchema(
          403,
          'Insufficient permissions to create products',
        ),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  GetProducts: () =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.PRODUCT,
        PermissionAction.READ,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Get all products',
        description:
          'Retrieves all products for the stores accessible to the user with pagination support.',
      }),
      ApiQuery({
        name: 'storeId',
        required: false,
        description: 'Filter by specific store ID',
      }),
      ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number for pagination',
        example: 1,
      }),
      ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of items per page',
        example: 10,
      }),
      ApiResponse({
        status: 200,
        description: 'Products retrieved successfully',
        schema: successResponseSchema('Products retrieved successfully', {
          products: [
            {
              id: 'uuid-product-id',
              name: 'Premium Coffee Beans',
              category: 'Beverages',
              ean: '1234567890123',
              pluUpc: 'UPC123456',
              supplierId: 'uuid-supplier-id',
              sku: 'COFFEE-001',
              singleItemCostPrice: 19.99,
              itemQuantity: 100,
              msrpPrice: 29.99,
              singleItemSellingPrice: 25.99,
              clientId: 'uuid-client-id',
              storeId: 'uuid-store-id',
              hasVariants: true,
              packIds: [],
              packs: [
                {
                  id: 'uuid-pack-id-1',
                  productId: 'uuid-product-id',
                  minimumSellingQuantity: 10,
                  totalPacksQuantity: 50,
                  orderedPacksPrice: 18.99,
                  percentDiscount: 5,
                  createdAt: '2025-06-20T22:39:00.000Z',
                  updatedAt: '2025-06-20T22:39:00.000Z',
                },
              ],
              variants: [
                {
                  name: 'Dark Roast',
                  price: 27.99,
                  sku: 'COFFEE-001-DR',
                  packIds: ['uuid-pack-id-1'],
                },
              ],
              createdAt: '2025-06-20T22:39:00.000Z',
              updatedAt: '2025-06-20T22:39:00.000Z',
              profitAmount: 6.0,
              profitMargin: 30.02,
              supplier: {
                id: 'uuid-supplier-id',
                name: 'ABC Suppliers Ltd',
                email: 'contact@abcsuppliers.com',
                phone: '123-456-7890',
              },
              store: {
                id: 'uuid-store-id',
                name: 'Main Store',
              },
              sales: [],
              purchaseOrders: [],
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
          },
        }),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  GetProductById: () =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.PRODUCT,
        PermissionAction.READ,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Get product by ID',
        description:
          'Retrieves a specific product by its ID with purchase order history.',
      }),
      ApiResponse({
        status: 200,
        description: 'Product retrieved successfully',
        type: ProductResponseDto,
        schema: successResponseSchema('Product retrieved successfully', {
          id: 'uuid-product-id',
          name: 'Premium Coffee Beans',
          category: 'Beverages',
          ean: '1234567890123',
          pluUpc: 'UPC123456',
          supplierId: 'uuid-supplier-id',
          sku: 'COFFEE-001',
          singleItemCostPrice: 19.99,
          itemQuantity: 100,
          msrpPrice: 29.99,
          singleItemSellingPrice: 25.99,
          clientId: 'uuid-client-id',
          storeId: 'uuid-store-id',
          hasVariants: true,
          packIds: [],
          packs: [
            {
              id: 'uuid-pack-id-1',
              productId: 'uuid-product-id',
              minimumSellingQuantity: 10,
              totalPacksQuantity: 50,
              orderedPacksPrice: 18.99,
              percentDiscount: 5,
              createdAt: '2025-06-20T22:39:00.000Z',
              updatedAt: '2025-06-20T22:39:00.000Z',
            },
          ],
          variants: [
            {
              name: 'Dark Roast',
              price: 27.99,
              sku: 'COFFEE-001-DR',
              packIds: ['uuid-pack-id-1'],
            },
          ],
          createdAt: '2025-06-20T22:39:00.000Z',
          updatedAt: '2025-06-20T22:39:00.000Z',
          profitAmount: 6.0,
          profitMargin: 30.02,
          supplier: {
            id: 'uuid-supplier-id',
            name: 'ABC Suppliers Ltd',
            email: 'contact@abcsuppliers.com',
            phone: '123-456-7890',
          },
          store: {
            id: 'uuid-store-id',
            name: 'Main Store',
          },
          sales: [],
          purchaseOrders: [
            {
              id: 'uuid-purchase-order-id',
              productId: 'uuid-product-id',
              supplierId: 'uuid-supplier-id',
              employeeId: 'uuid-employee-id',
              storeId: 'uuid-store-id',
              quantity: 100,
              price: 19.99,
              total: 1999.0,
              status: 'active',
            },
          ],
        }),
      }),
      ApiResponse({
        status: 404,
        description: 'Product not found',
        schema: errorResponseSchema(404, 'Product not found'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  UpdateProduct: (dtoType: any) =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.PRODUCT,
        PermissionAction.UPDATE,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Update product',
        description:
          'Updates an existing product. Requires product update permissions.',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Product updated successfully',
        type: ProductResponseDto,
        schema: successResponseSchema('Product updated successfully', {
          id: 'uuid-product-id',
          name: 'Updated Coffee Beans',
          category: 'Beverages',
          ean: '1234567890123',
          pluUpc: 'UPC123456',
          supplierId: 'uuid-supplier-id',
          sku: 'COFFEE-001-UPDATED',
          singleItemCostPrice: 22.99,
          itemQuantity: 150,
          msrpPrice: 35.99,
          singleItemSellingPrice: 30.99,
          clientId: 'uuid-client-id',
          storeId: 'uuid-store-id',
          hasVariants: false,
          packIds: ['uuid-pack-id-1'],
          packs: [
            {
              id: 'uuid-pack-id-1',
              productId: 'uuid-product-id',
              minimumSellingQuantity: 10,
              totalPacksQuantity: 50,
              orderedPacksPrice: 21.99,
              percentDiscount: 5,
              createdAt: '2025-06-20T22:39:00.000Z',
              updatedAt: '2025-06-20T22:39:00.000Z',
            },
          ],
          variants: [],
          createdAt: '2025-06-20T22:39:00.000Z',
          updatedAt: '2025-06-20T22:39:00.000Z',
          profitAmount: 8.0,
          profitMargin: 34.84,
          supplier: {
            id: 'uuid-supplier-id',
            name: 'ABC Suppliers Ltd',
            email: 'contact@abcsuppliers.com',
            phone: '123-456-7890',
          },
          store: {
            id: 'uuid-store-id',
            name: 'Main Store',
          },
          sales: [],
          purchaseOrders: [],
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
        schema: errorResponseSchema(
          403,
          'Insufficient permissions to update products',
        ),
      }),
      ApiResponse({
        status: 404,
        description: 'Product not found',
        schema: errorResponseSchema(404, 'Product not found'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  UpdateQuantity: (dtoType: any) =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.PRODUCT,
        PermissionAction.UPDATE,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Update product quantity',
        description:
          'Updates the quantity of an existing product. Requires product update permissions.',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Product quantity updated successfully',
        type: ProductResponseDto,
        schema: successResponseSchema('Product quantity updated successfully', {
          id: 'uuid-product-id',
          name: 'Premium Coffee Beans',
          category: 'Beverages',
          ean: '1234567890123',
          pluUpc: 'UPC123456',
          supplierId: 'uuid-supplier-id',
          sku: 'COFFEE-001',
          singleItemCostPrice: 20.99,
          itemQuantity: 100,
          msrpPrice: 35.99,
          singleItemSellingPrice: 30.99,
          clientId: 'uuid-client-id',
          storeId: 'uuid-store-id',
          hasVariants: false,
          packIds: [],
          packs: [],
          createdAt: '2025-06-20T22:39:00.000Z',
          updatedAt: '2025-06-20T22:39:00.000Z',
        }),
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - Invalid quantity',
        schema: errorResponseSchema(400, 'Quantity must be at least 1'),
      }),
      ApiResponse({
        status: 403,
        description: 'Forbidden - insufficient permissions',
        schema: errorResponseSchema(
          403,
          'Insufficient permissions to update products',
        ),
      }),
      ApiResponse({
        status: 404,
        description: 'Product not found',
        schema: errorResponseSchema(404, 'Product not found'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  DeleteProduct: () =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.PRODUCT,
        PermissionAction.DELETE,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Delete product',
        description:
          'Soft deletes a product by setting its status to inactive. Requires product deletion permissions.',
      }),
      ApiResponse({
        status: 200,
        description: 'Product deleted successfully',
        type: ProductResponseDto,
        schema: successResponseSchema('Product deleted successfully', {
          id: 'uuid-product-id',
          name: 'Premium Coffee Beans',
          category: 'Beverages',
          ean: '1234567890123',
          pluUpc: 'UPC123456',
          supplierId: 'uuid-supplier-id',
          sku: 'COFFEE-001',
          singleItemCostPrice: 19.99,
          itemQuantity: 100,
          msrpPrice: 29.99,
          singleItemSellingPrice: 25.99,
          clientId: 'uuid-client-id',
          storeId: 'uuid-store-id',
          hasVariants: false,
          packIds: [],
          packs: [],
          variants: [],
          createdAt: '2025-06-20T22:39:00.000Z',
          updatedAt: '2025-06-20T22:39:00.000Z',
          profitAmount: 6.0,
          profitMargin: 30.02,
          supplier: {
            id: 'uuid-supplier-id',
            name: 'ABC Suppliers Ltd',
            email: 'contact@abcsuppliers.com',
            phone: '123-456-7890',
          },
          store: {
            id: 'uuid-store-id',
            name: 'Main Store',
          },
          sales: [],
          purchaseOrders: [],
          status: 'inactive',
        }),
      }),
      ApiResponse({
        status: 403,
        description: 'Forbidden - insufficient permissions',
        schema: errorResponseSchema(
          403,
          'Insufficient permissions to delete products',
        ),
      }),
      ApiResponse({
        status: 404,
        description: 'Product not found',
        schema: errorResponseSchema(404, 'Product not found'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  DeleteAllProduct: () =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.PRODUCT,
        PermissionAction.DELETE,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Delete all product',
        description:
          'Soft deletes a product by setting its status to inactive. Requires product deletion permissions.',
      }),
      // ApiResponse({
      //   status: 200,
      //   description: 'Products deleted successfully',
      //   type: ProductResponseDto,
      //   schema: successResponseSchema('Products deleted successfully', {
      //     id: 'uuid-product-id',
      //     name: 'Premium Coffee Beans',
      //     category: 'Beverages',
      //     ean: '1234567890123',
      //     pluUpc: 'UPC123456',
      //     supplierId: 'uuid-supplier-id',
      //     sku: 'COFFEE-001',
      //     singleItemCostPrice: 19.99,
      //     itemQuantity: 100,
      //     msrpPrice: 29.99,
      //     singleItemSellingPrice: 25.99,
      //     clientId: 'uuid-client-id',
      //     storeId: 'uuid-store-id',
      //     hasVariants: false,
      //     packIds: [],
      //     packs: [],
      //     variants: [],
      //     createdAt: '2025-06-20T22:39:00.000Z',
      //     updatedAt: '2025-06-20T22:39:00.000Z',
      //     profitAmount: 6.0,
      //     profitMargin: 30.02,
      //     supplier: {
      //       id: 'uuid-supplier-id',
      //       name: 'ABC Suppliers Ltd',
      //       email: 'contact@abcsuppliers.com',
      //       phone: '123-456-7890',
      //     },
      //     store: {
      //       id: 'uuid-store-id',
      //       name: 'Main Store',
      //     },
      //     sales: [],
      //     purchaseOrders: [],
      //     status: 'inactive',
      //   }),
      // }),
      ApiResponse({
        status: 403,
        description: 'Forbidden - insufficient permissions',
        schema: errorResponseSchema(
          403,
          'Insufficient permissions to delete products',
        ),
      }),
      ApiResponse({
        status: 404,
        description: 'Products not found',
        schema: errorResponseSchema(404, 'Products not found'),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),

  AssignSupplier() {
    return applyDecorators(
      ApiTags('Products'),
      ApiOperation({
        summary: 'Assign supplier to products',
        description:
          'Assigns a supplier to one or more products with specified cost price and state (primary/secondary).',
      }),
      ApiResponse({
        status: HttpStatus.OK,
        description: 'Supplier successfully assigned to products',
        schema: {
          example: {
            message: 'Supplier has been added on product',
            data: {
              productSuppliers: [
                {
                  id: 'uuid',
                  productId: 'uuid',
                  supplierId: 'uuid',
                  costPrice: 19.99,
                  state: 'primary',
                  createdAt: '2025-06-30T20:43:00.000Z',
                  updatedAt: '2025-06-30T20:43:00.000Z',
                },
              ],
            },
          },
        },
      }),
      ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Store or supplier not found',
      }),
      ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid input data or product not found',
      }),
    );
  },

  SearchProducts: () =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.PRODUCT,
        PermissionAction.READ,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Search products',
        description:
          'Search for products by name, SKU, PLU/UPC, or EAN. Optionally filter by store ID.',
      }),
      ApiQuery({
        name: 'q',
        description:
          'Search query to find products by name, SKU, PLU/UPC, or EAN',
        example: 'iPhone',
        type: String,
      }),
      ApiQuery({
        name: 'storeId',
        description: 'Optional store ID to filter products by specific store',
        example: 'uuid-store-id',
        required: false,
        type: String,
      }),
      ApiResponse({
        status: 200,
        description: 'Products found successfully',
        schema: successResponseSchema('Products found successfully', [
          {
            id: 'uuid-product-id',
            name: 'iPhone 15 Pro',
            sku: 'IPHONE15PRO',
            pluUpc: '123456789',
            ean: '1234567890123',
            category: 'Electronics',
            sellingPrice: 999.99,
            costPrice: 750.0,
            quantity: 50,
            store: {
              id: 'uuid-store-id',
              name: 'Electronics Store',
            },
          },
        ]),
      }),
      ApiResponse({
        status: 404,
        description: 'No products found',
        schema: errorResponseSchema(
          404,
          'No products found matching the search criteria',
        ),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth(),
    ),

  UpdateVariantQuantity: (dtoType: any) =>
    applyDecorators(
      RequirePermissions(
        PermissionResource.PRODUCT,
        PermissionAction.UPDATE,
        PermissionScope.STORE,
      ),
      ApiOperation({
        summary: 'Update variant quantity by PLU/UPC',
        description:
          'Updates the quantity of a specific product variant by PLU/UPC. Requires product update permissions.',
      }),
      ApiBody({ type: dtoType }),
      ApiResponse({
        status: 200,
        description: 'Variant quantity updated successfully',
        schema: successResponseSchema('Variant quantity updated successfully', {
          id: 'uuid-product-id',
          name: 'Premium Coffee Beans',
          variant: {
            name: 'Dark Roast',   
            pluUpc: 'UPC123456',
            quantity: 50,
            price: 25.99,
          },
        }),
      }),
      ApiResponse({
        status: 400,
        description: 'Bad request - Invalid quantity or PLU/UPC',
        schema: errorResponseSchema(400, 'Quantity must be at least 0'),
      }),
      ApiResponse({
        status: 403,
        description: 'Forbidden - insufficient permissions',
        schema: errorResponseSchema(
          403,
          'Insufficient permissions to update products',
        ),
      }),
      ApiResponse({
        status: 404,
        description: 'Product with variant not found',
        schema: errorResponseSchema(
          404,
          'Product with variant PLU/UPC not found',
        ),
      }),
      ...standardErrorResponses(),
      ApiBearerAuth('JWT-auth'),
    ),
};
