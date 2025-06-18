# Copilot Instructions for NestJS Backend

## Quick Reference

- Framework: NestJS with TypeScript
- Testing: Jest
- API Style: RESTful
- Architecture: Modular with dependency injection

## Code Generation Preferences

1. Always use TypeScript with proper typing
2. Generate complete CRUD operations when requested
3. Include proper error handling
4. Add appropriate decorators (@Controller, @Injectable, etc.)
5. Include validation DTOs
6. **MANDATORY: Add comprehensive Swagger documentation for every endpoint**
7. **Every endpoint must include @ApiTags, @ApiOperation, @ApiResponse decorators**

## File Templates

When creating new modules, include:

- Module file with proper imports
- Controller with route definitions
- Service with business logic
- DTOs for request/response
- Entity/Model definitions if needed

## Swagger Documentation Requirements

**CRITICAL**: Every new API endpoint MUST include complete Swagger documentation:

### Required Decorators:
- `@ApiTags('module-name')` - Group related endpoints
- `@ApiOperation({ summary: 'Brief description' })` - Describe endpoint purpose
- `@ApiResponse()` - Document all possible HTTP responses (200, 400, 401, 403, 404, 500)
- `@ApiBody()` - Document request body structure
- `@ApiParam()` - Document path parameters
- `@ApiQuery()` - Document query parameters
- `@ApiBearerAuth()` - For protected endpoints requiring JWT

### Example Template:
```typescript
@ApiTags('users')
@ApiOperation({ summary: 'Create a new user', description: 'Creates a new user account' })
@ApiResponse({ status: 201, description: 'User created successfully' })
@ApiResponse({ status: 400, description: 'Invalid input data' })
@ApiResponse({ status: 409, description: 'User already exists' })
@ApiBearerAuth()
@Post('create')
async createUser(@Body() dto: CreateUserDto) { ... }
```

**NO ENDPOINT should be created without proper Swagger documentation!**

## Dependencies to Suggest

- @nestjs/swagger for API documentation
- class-validator and class-transformer for validation
- @nestjs/config for configuration management
- @nestjs/typeorm or @prisma/client for database
- @nestjs/jwt for authentication
- @nestjs/throttler for rate limiting

## Workflow Instructions

**IMPORTANT**: Always provide a detailed plan before making any changes:

1. **Explain the approach**: What will be implemented and why
2. **List files to be created/modified**: Be specific about changes
3. **Ask for confirmation**: Wait for user approval before proceeding
4. **Clarify requirements**: Ask questions if anything is unclear

### Response Format:

```
## Plan
- [What will be done]
- [Files affected]
- [Reasoning]

Please confirm to proceed.
```
