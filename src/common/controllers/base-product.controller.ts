import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ResponseService } from '../services/response.service';

export abstract class BaseProductController {
  constructor(protected responseService: ResponseService) {}

  /**
   * Handle product creation operation with purchase order integration
   */
  protected async handleCreateProduct<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Product created successfully',
  ): Promise<any> {
    const result = await operation();
    return this.responseService.created(successMessage, result);
  }

  /**
   * Handle get products operation with pagination support
   */
  protected async handleGetProducts<T>(
    operation: () => Promise<{
      products: T[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>,
    successMessage: string = 'Products retrieved successfully',
  ): Promise<any> {
    const result = await operation();
    return this.responseService.success(
      successMessage,
      result.products,
      200,
      result.pagination,
    );
  }

  /**
   * Handle get single product operation with purchase order history
   */
  protected async handleGetProduct<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Product retrieved successfully',
  ): Promise<any> {
    const result = await operation();
    return this.responseService.success(successMessage, result, 200);
  }

  /**
   * Handle product update operation
   */
  protected async handleUpdateProduct<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Product updated successfully',
  ): Promise<any> {
    const result = await operation();
    return this.responseService.success(successMessage, result, 200);
  }

  /**
   * Handle product delete operation (soft delete)
   */
  protected async handleDeleteProduct<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Product deleted successfully',
  ): Promise<any> {
    const result = await operation();
    return this.responseService.success(successMessage, result, 200);
  }

  /**
   * Generic service operation handler for products
   * Automatically handles common errors and status codes
   */
  protected async handleProductOperation<T>(
    operation: () => Promise<T>,
    successMessage: string,
    successStatus: number = 200,
  ): Promise<any> {
    const result = await operation();

    if (successStatus === 201) {
      return this.responseService.created(successMessage, result);
    } else {
      return this.responseService.success(
        successMessage,
        result,
        successStatus,
      );
    }
  }

  /**
   * Extract product data for response (removes sensitive fields if any)
   */
  protected extractProductData(product: any): any {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      price: product.price,
      costPrice: product.costPrice,
      quantity: product.quantity,
      clientId: product.clientId,
      storeId: product.storeId,
      status: product.status,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      ...(product.store && { store: product.store }),
      ...(product.purchaseOrders && { purchaseOrders: product.purchaseOrders }),
    };
  }

  /**
   * Extract pagination metadata from product list response
   */
  protected extractProductListData(response: any): any {
    if (response.data && response.data.products && response.data.pagination) {
      return {
        products: response.data.products.map((product: any) =>
          this.extractProductData(product),
        ),
        pagination: response.data.pagination,
      };
    }
    return response;
  }

  /**
   * Validate product access permissions
   */
  protected validateProductAccess(user: any, storeId?: string): void {
    if (!user) {
      throw new ForbiddenException('User authentication required');
    }

    // Super admins have access to all products
    if (user.role === 'super_admin') {
      return;
    }

    // For other roles, check store access
    if (storeId) {
      const hasStoreAccess = user.stores?.some(
        (store: any) => store.storeId === storeId,
      );
      if (!hasStoreAccess) {
        throw new ForbiddenException('No access to this store');
      }
    }
  }

  /**
   * Validate product operation permissions
   */
  protected validateProductOperationPermissions(
    user: any,
    operation: 'create' | 'update' | 'delete',
  ): void {
    const allowedRoles = {
      create: ['super_admin', 'admin', 'manager'],
      update: ['super_admin', 'admin', 'manager'],
      delete: ['super_admin', 'admin'],
    };

    if (!allowedRoles[operation].includes(user.role)) {
      throw new ForbiddenException(
        `Only ${allowedRoles[operation].join(', ')} can ${operation} products`,
      );
    }
  }

  /**
   * Validate SKU uniqueness
   */
  protected async validateSkuUniqueness(
    checkSkuOperation: (sku: string) => Promise<boolean>,
    sku: string,
    currentProductId?: string,
  ): Promise<void> {
    const exists = await checkSkuOperation(sku);
    if (exists) {
      throw new BadRequestException('SKU already exists');
    }
  }

  /**
   * Calculate profit margin for product
   */
  protected calculateProfitMargin(sellingPrice: number, costPrice: number): {
    profitAmount: number;
    profitMargin: number;
  } {
    const profitAmount = sellingPrice - costPrice;
    const profitMargin = costPrice > 0 ? (profitAmount / costPrice) * 100 : 0;
    
    return {
      profitAmount: parseFloat(profitAmount.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(2)),
    };
  }

  /**
   * Format product response with calculated fields
   */
  protected formatProductResponse(product: any): any {
    const formattedProduct = this.extractProductData(product);
    
    if (formattedProduct.price && formattedProduct.costPrice) {
      const { profitAmount, profitMargin } = this.calculateProfitMargin(
        formattedProduct.price,
        formattedProduct.costPrice,
      );
      
      formattedProduct.profitAmount = profitAmount;
      formattedProduct.profitMargin = profitMargin;
    }
    
    return formattedProduct;
  }
}