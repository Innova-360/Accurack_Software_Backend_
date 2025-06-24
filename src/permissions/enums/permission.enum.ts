export enum PermissionResource {
  // Core Resources
  STORE = 'store',
  INVENTORY = 'inventory',
  PRODUCT = 'product',
  SUPPLIER = 'supplier',
  CUSTOMER = 'customer',
  ORDER = 'order',
  USER = 'user',
  REPORT = 'report',
  SETTING = 'setting',
  TRANSACTION = 'transaction',
  CATEGORY = 'category',
  BRAND = 'brand',

  // System Resources
  DASHBOARD = 'dashboard',
  ANALYTICS = 'analytics',
  BACKUP = 'backup',
  AUDIT = 'audit',
  INVITATION = 'invitation',
  PERMISSION = 'permission',
  TENANT = 'tenant',
}

export enum PermissionAction {
  // Basic CRUD
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',

  // Extended Actions
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  REJECT = 'reject',
  ASSIGN = 'assign',
  TRANSFER = 'transfer',

  // Inventory Actions
  ADJUST_STOCK = 'adjust_stock',
  TRANSFER_STOCK = 'transfer_stock',

  // Order Actions
  FULFILL_ORDER = 'fulfill_order',
  CANCEL_ORDER = 'cancel_order',
  REFUND_ORDER = 'refund_order',

  // User Actions
  INVITE = 'invite',
  DEACTIVATE = 'deactivate',
  RESET_PASSWORD = 'reset_password',
  MANAGE_PERMISSIONS = 'manage_permissions',

  // Special Actions
  VIEW_REPORTS = 'view_reports',
  GENERATE_REPORTS = 'generate_reports',
  CONFIGURE = 'configure',
  BACKUP_RESTORE = 'backup_restore',
  VIEW_AUDIT = 'view_audit',
}

export enum PermissionScope {
  GLOBAL = 'global',
  STORE = 'store',
  RESOURCE = 'resource',
}

export interface PermissionDefinition {
  resource: PermissionResource;
  action: PermissionAction;
  scope?: PermissionScope;
  storeId?: string;
  resourceId?: string;
  conditions?: Record<string, any>;
}

// Default role templates
export const DEFAULT_ROLE_TEMPLATES = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    description: 'Full system access across all stores',
    permissions: [
      { resource: '*', action: '*', scope: PermissionScope.GLOBAL },
    ],
    isDefault: false,
    priority: 100,
  },

  STORE_OWNER: {
    name: 'Store Owner',
    description: 'Full access to owned stores',
    permissions: [
      {
        resource: PermissionResource.STORE,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.STORE,
        action: PermissionAction.UPDATE,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.INVENTORY,
        action: '*',
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.PRODUCT,
        action: '*',
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.SUPPLIER,
        action: '*',
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.USER,
        action: PermissionAction.MANAGE_PERMISSIONS,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.REPORT,
        action: PermissionAction.VIEW_REPORTS,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.CUSTOMER,
        action: '*',
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.ORDER,
        action: '*',
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.TRANSACTION,
        action: '*',
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.CATEGORY,
        action: '*',
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.BRAND,
        action: '*',
        scope: PermissionScope.STORE,
      },
    ],
    isDefault: false,
    priority: 90,
  },

  STORE_MANAGER: {
    name: 'Store Manager',
    description: 'Operational management of store',
    permissions: [
      {
        resource: PermissionResource.STORE,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.INVENTORY,
        action: PermissionAction.CREATE,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.INVENTORY,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.INVENTORY,
        action: PermissionAction.UPDATE,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.INVENTORY,
        action: PermissionAction.ADJUST_STOCK,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.PRODUCT,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.PRODUCT,
        action: PermissionAction.UPDATE,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.SUPPLIER,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.ORDER,
        action: '*',
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.CUSTOMER,
        action: '*',
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.REPORT,
        action: PermissionAction.VIEW_REPORTS,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.DASHBOARD,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
    ],
    isDefault: false,
    priority: 70,
  },

  INVENTORY_CLERK: {
    name: 'Inventory Clerk',
    description: 'Inventory and product management',
    permissions: [
      {
        resource: PermissionResource.INVENTORY,
        action: PermissionAction.CREATE,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.INVENTORY,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.INVENTORY,
        action: PermissionAction.UPDATE,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.INVENTORY,
        action: PermissionAction.ADJUST_STOCK,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.PRODUCT,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.PRODUCT,
        action: PermissionAction.UPDATE,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.SUPPLIER,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.DASHBOARD,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
    ],
    isDefault: true, // Default role for new users
    priority: 50,
  },

  SALES_PERSON: {
    name: 'Sales Person',
    description: 'Customer and sales management',
    permissions: [
      {
        resource: PermissionResource.CUSTOMER,
        action: PermissionAction.CREATE,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.CUSTOMER,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.CUSTOMER,
        action: PermissionAction.UPDATE,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.ORDER,
        action: PermissionAction.CREATE,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.ORDER,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.ORDER,
        action: PermissionAction.UPDATE,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.INVENTORY,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.PRODUCT,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.TRANSACTION,
        action: PermissionAction.CREATE,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.TRANSACTION,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.DASHBOARD,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
    ],
    isDefault: false,
    priority: 40,
  },

  READ_ONLY_USER: {
    name: 'Read Only User',
    description: 'View-only access to store data',
    permissions: [
      {
        resource: PermissionResource.INVENTORY,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.PRODUCT,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.CUSTOMER,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.ORDER,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
      {
        resource: PermissionResource.DASHBOARD,
        action: PermissionAction.READ,
        scope: PermissionScope.STORE,
      },
    ],
    isDefault: false,
    priority: 10,
  },
};

// Permission combinations for easy assignment
export const PERMISSION_COMBINATIONS = {
  FULL_ACCESS: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
  ],
  READ_ONLY: [PermissionAction.READ],
  READ_WRITE: [
    PermissionAction.READ,
    PermissionAction.CREATE,
    PermissionAction.UPDATE,
  ],
  MANAGE: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.ASSIGN,
  ],
};

// Resource-action mappings for validation
export const RESOURCE_PERMISSIONS = {
  [PermissionResource.USER]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.INVITE,
    PermissionAction.DEACTIVATE,
    PermissionAction.RESET_PASSWORD,
    PermissionAction.MANAGE_PERMISSIONS,
  ],

  [PermissionResource.STORE]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.CONFIGURE,
  ],

  [PermissionResource.PRODUCT]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.IMPORT,
    PermissionAction.EXPORT,
  ],

  [PermissionResource.INVENTORY]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.ADJUST_STOCK,
    PermissionAction.TRANSFER_STOCK,
    PermissionAction.IMPORT,
    PermissionAction.EXPORT,
  ],

  [PermissionResource.ORDER]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.FULFILL_ORDER,
    PermissionAction.CANCEL_ORDER,
    PermissionAction.REFUND_ORDER,
    PermissionAction.EXPORT,
  ],

  [PermissionResource.CUSTOMER]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.EXPORT,
  ],

  [PermissionResource.SUPPLIER]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.EXPORT,
  ],

  [PermissionResource.TRANSACTION]: [
    PermissionAction.CREATE,
    PermissionAction.READ,
    PermissionAction.UPDATE,
    PermissionAction.DELETE,
    PermissionAction.EXPORT,
  ],

  [PermissionResource.REPORT]: [
    PermissionAction.READ,
    PermissionAction.VIEW_REPORTS,
    PermissionAction.GENERATE_REPORTS,
    PermissionAction.EXPORT,
  ],

  [PermissionResource.AUDIT]: [
    PermissionAction.READ,
    PermissionAction.VIEW_AUDIT,
    PermissionAction.EXPORT,
  ],

  [PermissionResource.DASHBOARD]: [PermissionAction.READ],

  [PermissionResource.ANALYTICS]: [
    PermissionAction.READ,
    PermissionAction.VIEW_REPORTS,
  ],
};
