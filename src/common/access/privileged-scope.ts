import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Roles } from '../constants/roles.constants';

/**
 * Roles that see the whole platform rather than their own slice of it.
 *
 * Most dashboards scope their queries to the centers or country a member of
 * staff is assigned to. Those assignments do not exist for a super admin, so
 * without this the scoped queries fail outright rather than returning
 * everything - which is what a super admin expects to see.
 *
 * ADMIN is included alongside SUPER_ADMIN: admins sit directly below them in
 * the hierarchy and hit exactly the same walls.
 */
export const UNRESTRICTED_ROLES: string[] = [Roles.SUPER_ADMIN, Roles.ADMIN];

export interface ScopedCountry {
  id: string;
  name: string;
  isoCode2: string;
  isActive: boolean;
}

/**
 * The slice of a Prisma client these helpers read through, so they work
 * against PrismaService, a transaction client, or a test double.
 */
export interface ScopeLookupClient {
  user: {
    findUnique(args: any): Promise<any>;
  };
  biometricCenter: {
    findMany(args: any): Promise<any[]>;
  };
}

export function hasUnrestrictedAccess(roles?: string[] | null): boolean {
  return !!roles?.some((role) => UNRESTRICTED_ROLES.includes(role));
}

export interface AccessibleCenter {
  id: string;
  name: string;
}

/**
 * The biometric centers a user may see.
 *
 * Ordinary staff get the centers they are assigned to. Unrestricted roles get
 * every active center, so center-scoped queries keep working unchanged instead
 * of each caller needing to special-case an unscoped query.
 *
 * Returns an empty list for staff with no assignment - it is the caller's
 * decision whether that is an error or simply an empty dashboard.
 */
export const DEFAULT_CENTER_FIELDS = { id: true, name: true };

export async function resolveAccessibleCenters<T = AccessibleCenter>(
  client: ScopeLookupClient,
  userId: string,
  /** Center columns to select; defaults to id and name. */
  select: Record<string, boolean> = DEFAULT_CENTER_FIELDS,
): Promise<T[]> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      roles: true,
      biometricCenters: { select },
    },
  });

  if (!user) {
    throw new NotFoundException(`User with ID ${userId} not found`);
  }

  if (hasUnrestrictedAccess(user.roles)) {
    return client.biometricCenter.findMany({
      where: { isActive: true },
      select,
    }) as Promise<T[]>;
  }

  return (user.biometricCenters || []) as T[];
}

/** Ids of the centers a user may see. See resolveAccessibleCenters. */
export async function resolveAccessibleCenterIds(
  client: ScopeLookupClient,
  userId: string,
): Promise<string[]> {
  const centers = await resolveAccessibleCenters(client, userId);

  return centers.map((center) => center.id);
}

/**
 * The country a user's view is restricted to, or null when they see them all.
 *
 * Null means "do not filter by country" rather than "no country" - callers
 * must omit the filter instead of treating it as empty.
 */
export async function resolveScopedCountry(
  client: ScopeLookupClient,
  userId: string,
): Promise<ScopedCountry | null> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      roles: true,
      country: {
        select: { id: true, name: true, isoCode2: true, isActive: true },
      },
    },
  });

  if (!user) {
    throw new NotFoundException(`User with ID ${userId} not found`);
  }

  if (hasUnrestrictedAccess(user.roles)) {
    return null;
  }

  if (!user.country) {
    throw new ForbiddenException(
      'No country assigned to this account. Please contact an administrator to assign a country.',
    );
  }

  if (!user.country.isActive) {
    throw new ForbiddenException(
      `Assigned country "${user.country.name}" is not active. Please contact an administrator.`,
    );
  }

  return user.country;
}
