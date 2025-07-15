import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { EnvValidation } from './utils/env-validation';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { ResponseInterceptor, GlobalExceptionFilter } from './common';
import { exec } from 'child_process';
import { promisify } from 'util';

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

async function bootstrap() {
  // Validate critical environment variables before starting the app
  EnvValidation.validateCriticalEnvVars();

  // Validate optional configurations
  EnvValidation.validateEmailConfig();
  EnvValidation.validateGoogleOAuthConfig();

  // // Run database migrations before starting the application
  // console.log('🔄 Running database migrations...');
  // try {
  //   const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
  //     timeout: 60000, // 60 seconds timeout
  //     env: { ...process.env }
  //   });
    
  //   if (stderr && !stderr.includes('warnings') && !stderr.includes('info')) {
  //     console.warn('⚠️ Migration warnings:', stderr);
  //   }
    
  //   console.log('✅ Database migrations completed successfully');
  //   if (stdout) {
  //     console.log('📊 Migration output:', stdout.trim());
  //   }
  // } catch (error) {
  //   console.error('❌ Database migration failed:', error.message);
  //   console.error('🔍 Migration error details:', error);
    
  //   // In production, we might want to exit gracefully
  //   if (process.env.NODE_ENV === 'production') {
  //     console.error('🚨 Exiting due to migration failure in production');
  //     process.exit(1);
  //   } else {
  //     console.warn('⚠️ Continuing in development mode despite migration failure');
  //   }
  // }

  const app = await NestFactory.create(AppModule);
  // Add cookie parser middleware
  app.use(cookieParser());
  console.log('Environment Variables:');
  // Apply global filters and interceptors
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  app.setGlobalPrefix('api'); // Ensure /api prefix
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  // app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
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
        name: 'Authorization',
        description: 'Enter your JWT token (without "Bearer " prefix)',
        in: 'header',
      },
      'JWT-auth', // This is the key name used in @ApiBearerAuth('JWT-auth')
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
    .addTag('Tenant', 'Multi-tenant database management endpoints')
    .addTag('Products', 'Product management endpoints')
    .addTag('Suppliers', 'Supplier management endpoints')
    .addTag('Permissions', 'Permission and role management endpoints')
    .addTag('employees', 'Employee management endpoints')
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
