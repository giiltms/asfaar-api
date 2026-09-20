import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  hasUnrestrictedAccess,
  resolveAccessibleCenterIds,
  resolveScopedCountry,
} from '@common/access/privileged-scope';
import { Roles } from '@common/constants/roles.constants';

const ACTIVE_COUNTRY = {
  id: 'country-1',
  name: 'Saudi Arabia',
  isoCode2: 'SA',
  isActive: true,
};

const buildClient = (user: any, allCenters: any[] = []) => ({
  user: { findUnique: jest.fn().mockResolvedValue(user) },
  biometricCenter: { findMany: jest.fn().mockResolvedValue(allCenters) },
});

describe('hasUnrestrictedAccess', () => {
  it('recognises a super admin', () => {
    expect(hasUnrestrictedAccess([Roles.SUPER_ADMIN])).toBe(true);
  });

  it('recognises a super admin holding several roles', () => {
    expect(
      hasUnrestrictedAccess([Roles.CENTER_MANAGER, Roles.SUPER_ADMIN]),
    ).toBe(true);
  });

  it('does not treat an ordinary staff role as unrestricted', () => {
    expect(hasUnrestrictedAccess([Roles.CENTER_MANAGER])).toBe(false);
    expect(hasUnrestrictedAccess([Roles.EMBASSY_OFFICER])).toBe(false);
  });

  it('handles a user with no roles at all', () => {
    expect(hasUnrestrictedAccess(null)).toBe(false);
    expect(hasUnrestrictedAccess([])).toBe(false);
  });
});

describe('resolveAccessibleCenterIds', () => {
  it('gives a super admin every active center', async () => {
    const client = buildClient(
      { roles: [Roles.SUPER_ADMIN], biometricCenters: [] },
      [{ id: 'center-1' }, { id: 'center-2' }],
    );

    await expect(
      resolveAccessibleCenterIds(client as any, 'user-1'),
    ).resolves.toEqual(['center-1', 'center-2']);

    // Only active centers - a closed center should not appear in dashboards.
    expect(client.biometricCenter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
  });

  it('gives ordinary staff only their assigned centers', async () => {
    const client = buildClient(
      {
        roles: [Roles.CENTER_MANAGER],
        biometricCenters: [{ id: 'center-1' }],
      },
      [{ id: 'center-1' }, { id: 'center-2' }],
    );

    await expect(
      resolveAccessibleCenterIds(client as any, 'user-1'),
    ).resolves.toEqual(['center-1']);
    expect(client.biometricCenter.findMany).not.toHaveBeenCalled();
  });

  it('returns an empty list for staff with no assigned centers', async () => {
    const client = buildClient({
      roles: [Roles.RECEPTIONIST],
      biometricCenters: [],
    });

    await expect(
      resolveAccessibleCenterIds(client as any, 'user-1'),
    ).resolves.toEqual([]);
  });

  it('rejects an unknown user', async () => {
    const client = buildClient(null);

    await expect(
      resolveAccessibleCenterIds(client as any, 'nobody'),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('resolveScopedCountry', () => {
  it('returns null for a super admin, meaning every country', async () => {
    const client = buildClient({
      roles: [Roles.SUPER_ADMIN],
      country: null,
    });

    await expect(
      resolveScopedCountry(client as any, 'user-1'),
    ).resolves.toBeNull();
  });

  it('returns null for a super admin even when they have a country', async () => {
    const client = buildClient({
      roles: [Roles.SUPER_ADMIN],
      country: ACTIVE_COUNTRY,
    });

    await expect(
      resolveScopedCountry(client as any, 'user-1'),
    ).resolves.toBeNull();
  });

  it('returns the assigned country for an embassy officer', async () => {
    const client = buildClient({
      roles: [Roles.EMBASSY_OFFICER],
      country: ACTIVE_COUNTRY,
    });

    await expect(
      resolveScopedCountry(client as any, 'user-1'),
    ).resolves.toEqual(ACTIVE_COUNTRY);
  });

  it('refuses an embassy officer with no country assigned', async () => {
    const client = buildClient({
      roles: [Roles.EMBASSY_OFFICER],
      country: null,
    });

    await expect(
      resolveScopedCountry(client as any, 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses an embassy officer whose country is inactive', async () => {
    const client = buildClient({
      roles: [Roles.EMBASSY_OFFICER],
      country: { ...ACTIVE_COUNTRY, isActive: false },
    });

    await expect(
      resolveScopedCountry(client as any, 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects an unknown user', async () => {
    const client = buildClient(null);

    await expect(
      resolveScopedCountry(client as any, 'nobody'),
    ).rejects.toThrow(NotFoundException);
  });
});
