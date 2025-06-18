import { Response } from 'express';
import {
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ResponseService } from '../services/response.service';
import { CookieHelper, AuthTokens } from '../utils/cookie.helper';

export abstract class BaseAuthController {
  constructor(protected responseService: ResponseService) {}

  /**
   * Handle authentication operations that require cookie setting
   * Automatically handles errors and sets appropriate HTTP status codes
   */
  protected async handleCookieAuth<T extends AuthTokens>(
    res: Response,
    operation: () => Promise<{ user?: any } & T>,
    successMessage: string = 'Authentication successful',
    successStatus: number = 200,
  ): Promise<Response> {
    try {
      const result = await operation();

      // Set authentication cookies
      CookieHelper.setAuthCookies(res, result);

      // Return success response (exclude tokens from response body for security)
      const {
        accessToken,
        refreshToken,
        access_token,
        refresh_token,
        ...responseData
      } = result;

      return res
        .status(successStatus)
        .json(
          this.responseService.success(
            successMessage,
            responseData,
            successStatus,
          ),
        );
    } catch (error) {
      return this.handleAuthError(error, res);
    }
  }
  /**
   * Handle Google OAuth operations with specific cookie handling
   */
  protected async handleGoogleAuth(
    res: Response,
    operation: () => Promise<any>,
  ): Promise<Response> {
    try {
      const result = await operation();

      // Handle both naming conventions for tokens
      const accessToken = result.access_token || result.accessToken;
      const refreshToken = result.refresh_token || result.refreshToken;

      if (accessToken && refreshToken) {
        // Set Google-specific cookies
        CookieHelper.setGoogleAuthCookies(res, accessToken, refreshToken);
      }

      const responseData = {
        user: result.user,
        redirectTo: process.env.FRONTEND_URL || 'http://localhost:3000',
      };

      return res.json(
        this.responseService.success(
          'Google authentication successful',
          responseData,
          200,
        ),
      );
    } catch (error) {
      return this.handleAuthError(error, res);
    }
  }

  /**
   * Handle logout operations with cookie clearing
   */
  protected handleLogout(res: Response): Response {
    try {
      CookieHelper.clearAuthCookies(res);

      return res.json(
        this.responseService.success('Successfully logged out', null, 200),
      );
    } catch (error) {
      console.error('Logout error:', error);
      return res
        .status(500)
        .json(this.responseService.error('Error during logout', 500));
    }
  }

  /**
   * Handle standard service operations without cookies
   * Lets the global error handler and response interceptor handle the response
   */
  protected async handleServiceOperation<T>(
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
   * Centralized auth error handling with appropriate status codes
   */
  private handleAuthError(error: any, res: Response): Response {
    console.error('Auth error:', error);

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
  /**
   * Extract user data for response (removes sensitive fields)
   */
  protected extractUserData(user: any): any {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      clientId: user.clientId,
      status: user.status,
      ...(user.googleId && { googleId: user.googleId }), // Only include if exists
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
