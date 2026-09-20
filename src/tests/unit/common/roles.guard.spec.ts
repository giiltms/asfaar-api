import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/constants/roles.constants';

const buildContext = (user: any): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext);

const buildGuard = (requiredRoles?: Roles[]) => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;

  return new RolesGuard(reflector);
};

describe('RolesGuard', () => {
  it('allows a route that declares no roles', () => {
    expect(
      buildGuard(undefined).canActivate(
        buildContext({ id: 'u1', roles: [Roles.APPLICANT] }),
      ),
    ).toBe(true);
  });

  it('allows a user holding one of the required roles', () => {
    expect(
      buildGuard([Roles.AUTHORITY]).canActivate(
        buildContext({ id: 'u1', roles: [Roles.AUTHORITY] }),
      ),
    ).toBe(true);
  });

  it('denies a user holding none of the required roles', () => {
    expect(
      buildGuard([Roles.AUTHORITY]).canActivate(
        buildContext({ id: 'u1', roles: [Roles.RECEPTIONIST] }),
      ),
    ).toBe(false);
  });

  it('allows a super admin onto a route they were not listed on', () => {
    // Dashboards name their own role explicitly - the authority dashboard
    // lists AUTHORITY alone. A super admin is meant to reach all of them
    // without every controller having to name them.
    expect(
      buildGuard([Roles.AUTHORITY]).canActivate(
        buildContext({ id: 'u1', roles: [Roles.SUPER_ADMIN] }),
      ),
    ).toBe(true);
  });

  it('denies an unauthenticated request', () => {
    expect(buildGuard([Roles.AUTHORITY]).canActivate(buildContext(null))).toBe(
      false,
    );
  });

  it('denies a user whose roles are missing', () => {
    expect(
      buildGuard([Roles.AUTHORITY]).canActivate(buildContext({ id: 'u1' })),
    ).toBe(false);
  });
});
