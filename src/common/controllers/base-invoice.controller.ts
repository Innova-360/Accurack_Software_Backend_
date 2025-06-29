import { Response } from 'express';
import {
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ResponseService } from '../services/response.service';

export abstract class BaseInvoiceController {
  constructor(protected responseService: ResponseService) {}

  /**
   * Handle standard service operations without cookies
   * Returns raw data and lets the global response interceptor handle formatting
   */
  protected async handleServiceOperation<T>(
    operation: () => Promise<T>,
    successMessage: string,
    successStatus: number = 200,
  ): Promise<T> {
    const result = await operation();
    // The global response interceptor will handle the formatting
    return result;
  }

  /**
   * Centralized error handling for invoice endpoints
   */
  protected handleInvoiceError(error: any, res: Response): Response {
    console.error('Invoice error:', error);
    if (error instanceof UnauthorizedException) {
      return res
        .status(401)
        .json(this.responseService.error(error.message || 'Unauthorized', 401));
    } else if (error instanceof BadRequestException) {
      return res
        .status(400)
        .json(this.responseService.error(error.message || 'Bad request', 400));
    } else {
      return res
        .status(500)
        .json(this.responseService.error('Internal server error', 500));
    }
  }
}
