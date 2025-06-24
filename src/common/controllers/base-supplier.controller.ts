import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ResponseService } from '../services/response.service';

export abstract class BaseSupplierController {
  constructor(protected responseService: ResponseService) {}

  /**
   * Handle supplier creation operation
   */
  protected async handleCreateSupplier<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Supplier created successfully',
  ): Promise<any> {
    const result = await operation();
    return this.responseService.created(successMessage, result);
  }

  /**
   * Handle get suppliers operation with pagination support
   */
  protected async handleGetSuppliers<T>(
    operation: () => Promise<{
      suppliers: T[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>,
    successMessage: string = 'Suppliers retrieved successfully',
  ): Promise<any> {
    const result = await operation();
    return this.responseService.success(
      successMessage,
      result.suppliers,
      200,
      result.pagination,
    );
  }

  /**
   * Handle get single supplier operation
   */
  protected async handleGetSupplier<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Supplier retrieved successfully',
  ): Promise<any> {
    const result = await operation();
    return this.responseService.success(successMessage, result, 200);
  }

  /**
   * Handle supplier update operation
   */
  protected async handleUpdateSupplier<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Supplier updated successfully',
  ): Promise<any> {
    const result = await operation();
    return this.responseService.success(successMessage, result, 200);
  }

  /**
   * Handle supplier delete operation
   */
  protected async handleDeleteSupplier<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Supplier deleted successfully',
  ): Promise<any> {
    const result = await operation();
    return this.responseService.success(successMessage, result, 200);
  }

  /**
   * Generic service operation handler for suppliers
   * Automatically handles common errors and status codes
   */
  protected async handleSupplierOperation<T>(
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
   * Extract supplier data for response (removes sensitive fields if any)
   */
  protected extractSupplierData(supplier: any): any {
    return {
      id: supplier.id,
      supplier_id: supplier.supplier_id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      storeId: supplier.storeId,
      status: supplier.status,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      ...(supplier.store && { store: supplier.store }),
    };
  }

  /**
   * Extract pagination metadata from supplier list response
   */
  protected extractSupplierListData(response: any): any {
    if (response.data && response.data.suppliers && response.data.pagination) {
      return {
        suppliers: response.data.suppliers.map((supplier: any) =>
          this.extractSupplierData(supplier),
        ),
        pagination: response.data.pagination,
      };
    }
    return response;
  }

  /**
   * Validate supplier access permissions
   */
  protected validateSupplierAccess(user: any, storeId?: string): void {
    if (!user) {
      throw new ForbiddenException('User authentication required');
    }

    // Super admins have access to all suppliers
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
   * Validate supplier operation permissions
   */
  protected validateSupplierOperationPermissions(
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
        `Only ${allowedRoles[operation].join(', ')} can ${operation} suppliers`,
      );
    }
  }
}