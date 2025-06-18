import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Testing')
@Controller('test')
export class TestController {
  @ApiOperation({ summary: 'Get Google OAuth testing instructions' })
  @ApiResponse({
    status: 200,
    description: 'Google OAuth testing instructions and endpoints',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Google OAuth Testing Instructions',
        },
        steps: {
          type: 'array',
          items: { type: 'string' },
          example: [
            '1. Open browser and go to: http://localhost:4000/api/auth/google',
            '2. You will be redirected to Google sign-in page',
            '3. Sign in with your Google account',
            '4. You will be redirected back with a JWT token',
            '5. Copy the access_token from the response',
            '6. Test protected route: GET http://localhost:4000/api/auth/profile',
            '7. Add header: Authorization: Bearer YOUR_TOKEN',
          ],
        },
        endpoints: {
          type: 'object',
          properties: {
            'Start OAuth': { type: 'string', example: 'GET /api/auth/google' },
            'OAuth Callback': {
              type: 'string',
              example: 'GET /api/auth/google/callback (automatic)',
            },
            'Test Protected Route': {
              type: 'string',
              example: 'GET /auth/profile (requires JWT token)',
            },
            Logout: { type: 'string', example: 'GET /auth/logout' },
          },
        },
      },
    },
  })
  @Get('google-auth-flow')
  getGoogleAuthInstructions() {
    return {
      message: 'Google OAuth Testing Instructions',
      steps: [
        '1. Open browser and go to: http://localhost:4000/api/auth/google',
        '2. You will be redirected to Google sign-in page',
        '3. Sign in with your Google account',
        '4. You will be redirected back with a JWT token',
        '5. Copy the access_token from the response',
        '6. Test protected route: GET http://localhost:4000/api/auth/profile',
        '7. Add header: Authorization: Bearer YOUR_TOKEN',
      ],
      endpoints: {
        'Start OAuth': 'GET /api/auth/google',
        'OAuth Callback': 'GET /api/auth/google/callback (automatic)',
        'Test Protected Route': 'GET /auth/profile (requires JWT token)',
        Logout: 'GET /auth/logout',
      },
    };
  }
}
