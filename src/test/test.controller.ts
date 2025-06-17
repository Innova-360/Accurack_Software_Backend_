import { Controller, Get } from '@nestjs/common';

@Controller('test')
export class TestController {
  @Get('google-auth-flow')
  getGoogleAuthInstructions() {
    return {
      message: 'Google OAuth Testing Instructions',
      steps: [
        '1. Open browser and go to: http://localhost:3000/auth/google',
        '2. You will be redirected to Google sign-in page',
        '3. Sign in with your Google account',
        '4. You will be redirected back with a JWT token',
        '5. Copy the access_token from the response',
        '6. Test protected route: GET http://localhost:3000/auth/profile',
        '7. Add header: Authorization: Bearer YOUR_TOKEN',
      ],
      endpoints: {
        'Start OAuth': 'GET /auth/google',
        'OAuth Callback': 'GET /auth/google/callback (automatic)',
        'Test Protected Route': 'GET /auth/profile (requires JWT token)',
        Logout: 'GET /auth/logout',
      },
    };
  }
}
