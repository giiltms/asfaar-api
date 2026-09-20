import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator';
import { Roles as UserRoles } from '../constants/roles.constants';
import { hasUnrestrictedAccess } from '../access/privileged-scope';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoles[]>(Roles, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.roles) {
      return false;
    }

    // Dashboards name only their own role, so a super admin would otherwise be
    // locked out of every one of them. They reach all routes without each
    // controller having to list them.
    if (hasUnrestrictedAccess(user.roles)) {
      return true;
    }

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
