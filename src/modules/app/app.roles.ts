
export enum Roles {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  USER = 'USER',
  GUEST = 'GUEST',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export const roleHierarchy: Record<Roles, number> = {
  [Roles.SUPER_ADMIN]: 5,
  [Roles.ADMIN]: 4,
  [Roles.MODERATOR]: 3,
  [Roles.USER]: 2,
  [Roles.GUEST]: 1,
};

export const defaultRoles = [Roles.USER];

export const systemRoles = [Roles.SUPER_ADMIN, Roles.ADMIN];
export const publicRoles = [Roles.USER, Roles.GUEST];
export const staffRoles = [Roles.ADMIN, Roles.MODERATOR];
