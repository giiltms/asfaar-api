export enum Roles {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  USER = 'USER',
  GUEST = 'GUEST',
}

export const ROLE_HIERARCHY = {
  [Roles.SUPER_ADMIN]: 5,
  [Roles.ADMIN]: 4,
  [Roles.MODERATOR]: 3,
  [Roles.USER]: 2,
  [Roles.GUEST]: 1,
} as const;

export const DEFAULT_ROLE = Roles.USER;

export const SYSTEM_ROLES = [Roles.SUPER_ADMIN, Roles.ADMIN];
export const STAFF_ROLES = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.MODERATOR];
export const PUBLIC_ROLES = [Roles.USER, Roles.GUEST]; 