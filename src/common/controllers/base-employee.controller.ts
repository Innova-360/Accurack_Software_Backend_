import { Response } from 'express';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ResponseService } from '../services/response.service';
import { BaseAuthController } from './base-auth.controller';

export abstract class BaseEmployeeController extends BaseAuthController {
  constructor(protected responseService: ResponseService) {
    super(responseService);
  }

  /**
   * Handle employee creation operations
   * @param operation - The service operation to execute
   * @param successMessage - The success message to return
   */
  protected async handleEmployeeCreation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Employee created successfully',
  ): Promise<T> {
    return this.handleServiceOperation(
      operation,
      successMessage,
      201, // Created status
    );
  }

  /**
   * Handle employee invitation operations
   * @param operation - The service operation to execute
   * @param successMessage - The success message to return
   */
  protected async handleEmployeeInvitation<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Employee invitation sent successfully',
  ): Promise<T> {
    return this.handleServiceOperation(
      operation,
      successMessage,
      201, // Created status
    );
  }

  /**
   * Handle employee update operations
   * @param operation - The service operation to execute
   * @param successMessage - The success message to return
   */
  protected async handleEmployeeUpdate<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Employee updated successfully',
  ): Promise<T> {
    return this.handleServiceOperation(
      operation,
      successMessage,
      200, // OK status
    );
  }

  /**
   * Handle employee permission update operations
   * @param operation - The service operation to execute
   * @param successMessage - The success message to return
   */
  protected async handlePermissionUpdate<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Employee permissions updated successfully',
  ): Promise<T> {
    return this.handleServiceOperation(
      operation,
      successMessage,
      200, // OK status
    );
  }

  /**
   * Handle employee retrieval operations
   * @param operation - The service operation to execute
   * @param successMessage - The success message to return
   */
  protected async handleEmployeeRetrieval<T>(
    operation: () => Promise<T>,
    successMessage: string = 'Employee retrieved successfully',
  ): Promise<T> {
    return this.handleServiceOperation(
      operation,
      successMessage,
      200, // OK status
    );
  }

  /**
   * Extract employee data for response (removes sensitive fields)
   */
  protected extractEmployeeData(employee: any): any {
    return {
      id: employee.id,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      phone: employee.phone,
      position: employee.position,
      department: employee.department,
      role: employee.role,
      status: employee.status,
      clientId: employee.clientId,
      employeeCode: employee.employeeCode,
      joiningDate: employee.joiningDate,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }
}
