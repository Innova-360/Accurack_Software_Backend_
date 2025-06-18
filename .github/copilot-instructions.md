# GitHub Copilot Instructions for Accurack Backend

## Project Overview

This is a NestJS backend application for Accurack Software. The project uses TypeScript and follows NestJS best practices.

## Code Style & Standards

- Use TypeScript with strict typing
- Follow NestJS conventions and patterns
- Use decorators for controllers, services, and modules
- Implement proper error handling with HTTP exceptions
- Use dependency injection for services
- Follow SOLID principles

## Architecture Guidelines

- Use modular architecture with feature-based modules
- Implement controllers for HTTP endpoints
- Create services for business logic
- Use DTOs for data validation and transformation
- Implement proper middleware for authentication and logging
- Use guards for authorization

## API Patterns

- RESTful API design
- Proper HTTP status codes
- Consistent response formats
- Input validation using class-validator
- **MANDATORY: Swagger documentation for ALL endpoints**
- **Every new endpoint MUST include Swagger decorators (@ApiOperation, @ApiResponse, @ApiTags, etc.)**

## Database & ORM

- If using database, prefer TypeORM or Prisma
- Implement proper entity relationships
- Use migrations for schema changes
- Implement proper database error handling

## Testing

- Write unit tests for services
- Write integration tests for controllers
- Use Jest as testing framework
- Mock external dependencies

## Security

- Implement proper authentication (JWT recommended)
- Use helmet for security headers
- Validate all inputs
- Implement rate limiting
- Use CORS appropriately

## File Structure Preferences

- Group related files in feature modules
- Keep controllers thin, services thick
- Use barrel exports (index.ts files)
- Separate interfaces and types

## Common Patterns to Use

- Use async/await instead of promises
- Implement proper logging
- Use environment variables for configuration
- Implement proper error handling middleware
- Use pipes for data transformation and validation

## Swagger Documentation Requirements

**CRITICAL**: Every API endpoint MUST include comprehensive Swagger documentation:

- Use `@ApiTags()` to group related endpoints
- Use `@ApiOperation()` to describe what the endpoint does
- Use `@ApiResponse()` to document all possible responses (success and error cases)
- Use `@ApiBody()` for request body documentation
- Use `@ApiParam()` for path parameters
- Use `@ApiQuery()` for query parameters
- Use `@ApiBearerAuth()` for protected endpoints
- Include example request/response payloads where applicable
- Document all HTTP status codes that the endpoint can return

### Example:
```typescript
@ApiTags('stores')
@ApiOperation({ summary: 'Create a new store' })
@ApiResponse({ status: 201, description: 'Store created successfully' })
@ApiResponse({ status: 400, description: 'Bad request - validation failed' })
@ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
@ApiBearerAuth()
@Post('create')
async createStore(@Body() dto: CreateStoreDto) { ... }
```

## Workflow Instructions

**IMPORTANT**: When responding to user requests:

1. **Always provide a plan first**: Before making any changes, explain what you will do step by step
2. **List all files that will be created/modified**: Be specific about what changes you plan to make
3. **Wait for explicit approval**: Do not make any changes until the user confirms they want to proceed
4. **Ask for clarification**: If the request is unclear, ask questions before proposing a plan
5. **Explain the reasoning**: Include why you're choosing specific approaches or technologies

### Response Format:

```
## Plan
1. [Step 1 description]
2. [Step 2 description]
3. [Files to be created/modified]

## Questions (if any)
- [Any clarifications needed]

Please confirm if you'd like me to proceed with this plan.
```

**Remember**: Never make code changes without explicit user permission after presenting the plan.

## Global Response System

This project uses a standardized global response system. **ALWAYS** follow these patterns:

### Response Format Standards

All API responses must follow this structure:

```typescript
{
  success: boolean,
  message: string,
  data: any | null,
  status: number,
  timestamp: string
}
```

### Using ResponseService

- Import `ResponseService` from `../common`
- Use `responseService.success()` for successful responses
- Use `responseService.created()` for 201 responses
- Use `responseService.error()` for error responses (rarely needed due to global filter)

### Global Response Interceptor

- All controller methods are automatically wrapped with the standard response format
- Controllers should return data directly or use ResponseService methods
- The global interceptor handles the transformation automatically

## Error Handling Patterns

### In Services (Preferred)

Services should throw appropriate HTTP exceptions:

```typescript
import {
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

// In service methods
if (!user) {
  throw new NotFoundException('User not found');
}

if (!validCredentials) {
  throw new UnauthorizedException('Invalid credentials');
}
```

### In Controllers (Avoid Try-Catch)

- **DON'T** use try-catch blocks in controllers (except for cookie operations)
- Let the global exception filter handle errors
- Controllers should be thin and delegate to services

### Global Exception Filter

- Automatically converts all HTTP exceptions to standard response format
- Handles logging and proper status codes
- No need for manual error formatting in most cases

## API Documentation Patterns

### Use Standardized Decorators

Import and use pre-built decorators instead of manual Swagger documentation:

```typescript
import { AuthEndpoint } from '../common';

// Instead of multiple @ApiOperation, @ApiResponse decorators:
@AuthEndpoint.LoginEndpoint(LoginDto)
@Post('login')
async login(@Body() dto: LoginDto) {
  // implementation
}
```

### Available Decorator Patterns

- `@AuthEndpoint.LoginEndpoint(DtoClass)` - Login endpoints
- `@AuthEndpoint.SignupSuperAdmin(DtoClass)` - Registration endpoints
- `@AuthEndpoint.GetMe()` - User info endpoints
- `@AuthEndpoint.RefreshToken(DtoClass)` - Token refresh
- `@AuthEndpoint.ForgotPassword(DtoClass)` - Password reset request
- `@AuthEndpoint.ResetPassword(DtoClass)` - Password reset
- `@AuthEndpoint.InviteUser(DtoClass)` - User invitations
- `@AuthEndpoint.AcceptInvite(DtoClass)` - Accept invitations
- `@AuthEndpoint.GetPermissions()` - Permission checks

### Creating New Endpoint Decorators

When creating new modules, follow this pattern:

```typescript
export const ModuleEndpoint = {
  CreateItem: (dtoType: any) =>
    applyDecorators(
      ApiOperation({ summary: 'Create new item' }),
      ApiBody({ type: dtoType }),
      ApiResponse({ status: 201, description: 'Item created successfully' }),
      ...standardErrorResponses(),
      Version('1'),
    ),
};
```

## Controller Patterns

### Base Controller Usage

For modules requiring authentication patterns:

```typescript
import { BaseAuthController, ResponseService } from '../common';

export class YourController extends BaseAuthController {
  constructor(
    private yourService: YourService,
    responseService: ResponseService,
  ) {
    super(responseService);
  }
}
```

### Controller Method Patterns

#### Standard API Operations

```typescript
@ModuleEndpoint.CreateItem(CreateItemDto)
@Post()
async createItem(@Body() dto: CreateItemDto) {
  return this.handleServiceOperation(
    () => this.yourService.create(dto),
    'Item created successfully',
    201,
  );
}
```

#### Authentication with Cookies

```typescript
@AuthEndpoint.LoginEndpoint(LoginDto)
@Post('login')
async login(@Body() dto: LoginDto, @Res() res: Response) {
  return this.handleCookieAuth(res, () => this.authService.login(dto));
}
```

#### Standard CRUD Operations

```typescript
// GET all
@Get()
async findAll() {
  return this.handleServiceOperation(
    () => this.service.findAll(),
    'Items retrieved successfully',
  );
}

// GET by ID
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.handleServiceOperation(
    () => this.service.findOne(id),
    'Item retrieved successfully',
  );
}

// UPDATE
@Put(':id')
async update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
  return this.handleServiceOperation(
    () => this.service.update(id, dto),
    'Item updated successfully',
  );
}

// DELETE
@Delete(':id')
async remove(@Param('id') id: string) {
  return this.handleServiceOperation(
    () => this.service.remove(id),
    'Item deleted successfully',
  );
}
```

## Cookie Management

### Using CookieHelper

```typescript
import { CookieHelper } from '../common';

// Set authentication cookies
CookieHelper.setAuthCookies(res, { accessToken, refreshToken });

// Clear authentication cookies
CookieHelper.clearAuthCookies(res);

// Set Google OAuth cookies
CookieHelper.setGoogleAuthCookies(res, accessToken, refreshToken);
```

### Cookie Security Standards

- Always use `httpOnly: true`
- Use `secure: true` in production
- Set appropriate `sameSite` policies
- Set proper `maxAge` for token expiration

## Module Organization

### Common Module Structure

```
src/
  common/                    # Shared utilities
    decorators/             # Reusable decorators
    controllers/            # Base controllers
    services/               # Global services
    utils/                  # Helper utilities
    dto/                    # Shared DTOs
    filters/                # Global filters
    interceptors/           # Global interceptors

  module-name/              # Feature modules
    module-name.controller.ts
    module-name.service.ts
    module-name.module.ts
    dto/                    # Module-specific DTOs
    entities/               # Database entities
```

### Export Patterns

Always use barrel exports in common module:

```typescript
// src/common/index.ts
export * from './services/response.service';
export * from './decorators/auth-endpoint.decorator';
export * from './controllers/base-auth.controller';
export * from './utils/cookie.helper';
// ... other exports
```

## DTO and Validation Patterns

### Standard DTO Structure

```typescript
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName?: string;
}
```

### Response DTOs

Use the global StandardResponseDto:

```typescript
import { StandardResponseDto } from '../common';

// Don't create local response DTOs, use the global one
```

## Code Quality Standards

### What to ALWAYS Do

1. Use the global response system and decorators
2. Throw HTTP exceptions in services, not controllers
3. Use base controllers for common patterns
4. Follow the established decorator patterns
5. Keep controllers thin, services thick
6. Use the CookieHelper for cookie management

### What to NEVER Do

1. Create manual Swagger documentation when decorators exist
2. Use try-catch in controllers (except for cookie operations)
3. Create local response formatting helpers
4. Bypass the global response interceptor
5. Create duplicate error handling patterns
6. Use manual cookie setting when helpers exist

### Performance Considerations

- Use the global interceptors and filters
- Leverage caching where appropriate
- Follow NestJS dependency injection patterns
- Use async/await consistently

## Testing Patterns

### Controller Testing

```typescript
// Mock the service, test the controller logic
const mockService = {
  findAll: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue({}),
};
```

### Service Testing

```typescript
// Test business logic and proper exception throwing
it('should throw NotFoundException when user not found', async () => {
  await expect(service.findOne('invalid-id')).rejects.toThrow(
    NotFoundException,
  );
});
```

**Remember**: When creating new endpoints or modules, always follow these established patterns. The goal is consistency, maintainability, and reducing boilerplate code across the entire application.
