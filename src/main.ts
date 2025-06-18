import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { EnvValidation } from './utils/env-validation';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function bootstrap() {
  // Validate critical environment variables before starting the app
  EnvValidation.validateCriticalEnvVars();

  // Validate optional configurations
  EnvValidation.validateEmailConfig();
  EnvValidation.validateGoogleOAuthConfig();

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); // Ensure /api prefix
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  // app.use(helmet());
  app.enableCors({
    // origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Accurack Software API')
    .setDescription(
      'Comprehensive API documentation for Accurack Software Backend',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://accounts.google.com/o/oauth2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            scopes: {
              openid: 'OpenID Connect',
              profile: 'User profile information',
              email: 'User email address',
            },
          },
        },
      },
      'google-oauth',
    )
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Stores', 'Store management endpoints')
    .addTag('Testing', 'Testing and utility endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/swagger', app, document, {
    customSiteTitle: 'Accurack Software API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2d3748; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  await app.listen(4000);
}
bootstrap();
