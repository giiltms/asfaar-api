import { SetMetadata } from '@nestjs/common';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

// Permission constants
export const NIN_PERMISSIONS = {
  // Basic permissions
  VERIFY_NIN: 'nin:verify',
  VIEW_NIN: 'nin:view',
  VIEW_OWN_NIN: 'nin:view:own',

  // Admin permissions
  VIEW_ALL_NIN: 'nin:view:all',
  DELETE_NIN: 'nin:delete',
  MANAGE_NIN: 'nin:manage',

  // System permissions
  FORCE_VERIFICATION: 'nin:force-verify',
  VIEW_SYSTEM_LOGS: 'nin:logs:view',
  EXPORT_DATA: 'nin:export',
} as const;

export type NinPermission =
  (typeof NIN_PERMISSIONS)[keyof typeof NIN_PERMISSIONS];

// Role-based permissions mapping
export const ROLE_PERMISSIONS = {
  admin: [
    NIN_PERMISSIONS.VERIFY_NIN,
    NIN_PERMISSIONS.VIEW_NIN,
    NIN_PERMISSIONS.VIEW_OWN_NIN,
    NIN_PERMISSIONS.VIEW_ALL_NIN,
    NIN_PERMISSIONS.DELETE_NIN,
    NIN_PERMISSIONS.MANAGE_NIN,
    NIN_PERMISSIONS.FORCE_VERIFICATION,
    NIN_PERMISSIONS.VIEW_SYSTEM_LOGS,
    NIN_PERMISSIONS.EXPORT_DATA,
  ],
  moderator: [
    NIN_PERMISSIONS.VERIFY_NIN,
    NIN_PERMISSIONS.VIEW_NIN,
    NIN_PERMISSIONS.VIEW_ALL_NIN,
    NIN_PERMISSIONS.MANAGE_NIN,
    NIN_PERMISSIONS.VIEW_SYSTEM_LOGS,
  ],
  user: [NIN_PERMISSIONS.VERIFY_NIN, NIN_PERMISSIONS.VIEW_OWN_NIN],
  guest: [], // No permissions for guests
} as const;

export type UserRole = keyof typeof ROLE_PERMISSIONS;

// Metadata key for permissions
export const PERMISSIONS_KEY = 'permissions';

// Decorator to set required permissions
export const RequirePermissions = (...permissions: NinPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Interface for user in request
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  permissions?: NinPermission[];
  isActive?: boolean;
}

// Request interface with user
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class NinPermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      NinPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Check if user is authenticated
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check if user is active
    if (user.isActive === false) {
      throw new ForbiddenException('Account is deactivated');
    }

    // Get user permissions (from user object or derive from role)
    const userPermissions =
      user.permissions || this.getPermissionsFromRole(user.role);

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !userPermissions.includes(permission),
      );

      throw new ForbiddenException(
        `Insufficient permissions. Missing: ${missingPermissions.join(', ')}`,
      );
    }

    return true;
  }

  private getPermissionsFromRole(role: UserRole): NinPermission[] {
    return [...(ROLE_PERMISSIONS[role] || [])];
  }
}

// Resource ownership guard for "own" resources
@Injectable()
export class NinOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Admin and moderator can access all resources
    if (['admin', 'moderator'].includes(user.role)) {
      return true;
    }

    // For regular users, check ownership
    const resourceUserId = request.params?.userId || request.body?.userId;

    if (resourceUserId && resourceUserId !== user.id) {
      throw new ForbiddenException('You can only access your own resources');
    }

    return true;
  }
}

// Combined guard that checks both authentication and permissions
@Injectable()
export class NinAuthGuard implements CanActivate {
  constructor(
    private permissionsGuard: NinPermissionsGuard,
    private ownershipGuard: NinOwnershipGuard,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check permissions
    const hasPermissions = this.permissionsGuard.canActivate(context);

    if (!hasPermissions) {
      return false;
    }

    // Then check ownership if needed
    const needsOwnershipCheck = this.reflector.get<boolean>(
      'checkOwnership',
      context.getHandler(),
    );

    if (needsOwnershipCheck) {
      return this.ownershipGuard.canActivate(context);
    }

    return true;
  }
}

// Decorator to check ownership
export const CheckOwnership = () => SetMetadata('checkOwnership', true);

// Utility functions for permission checking
export class NinPermissionService {
  static hasPermission(
    user: AuthenticatedUser,
    permission: NinPermission,
  ): boolean {
    const userPermissions =
      user.permissions || this.getRolePermissions(user.role);
    return userPermissions.includes(permission);
  }

  static hasAnyPermission(
    user: AuthenticatedUser,
    permissions: NinPermission[],
  ): boolean {
    const userPermissions =
      user.permissions || this.getRolePermissions(user.role);
    return permissions.some((permission) =>
      userPermissions.includes(permission),
    );
  }

  static hasAllPermissions(
    user: AuthenticatedUser,
    permissions: NinPermission[],
  ): boolean {
    const userPermissions =
      user.permissions || this.getRolePermissions(user.role);
    return permissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }

  static getRolePermissions(role: UserRole): NinPermission[] {
    return [...(ROLE_PERMISSIONS[role] || [])];
  }

  static canAccessNinData(
    user: AuthenticatedUser,
    ninUserId?: string,
  ): boolean {
    // Admin and moderator can access all NIN data
    if (['admin', 'moderator'].includes(user.role)) {
      return true;
    }

    // Users can only access their own NIN data
    if (user.role === 'user') {
      return !ninUserId || ninUserId === user.id;
    }

    return false;
  }

  static canPerformAction(
    user: AuthenticatedUser,
    action: NinPermission,
    resourceUserId?: string,
  ): boolean {
    // Check basic permission
    if (!this.hasPermission(user, action)) {
      return false;
    }

    // Check ownership for user-level actions
    if (resourceUserId && user.role === 'user' && resourceUserId !== user.id) {
      return false;
    }

    return true;
  }
}

// Permission validation decorator for methods
export function ValidateNinPermission(permission: NinPermission) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const request = args.find((arg) => arg && arg.user);

      if (request && request.user) {
        const hasPermission = NinPermissionService.hasPermission(
          request.user,
          permission,
        );

        if (!hasPermission) {
          throw new ForbiddenException(`Permission required: ${permission}`);
        }
      }

      return method.apply(this, args);
    };
  };
}
