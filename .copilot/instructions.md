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
6. Add Swagger documentation comments

## File Templates

When creating new modules, include:

- Module file with proper imports
- Controller with route definitions
- Service with business logic
- DTOs for request/response
- Entity/Model definitions if needed

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
