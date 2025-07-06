import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ResponseService } from '../services/response.service';

export abstract class BaseValidatorController {
  constructor(protected responseService: ResponseService) {}

  /**
   * Handle standard validator service operations with automatic error handling
   */
  protected async handleServiceOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Operation completed successfully',
    successStatus: number = 200,
  ): Promise<any> {
    try {
      const result = await operation();
      return this.responseService.success(successMessage, result, successStatus);
    } catch (error) {
      return this.handleValidatorError(error);
    }
  }

  /**
   * Handle validation operations specifically
   */
  protected async handleValidationOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Validation completed successfully',
  ): Promise<any> {
    return this.handleServiceOperation(operation, successMessage, 200);
  }

  /**
   * Handle payment update operations
   */
  protected async handlePaymentOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Payment updated successfully',
  ): Promise<any> {
    return this.handleServiceOperation(operation, successMessage, 200);
  }

  /**
   * Handle order retrieval operations
   */
  protected async handleOrdersOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Orders retrieved successfully',
  ): Promise<any> {
    return this.handleServiceOperation(operation, successMessage, 200);
  }

  /**
   * Handle validator-specific errors
   */
  private handleValidatorError(error: any): never {
    console.error('Validator operation error:', error);

    if (error instanceof ForbiddenException) {
      throw error;
    }

    if (error instanceof NotFoundException) {
      throw error;
    }

    if (error instanceof BadRequestException) {
      throw error;
    }

    // Handle Prisma-specific errors
    if (error.code) {
      switch (error.code) {
        case 'P2002':
          throw new BadRequestException('Duplicate entry found');
        case 'P2025':
          throw new NotFoundException('Record not found');
        case 'P2003':
          throw new BadRequestException('Foreign key constraint failed');
        default:
          throw new InternalServerErrorException(
            'Database operation failed: ' + error.message,
          );
      }
    }

    // Default error handling
    throw new InternalServerErrorException(
      'Validator operation failed: ' + (error.message || 'Unknown error'),
    );
  }

  /**
   * Extract user data for responses (remove sensitive information)
   */
  protected extractUserData(user: any): any {
    if (!user) return null;

    const { passwordHash, otp, otpExpiresAt, ...safeUserData } = user;
    return safeUserData;
  }

  /**
   * Validate validator permissions
   */
  protected validateValidatorAccess(user: any): void {
    if (!user) {
      throw new BadRequestException('User not authenticated');
    }

    if (user.position !== 'validator') {
      throw new ForbiddenException('User is not authorized as a validator');
    }
  }

  /**
   * Format order data for response
   */
  protected formatOrderData(order: any): any {
    if (!order) return null;

    return {
      id: order.id,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentMethod: order.paymentMethod,
      customerId: order.customerId,
      customer: order.customer ? {
        id: order.customer.id,
        customerName: order.customer.customerName,
        phoneNumber: order.customer.phoneNumber,
        customerMail: order.customer.customerMail,
      } : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      validatorId: order.validatorId,
    };
  }
}
