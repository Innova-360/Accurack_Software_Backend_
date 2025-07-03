import { Response } from 'express';

export interface CookieConfig {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'none';
  maxAge?: number;
  path?: string;
}

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
  access_token?: string;
  refresh_token?: string;
}

export class CookieHelper {
  static readonly ACCESS_TOKEN_COOKIE = 'accessToken';
  static readonly REFRESH_TOKEN_COOKIE = 'refreshToken';
  static readonly ACCESS_TOKEN_COOKIE_ALT = 'access_token';
  static readonly REFRESH_TOKEN_COOKIE_ALT = 'refresh_token';

  private static getDefaultConfig(): CookieConfig {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    };
  }

  static setAuthCookies(res: Response, tokens: AuthTokens): void {
    const baseConfig = this.getDefaultConfig();

    // Handle both token naming conventions
    const accessToken = tokens.accessToken || tokens.access_token;
    const refreshToken = tokens.refreshToken || tokens.refresh_token;

    if (accessToken) {
      res.cookie(this.ACCESS_TOKEN_COOKIE, accessToken, {
        ...baseConfig,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      // Also set the alternative name for backward compatibility
      res.cookie(this.ACCESS_TOKEN_COOKIE_ALT, accessToken, {
        ...baseConfig,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
    }

    if (refreshToken) {
      res.cookie(this.REFRESH_TOKEN_COOKIE, refreshToken, {
        ...baseConfig,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Also set the alternative name for backward compatibility
      res.cookie(this.REFRESH_TOKEN_COOKIE_ALT, refreshToken, {
        ...baseConfig,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }
  }

  static clearAuthCookies(res: Response): void {
    const clearConfig: CookieConfig = {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    };

    // Clear all possible cookie names
    res.clearCookie(this.ACCESS_TOKEN_COOKIE, clearConfig);
    res.clearCookie(this.REFRESH_TOKEN_COOKIE, clearConfig);
    res.clearCookie(this.ACCESS_TOKEN_COOKIE_ALT, clearConfig);
    res.clearCookie(this.REFRESH_TOKEN_COOKIE_ALT, clearConfig);
  }

  static setGoogleAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const baseConfig = this.getDefaultConfig();

    res.cookie('access_token', accessToken, {
      ...baseConfig,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      ...baseConfig,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
