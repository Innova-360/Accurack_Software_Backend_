import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ResponseService } from '../services/response.service';

export abstract class BaseDriverController {
  constructor(protected responseService: ResponseService) {}

  /**
   * Handle standard driver service operations with automatic error handling
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
      return this.handleDriverError(error);
    }
  }

  /**
   * Handle order creation operations
   */
  protected async handleCreateOrderOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Order created successfully',
  ): Promise<any> {
    return this.handleServiceOperation(operation, successMessage, 201);
  }

  /**
   * Handle order update operations
   */
  protected async handleUpdateOrderOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Order updated successfully',
  ): Promise<any> {
    return this.handleServiceOperation(operation, successMessage, 200);
  }

  /**
   * Handle order retrieval operations
   */
  protected async handleGetOrdersOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Orders retrieved successfully',
  ): Promise<any> {
    return this.handleServiceOperation(operation, successMessage, 200);
  }

  /**
   * Handle validation request operations
   */
  protected async handleValidationRequestOperation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Order sent for validation successfully',
  ): Promise<any> {
    return this.handleServiceOperation(operation, successMessage, 200);
  }

  /**
   * Handle driver-specific errors
   */
  private handleDriverError(error: any): never {
    console.error('Driver operation error:', error);

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
        case 'P2014':
          throw new BadRequestException('Invalid ID provided');
        default:
          throw new InternalServerErrorException(
            'Database operation failed: ' + error.message,
          );
      }
    }

    // Default error handling
    throw new InternalServerErrorException(
      'Driver operation failed: ' + (error.message || 'Unknown error'),
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
   * Validate driver permissions
   */
  protected validateDriverAccess(user: any): void {
    if (!user) {
      throw new BadRequestException('User not authenticated');
    }

    if (user.position !== 'driver') {
      throw new ForbiddenException('User is not authorized as a driver');
    }
  }

  /**
   * Format order data for response
   */
  protected formatOrderData(order: any): any {
    if (!order) return null;

    return {
      id: order.id,
      customerId: order.customerId,
      userId: order.userId,
      cashierName: order.cashierName,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      quantitySend: order.quantitySend,
      status: order.status,
      storeId: order.storeId,
      clientId: order.clientId,
      customer: order.customer ? {
        id: order.customer.id,
        customerName: order.customer.customerName,
        phoneNumber: order.customer.phoneNumber,
        customerMail: order.customer.customerMail,
        address: order.customer.address,
      } : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Format multiple orders for response
   */
  protected formatOrdersData(orders: any[]): any[] {
    if (!orders || !Array.isArray(orders)) return [];
    
    return orders.map(order => this.formatOrderData(order));
  }
}
