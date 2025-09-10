import { SetMetadata } from '@nestjs/common';
import { Roles as UserRoles } from '../constants/roles.constants';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRoles[]) => SetMetadata(ROLES_KEY, roles);
