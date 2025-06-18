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
