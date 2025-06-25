import { Response } from 'express';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ResponseService } from '../services/response.service';

export abstract class BaseSaleController {
  constructor(protected responseService: ResponseService) {}

  /**
   * Handle standard sale operations with consistent error handling
   */
  protected async handleSaleOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Operation completed successfully',
    successStatus: number = 200,
  ): Promise<any> {
    try {
      const result = await operation();
      return this.responseService.success(successMessage, result, successStatus);
    } catch (error) {
      return this.handleSaleError(error);
    }
  }

  /**
   * Handle sale creation operations
   */
  protected async handleSaleCreation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Created successfully',
  ): Promise<any> {
    return this.handleSaleOperation(operation, successMessage, 201);
  }

  /**
   * Handle customer operations with specific error handling
   */
  protected async handleCustomerOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Customer operation completed successfully',
    successStatus: number = 200,
  ): Promise<any> {
    try {
      const result = await operation();
      return this.responseService.success(successMessage, result, successStatus);
    } catch (error) {
      if (error.message?.includes('Customer with this phone number already exists')) {
        throw new BadRequestException('Customer with this phone number already exists');
      }
      if (error.message?.includes('Customer not found')) {
        throw new NotFoundException('Customer not found');
      }
      return this.handleSaleError(error);
    }
  }

  /**
   * Handle payment operations with balance calculations
   */
  protected async handlePaymentOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Payment processed successfully',
  ): Promise<any> {
    try {
      const result = await operation();
      return this.responseService.success(successMessage, result, 201);
    } catch (error) {
      if (error.message?.includes('Insufficient balance')) {
        throw new BadRequestException('Insufficient customer balance for this operation');
      }
      return this.handleSaleError(error);
    }
  }

  /**
   * Handle inventory operations (sales, returns)
   */
  protected async handleInventoryOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Inventory operation completed successfully',
    successStatus: number = 200,
  ): Promise<any> {
    try {
      const result = await operation();
      return this.responseService.success(successMessage, result, successStatus);
    } catch (error) {
      if (error.message?.includes('Insufficient inventory')) {
        throw new BadRequestException('Insufficient inventory for this operation');
      }
      if (error.message?.includes('Return quantity cannot exceed')) {
        throw new BadRequestException('Return quantity cannot exceed purchased quantity');
      }
      if (error.message?.includes('Product not found in this sale')) {
        throw new NotFoundException('Product not found in this sale');
      }
      return this.handleSaleError(error);
    }
  }

  /**
   * Handle invoice operations
   */
  protected async handleInvoiceOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Invoice operation completed successfully',
  ): Promise<any> {
    try {
      const result = await operation();
      return this.responseService.success(successMessage, result, 200);
    } catch (error) {
      if (error.message?.includes('Invoice not found')) {
        throw new NotFoundException('Invoice not found');
      }
      return this.handleSaleError(error);
    }
  }

  /**
   * Handle return operations with category-specific logic
   */
  protected async handleReturnOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Return processed successfully',
  ): Promise<any> {
    try {
      const result = await operation();
      return this.responseService.success(successMessage, result, 201);
    } catch (error) {
      if (error.message?.includes('Return quantity')) {
        throw new BadRequestException('Invalid return quantity specified');
      }
      if (error.message?.includes('Sale not found')) {
        throw new NotFoundException('Sale not found');
      }
      return this.handleSaleError(error);
    }
  }

  /**
   * Extract user data from request for consistent response format
   */
  protected extractUserData(user: any) {
    if (!user) return null;
    
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      stores: user.stores,
    };
  }

  /**
   * Handle sale-specific errors with appropriate HTTP status codes
   */
  private handleSaleError(error: any): never {
    if (error instanceof BadRequestException || 
        error instanceof NotFoundException) {
      throw error;
    }

    // Handle Prisma-specific errors
    if (error.code === 'P2002') {
      throw new BadRequestException('Duplicate entry - record already exists');
    }
    
    if (error.code === 'P2003') {
      throw new BadRequestException('Invalid reference - related record not found');
    }
    
    if (error.code === 'P2025') {
      throw new NotFoundException('Record not found');
    }

    // Handle common business logic errors
    if (error.message?.includes('not found')) {
      throw new NotFoundException(error.message);
    }
    
    if (error.message?.includes('already exists')) {
      throw new BadRequestException(error.message);
    }
    
    if (error.message?.includes('insufficient') || 
        error.message?.includes('Invalid')) {
      throw new BadRequestException(error.message);
    }

    // Log unexpected errors and throw generic error
    console.error('Unexpected sale operation error:', error);
    throw new InternalServerErrorException('An unexpected error occurred during the sale operation');
  }
}
