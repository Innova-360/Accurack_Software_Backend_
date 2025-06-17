/**
 * Environment variable validation utilities
 * Ensures required environment variables are present and properly configured
 */

export class EnvValidation {
  /**
   * Validates that a required environment variable is present
   * @param key - The environment variable key
   * @param description - Description of what this variable is used for
   * @returns The environment variable value
   * @throws Error if the variable is not defined
   */
  static requireEnvVar(key: string, description?: string): string {
    const value = process.env[key];
    if (!value) {
      const errorMessage = description
        ? `${key} environment variable is required for ${description} but is not defined`
        : `${key} environment variable is required but is not defined`;
      throw new Error(errorMessage);
    }
    return value;
  }

  /**
   * Gets an environment variable with a default value
   * @param key - The environment variable key
   * @param defaultValue - The default value if not present
   * @param warnIfMissing - Whether to log a warning if the variable is missing
   * @returns The environment variable value or default
   */
  static getEnvVar(
    key: string,
    defaultValue: string,
    warnIfMissing = false,
  ): string {
    const value = process.env[key];
    if (!value) {
      if (warnIfMissing) {
        console.warn(
          `Warning: ${key} environment variable not set, using default value`,
        );
      }
      return defaultValue;
    }
    return value;
  }
  /**
   * Validates all critical environment variables at startup
   * Call this in main.ts to ensure all required vars are present
   */
  static validateCriticalEnvVars(): void {
    try {
      this.requireEnvVar('JWT_SECRET', 'JWT token signing and verification');

      // Validate database URL if using Prisma
      this.requireEnvVar('DATABASE_URL', 'database connection');

      console.log(
        '✅ All critical environment variables are properly configured',
      );
    } catch (error) {
      console.error('❌ Environment validation failed:', error.message);
      console.error(
        'Please check your .env file and ensure all required variables are set',
      );
      process.exit(1);
    }
  }

  /**
   * Validates Google OAuth configuration
   * Returns whether Google OAuth is properly configured
   */
  static validateGoogleOAuthConfig(): boolean {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn(
        '⚠️  Google OAuth configuration incomplete. Google login will not work.',
      );
      console.warn(
        'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file',
      );
      return false;
    }

    console.log('✅ Google OAuth configuration is complete');
    return true;
  }

  /**
   * Validates optional email configuration
   * Returns whether email is properly configured
   */
  static validateEmailConfig(): boolean {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn(
        '⚠️  Email configuration incomplete. Email functionality may not work properly.',
      );
      console.warn(
        'Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in your .env file',
      );
      return false;
    }

    console.log('✅ Email configuration is complete');
    return true;
  }
}
