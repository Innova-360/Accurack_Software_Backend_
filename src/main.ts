import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { EnvValidation } from './utils/env-validation';

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
    // credentials: true,
  });
  await app.listen(4000);
}
bootstrap();
