# Permissions System Documentation

## Overview

The Accurack permissions system provides a comprehensive, scalable, and flexible role-based access control (RBAC) system. It supports both global and store-specific permissions, dynamic assignment from the frontend, role templates with inheritance, and granular permission checks.

## Key Features

- **Granular Permissions**: Resource-action based permissions (e.g., `STORE.READ`, `PRODUCT.CREATE`)
- **Global & Store-Specific**: Permissions can be global or limited to specific stores
- **Role Templates**: Predefined roles with bulk permission assignment
- **Dynamic Assignment**: Frontend can assign/revoke permissions via API
- **Inheritance**: Role templates can inherit from other templates
- **Audit Logging**: Track permission changes and usage
- **Performance Optimized**: Cached permission checks with Redis integration
- **Guard Protection**: Automatic endpoint protection with decorators

## Architecture

### Database Models

#### Permission Model

```typescript
model Permission {
  id         String   @id @default(cuid())
  userId     String
  storeId    String?  // Optional for global permissions
  resource   String   // e.g., 'store', 'product', 'inventory'
  action     String   // e.g., 'create', 'read', 'update', 'delete'
  resourceId String?  // Optional for resource-specific permissions
  granted    Boolean  @default(true)
  conditions Json?    // Optional conditions for permission
  expiresAt  DateTime?
  grantedBy  String
  grantedAt  DateTime @default(now())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user  Users   @relation(fields: [userId], references: [id], onDelete: Cascade)
  store Stores? @relation(fields: [storeId], references: [id], onDelete: Cascade)

  @@unique([userId, storeId, resource, action, resourceId])
}
```

#### RoleTemplate Model

```typescript
model RoleTemplate {
  id          String   @id @default(cuid())
  name        String   @unique
  description String
  permissions Json     // Array of {resource, action} objects
  inheritsFrom String? // ID of parent role template
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  priority    Int      @default(0)
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userRoles UserRole[]
}
```

#### UserRole Model

```typescript
model UserRole {
  id             String   @id @default(cuid())
  userId         String
  roleTemplateId String
  storeId        String?  // Optional for global roles
  isActive       Boolean  @default(true)
  assignedBy     String
  assignedAt     DateTime @default(now())

  user         Users        @relation(fields: [userId], references: [id], onDelete: Cascade)
  roleTemplate RoleTemplate @relation(fields: [roleTemplateId], references: [id], onDelete: Cascade)
  store        Stores?      @relation(fields: [storeId], references: [id], onDelete: Cascade)

  @@unique([userId, roleTemplateId, storeId])
}
```

## Permission Resources & Actions

### Available Resources

- `STORE` - Store management
- `INVENTORY` - Inventory operations
- `PRODUCT` - Product management
- `SUPPLIER` - Supplier management
- `CUSTOMER` - Customer management
- `ORDER` - Order processing
- `USER` - User management
- `REPORT` - Report generation
- `SETTING` - System settings
- `TRANSACTION` - Transaction management
- `CATEGORY` - Category management
- `BRAND` - Brand management
- `DASHBOARD` - Dashboard access
- `ANALYTICS` - Analytics access
- `BACKUP` - Backup operations
- `AUDIT` - Audit log access
- `INVITATION` - User invitations
- `PERMISSION` - Permission management

### Available Actions

- `CREATE` - Create new resources
- `READ` - Read/view resources
- `UPDATE` - Update existing resources
- `DELETE` - Delete resources
- `EXPORT` - Export data
- `IMPORT` - Import data
- `APPROVE` - Approve actions
- `REJECT` - Reject actions
- `ASSIGN` - Assign resources
- `TRANSFER` - Transfer resources
- `ADJUST_STOCK` - Adjust inventory stock
- `TRANSFER_STOCK` - Transfer stock between stores
- `FULFILL_ORDER` - Fulfill orders
- `CANCEL_ORDER` - Cancel orders
- `REFUND_ORDER` - Process refunds
- `INVITE` - Invite users

## Default Role Templates

### Super Admin

- All permissions across all resources
- System-wide access
- Cannot be deleted or modified

### Admin

- Full store management
- User management within stores
- Inventory and product management
- Order processing

### Manager

- Store operations
- Inventory management
- Basic reporting
- Customer management

### Employee

- Basic product access
- Order fulfillment
- Customer service
- Limited reporting

### Viewer

- Read-only access
- Basic dashboard
- Limited reports

## Usage Examples

### 1. Protecting Controller Endpoints

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { PermissionEndpoint } from '../common/decorators/permission-endpoint.decorator';
import {
  PermissionResource,
  PermissionAction,
} from '../permissions/enums/permission.enum';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductController {
  @PermissionEndpoint.ReadResource('products', 'Get all products')
  @RequirePermissions(PermissionResource.PRODUCT, PermissionAction.READ)
  @Get()
  async findAll() {
    // This endpoint requires PRODUCT.READ permission
    return { message: 'Products retrieved' };
  }

  @PermissionEndpoint.CreateResource(
    'product',
    'Create new product',
    CreateProductDto,
  )
  @RequirePermissions(PermissionResource.PRODUCT, PermissionAction.CREATE)
  @Post()
  async create(@Body() dto: CreateProductDto) {
    // This endpoint requires PRODUCT.CREATE permission
    return { message: 'Product created' };
  }
}
```

### 2. Manual Permission Checking in Services

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PermissionsService } from '../permissions/permissions.service';
import {
  PermissionResource,
  PermissionAction,
} from '../permissions/enums/permission.enum';

@Injectable()
export class BusinessLogicService {
  constructor(private permissionsService: PermissionsService) {}

  async performSensitiveOperation(userId: string, storeId?: string) {
    const hasPermission = await this.permissionsService.hasPermission(
      userId,
      PermissionResource.SETTING,
      PermissionAction.UPDATE,
      storeId,
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Proceed with operation
    return { success: true };
  }
}
```

### 3. Assigning Permissions via API

```typescript
// Assign individual permission
await this.permissionsService.assignPermission(
  {
    userId: 'user-123',
    resource: PermissionResource.PRODUCT,
    action: PermissionAction.CREATE,
    storeId: 'store-456', // Optional
    granted: true,
  },
  'admin-user-id',
);

// Assign role template
await this.permissionsService.assignRoleTemplate(
  {
    userIds: ['user-123', 'user-456'],
    roleTemplateId: 'manager-role-id',
    storeId: 'store-789', // Optional
  },
  'admin-user-id',
);
```

## API Endpoints

### Permission Management

#### Get User Permissions

```
GET /api/v1/permissions/users/:userId
```

#### Assign Permission

```
POST /api/v1/permissions/assign
{
  "userId": "user-123",
  "resource": "product",
  "action": "create",
  "storeId": "store-456", // Optional
  "granted": true
}
```

#### Revoke Permission

```
DELETE /api/v1/permissions/revoke
{
  "userId": "user-123",
  "resource": "product",
  "action": "create",
  "storeId": "store-456" // Optional
}
```

#### Bulk Assign Permissions

```
POST /api/v1/permissions/bulk-assign
{
  "userIds": ["user-123", "user-456"],
  "permissions": [
    { "resource": "product", "action": "read" },
    { "resource": "inventory", "action": "read" }
  ],
  "storeId": "store-789" // Optional
}
```

#### Check Permission

```
POST /api/v1/permissions/check
{
  "userId": "user-123",
  "resource": "product",
  "action": "create",
  "storeId": "store-456" // Optional
}
```

### Role Template Management

#### Get All Role Templates

```
GET /api/v1/permissions/role-templates
```

#### Create Role Template

```
POST /api/v1/permissions/role-templates
{
  "name": "Custom Manager",
  "description": "Custom manager role",
  "permissions": [
    { "resource": "product", "action": "read" },
    { "resource": "product", "action": "create" },
    { "resource": "inventory", "action": "read" }
  ],
  "inheritsFrom": "base-role-id", // Optional
  "isDefault": false,
  "priority": 10
}
```

#### Update Role Template

```
PUT /api/v1/permissions/role-templates/:id
{
  "description": "Updated description",
  "permissions": [
    { "resource": "product", "action": "read" },
    { "resource": "product", "action": "update" }
  ]
}
```

#### Assign Role Template

```
POST /api/v1/permissions/role-templates/assign
{
  "userIds": ["user-123", "user-456"],
  "roleTemplateId": "manager-role-id",
  "storeId": "store-789" // Optional
}
```

## Integration Guide

### Step 1: Add Guards to Existing Controllers

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';

@Controller('your-resource')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Add these guards
export class YourController {
  // Your existing methods
}
```

### Step 2: Add Permission Requirements

```typescript
import { RequirePermissions } from '../decorators/permissions.decorator';
import { PermissionResource, PermissionAction } from '../permissions/enums/permission.enum';

@RequirePermissions(PermissionResource.YOUR_RESOURCE, PermissionAction.READ)
@Get()
async findAll() {
  // Your existing logic
}
```

### Step 3: Add Swagger Documentation

```typescript
import { PermissionEndpoint } from '../common/decorators/permission-endpoint.decorator';

@PermissionEndpoint.ReadResource('your-resource', 'Get all your resources')
@RequirePermissions(PermissionResource.YOUR_RESOURCE, PermissionAction.READ)
@Get()
async findAll() {
  // Your existing logic
}
```

### Step 4: Handle Store-Specific Permissions

The system automatically extracts `storeId` from:

- Route parameters: `/:storeId/products`
- Query parameters: `?storeId=123`
- Request body: `{ "storeId": "123", ... }`
- Headers: `X-Store-Id: 123`

## Performance Considerations

- **Caching**: User permissions are cached for 15 minutes
- **Database Indexing**: Unique constraints on permission combinations
- **Bulk Operations**: Use bulk APIs for multiple assignments
- **Role Templates**: Prefer role templates over individual permissions for better performance

## Security Notes

- All permission checks are performed server-side
- Permissions are validated on every request
- Store-specific permissions automatically limit access scope
- Expired permissions are automatically ignored
- Audit trails are maintained for all permission changes

## Troubleshooting

### Permission Denied Errors

1. Check if user has the required permission:

   ```bash
   GET /api/v1/permissions/users/{userId}?storeId={storeId}
   ```

2. Verify the permission exists in the system:

   ```bash
   POST /api/v1/permissions/check
   ```

3. Check role template assignments:
   ```bash
   GET /api/v1/permissions/role-templates
   ```

### Performance Issues

1. Monitor permission cache hit rates
2. Use bulk operations for multiple assignments
3. Consider role templates for common permission sets
4. Review database query performance

## Migration Guide

If migrating from the old permission system:

1. Run database migration to create new tables
2. Update all controllers to use new guards and decorators
3. Create role templates for existing permission groups
4. Migrate existing permissions to new format
5. Test all endpoints with permission requirements

For detailed migration steps, see `MIGRATION.md`.
