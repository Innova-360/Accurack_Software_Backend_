import { SetMetadata } from '@nestjs/common';
import {
  PermissionResource,
  PermissionAction,
  PermissionScope,
} from '../../permissions/enums/permission.enum';

export const PERMISSIONS_KEY = 'permissions';

export interface PermissionRequirement {
  resource: PermissionResource | string;
  action: PermissionAction | string;
  scope?: PermissionScope;
}

export const RequirePermissions = (
  resource: PermissionResource | string,
  action: PermissionAction | string,
  scope: PermissionScope = PermissionScope.STORE,
) => {
  return SetMetadata(PERMISSIONS_KEY, { resource, action, scope });
};

export const RequireMultiplePermissions = (
  permissions: PermissionRequirement[],
) => {
  return SetMetadata(PERMISSIONS_KEY, permissions);
};

export const RequireGlobalPermission = (
  resource: PermissionResource | string,
  action: PermissionAction | string,
) => {
  return SetMetadata(PERMISSIONS_KEY, {
    resource,
    action,
    scope: PermissionScope.GLOBAL,
  });
};

export const RequireAnyPermission = (
  ...permissions: PermissionRequirement[]
) => {
  return SetMetadata(PERMISSIONS_KEY, { type: 'any', permissions });
};

export const RequireAllPermissions = (
  ...permissions: PermissionRequirement[]
) => {
  return SetMetadata(PERMISSIONS_KEY, { type: 'all', permissions });
};
