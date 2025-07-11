import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

export interface PrismaErrorContext {
  operation: string;
  entity?: string;
  entityId?: string;
  userId?: string;
  additionalInfo?: Record<string, any>;
}

export class PrismaErrorHandler {
  /**
   * Handle Prisma errors with detailed logging and user-friendly messages
   */
  static handle(error: any, context: PrismaErrorContext): never {
    // Enhanced logging with context
    console.error('Prisma operation error:', {
      operation: context.operation,
      entity: context.entity,
      entityId: context.entityId,
      userId: context.userId,
      error: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
      additionalInfo: context.additionalInfo,
    });

    // Handle specific Prisma error codes
    if (error.code) {
      return this.handlePrismaError(error, context);
    }

    // Handle NestJS exceptions
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException ||
      error instanceof ForbiddenException ||
      error instanceof ConflictException
    ) {
      throw error;
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      throw new BadRequestException(
        `Validation error: ${error.message}`,
      );
    }

    // Handle connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new InternalServerErrorException(
        'Database connection failed - please try again later',
      );
    }

    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      throw new InternalServerErrorException(
        'Operation timed out - please try again',
      );
    }

    // Generic error handling
    console.error('Unhandled database error:', error);
    throw new InternalServerErrorException(
      `An unexpected error occurred during ${context.operation}. Please try again or contact support.`,
    );
  }

  /**
   * Handle specific Prisma error codes
   */
  private static handlePrismaError(error: any, context: PrismaErrorContext): never {
    const entityName = context.entity || 'record';
    const operation = context.operation;

    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target?.[0] || 'field';
        throw new ConflictException(
          `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} with this ${field} already exists`,
        );

      case 'P2003':
        // Foreign key constraint violation
        return this.handleForeignKeyError(error, context);

      case 'P2025':
        // Record not found
        throw new NotFoundException(
          `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} not found`,
        );

      case 'P2014':
        // Invalid ID provided
        throw new BadRequestException(
          `Invalid ${entityName} ID format`,
        );

      case 'P2011':
        // Null constraint violation
        const nullField = error.meta?.field_name || 'field';
        throw new BadRequestException(
          `Required field '${nullField}' cannot be null`,
        );

      case 'P2012':
        // Missing required value
        const missingField = error.meta?.field_name || 'field';
        throw new BadRequestException(
          `Required field '${missingField}' is missing`,
        );

      case 'P2013':
        // Missing required argument
        const missingArg = error.meta?.argument_name || 'argument';
        throw new BadRequestException(
          `Required argument '${missingArg}' is missing`,
        );

      case 'P2015':
        // Related record not found
        throw new BadRequestException(
          'Related record not found - please check your references',
        );

      case 'P2016':
        // Query interpretation error
        throw new BadRequestException(
          'Invalid query structure - please check your request format',
        );

      case 'P2017':
        // Relation violation
        throw new BadRequestException(
          'Relation constraint violation - please check related records',
        );

      case 'P2018':
        // Connected records not found
        throw new BadRequestException(
          'Connected records not found - please check your references',
        );

      case 'P2019':
        // Input error
        throw new BadRequestException(
          'Invalid input data - please check your request format',
        );

      case 'P2020':
        // Value out of range
        throw new BadRequestException(
          'Value out of valid range - please check your input values',
        );

      case 'P2021':
        // Table does not exist
        throw new InternalServerErrorException(
          'Database table not found - please contact support',
        );

      case 'P2022':
        // Column does not exist
        throw new InternalServerErrorException(
          'Database column not found - please contact support',
        );

      case 'P2023':
        // Column data type mismatch
        throw new BadRequestException(
          'Data type mismatch - please check your input values',
        );

      case 'P2024':
        // Connection error
        throw new InternalServerErrorException(
          'Database connection error - please try again later',
        );

      case 'P2026':
        // Current database provider doesn't support a feature
        throw new InternalServerErrorException(
          'Database feature not supported - please contact support',
        );

      case 'P2027':
        // Multiple errors occurred
        throw new BadRequestException(
          'Multiple validation errors occurred - please check all fields',
        );

      case 'P2030':
        // Fulltext index not found
        throw new BadRequestException(
          'Search index not found - please contact support',
        );

      case 'P2031':
        // MongoDB requires a $ sign
        throw new BadRequestException(
          'Invalid MongoDB query format',
        );

      case 'P2033':
        // Number overflow
        throw new BadRequestException(
          'Number overflow - value is too large',
        );

      case 'P2034':
        // Transaction failed
        throw new InternalServerErrorException(
          'Transaction failed - please try again',
        );

      case 'P2037':
        // Too many database connections
        throw new InternalServerErrorException(
          'Database connection limit reached - please try again later',
        );

      default:
        // Unknown Prisma error
        throw new InternalServerErrorException(
          `Database operation failed: ${error.message}`,
        );
    }
  }

  /**
   * Handle foreign key constraint violations with specific field information
   */
  private static handleForeignKeyError(error: any, context: PrismaErrorContext): never {
    const fieldName = error.meta?.field_name;
    const entityName = context.entity || 'record';

    // Map common foreign key field names to user-friendly messages
    const fieldMessages: Record<string, string> = {
      clientId: 'client',
      storeId: 'store',
      categoryId: 'category',
      supplierId: 'supplier',
      userId: 'user',
      productId: 'product',
      customerId: 'customer',
      businessId: 'business',
      driverId: 'driver',
      validatorId: 'validator',
      fileUploadId: 'file upload',
      taxTypeId: 'tax type',
      taxCodeId: 'tax code',
      taxRateId: 'tax rate',
      regionId: 'region',
      roleTemplateId: 'role template',
      parentId: 'parent',
      replacementProductId: 'replacement product',
    };

    const fieldDisplayName = fieldMessages[fieldName] || fieldName;

    throw new BadRequestException(
      `Invalid ${fieldDisplayName} ID - ${fieldDisplayName} does not exist`,
    );
  }

  /**
   * Create a standardized error context for common operations
   */
  static createContext(
    operation: string,
    entity?: string,
    entityId?: string,
    userId?: string,
    additionalInfo?: Record<string, any>,
  ): PrismaErrorContext {
    return {
      operation,
      entity,
      entityId,
      userId,
      additionalInfo,
    };
  }

  /**
   * Handle errors in a try-catch block with automatic context
   */
  static async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: PrismaErrorContext,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error, context);
    }
  }

  /**
   * Validate and sanitize input data before Prisma operations
   */
  static validateInput(data: any, requiredFields: string[] = []): void {
    // Check for required fields
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        throw new BadRequestException(
          `Required field '${field}' is missing`,
        );
      }
    }

    // Check for invalid data types
    for (const [key, value] of Object.entries(data)) {
      if (value === '') {
        throw new BadRequestException(
          `Field '${key}' cannot be empty`,
        );
      }

      // Check for NaN in numeric fields
      if (typeof value === 'number' && isNaN(value)) {
        throw new BadRequestException(
          `Field '${key}' must be a valid number`,
        );
      }
    }
  }

  /**
   * Log database operations for debugging
   */
  static logOperation(
    operation: string,
    data: any,
    context: PrismaErrorContext,
  ): void {
    console.log('Database operation:', {
      operation,
      entity: context.entity,
      entityId: context.entityId,
      userId: context.userId,
      data: this.sanitizeDataForLogging(data),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Sanitize sensitive data for logging
   */
  private static sanitizeDataForLogging(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'apiKey',
      'secret',
      'key',
    ];

    const sanitized = { ...data };
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
} 