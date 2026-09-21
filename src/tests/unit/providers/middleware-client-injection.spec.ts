import {
  biometricCenterNumberMiddleware,
} from '@providers/prisma/middlewares/biometric-center-number.middleware';
import {
  clientAddedNotificationMiddleware,
  setMailServiceForClientAddedMiddleware,
} from '@providers/prisma/middlewares/client-added-notification.middleware';
import {
  setMailServiceForTravelAgentUpgradeDecisionMiddleware,
  travelAgentUpgradeDecisionEmailMiddleware,
} from '@providers/prisma/middlewares/travel-agent-upgrade-decision-email.middleware';
import {
  setMailServiceForTravelAgentUpgradeMiddleware,
  travelAgentUpgradePaymentEmailMiddleware,
} from '@providers/prisma/middlewares/travel-agent-upgrade-payment-email.middleware';

/**
 * These middlewares each used to construct their own PrismaClient, which meant
 * a second connection pool per middleware and no way to inject a double. They
 * now read through the live PrismaService, so the tests below drive them with
 * a stand-in client and assert the lookups really go through it.
 */
const flushAsyncSend = () =>
  new Promise((resolve) => setImmediate(resolve as any));

describe('email middlewares read through the injected client', () => {
  it('client added notification looks the relationship up on the client', async () => {
    setMailServiceForClientAddedMiddleware({
      sendClientAddedNotification: jest.fn().mockResolvedValue(undefined),
    } as any);

    const client = {
      travelAgentClient: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    await clientAddedNotificationMiddleware(client as any)(
      { model: 'TravelAgentClient', action: 'create', args: { data: {} } } as any,
      jest.fn().mockResolvedValue({ id: 'rel-1' }),
    );
    await flushAsyncSend();

    expect(client.travelAgentClient.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rel-1' } }),
    );
  });

  it('upgrade decision email looks the application up on the client', async () => {
    setMailServiceForTravelAgentUpgradeDecisionMiddleware({
      sendTravelAgentUpgradeDecisionNotification: jest.fn(),
    } as any);

    const client = {
      travelAgentUpgradeApplication: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    await travelAgentUpgradeDecisionEmailMiddleware(client as any)(
      {
        model: 'TravelAgentUpgradeApplication',
        action: 'update',
        args: { where: { id: 'app-1' }, data: { status: 'APPROVED' } },
      } as any,
      jest.fn().mockResolvedValue({ id: 'app-1' }),
    );
    await flushAsyncSend();

    expect(
      client.travelAgentUpgradeApplication.findUnique,
    ).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'app-1' } }));
  });

  it('upgrade payment email looks the application up on the client', async () => {
    setMailServiceForTravelAgentUpgradeMiddleware({
      sendTravelAgentUpgradePaymentConfirmation: jest.fn(),
    } as any);

    const client = {
      travelAgentUpgradeApplication: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    await travelAgentUpgradePaymentEmailMiddleware(client as any)(
      {
        model: 'TravelAgentUpgradeApplication',
        action: 'update',
        args: { where: { id: 'app-1' }, data: { status: 'PENDING_REVIEW' } },
      } as any,
      jest.fn().mockResolvedValue({ id: 'app-1' }),
    );
    await flushAsyncSend();

    expect(
      client.travelAgentUpgradeApplication.findUnique,
    ).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'app-1' } }));
  });
});

describe('biometricCenterNumberMiddleware', () => {
  const buildClient = (centerNumbers: string[]) => ({
    biometricCenter: {
      findMany: jest
        .fn()
        .mockResolvedValue(centerNumbers.map((centerNumber) => ({ centerNumber }))),
    },
  });

  it('numbers a new center from the highest existing number, via the client', async () => {
    const client = buildClient(['001', '007', 'ABC']);
    const params: any = {
      model: 'BiometricCenter',
      action: 'create',
      args: { data: { name: 'New Center' } },
    };

    await biometricCenterNumberMiddleware(client as any)(
      params,
      jest.fn().mockResolvedValue({ id: 'center-9' }),
    );

    expect(client.biometricCenter.findMany).toHaveBeenCalled();
    expect(params.args.data.centerNumber).toBe('008');
  });

  it('starts at 001 when no valid number exists yet', async () => {
    const client = buildClient([]);
    const params: any = {
      model: 'BiometricCenter',
      action: 'create',
      args: { data: { name: 'First Center' } },
    };

    await biometricCenterNumberMiddleware(client as any)(
      params,
      jest.fn().mockResolvedValue({ id: 'center-1' }),
    );

    expect(params.args.data.centerNumber).toBe('001');
  });

  it('leaves an explicitly supplied number alone', async () => {
    const client = buildClient(['001']);
    const params: any = {
      model: 'BiometricCenter',
      action: 'create',
      args: { data: { name: 'Named Center', centerNumber: '042' } },
    };

    await biometricCenterNumberMiddleware(client as any)(
      params,
      jest.fn().mockResolvedValue({ id: 'center-2' }),
    );

    expect(client.biometricCenter.findMany).not.toHaveBeenCalled();
    expect(params.args.data.centerNumber).toBe('042');
  });

  it('regenerates and retries once on a center number collision', async () => {
    // This retry is deliberate - two centers created at the same instant can
    // pick the same number, and the unique constraint catches it.
    const client = buildClient(['001']);
    const params: any = {
      model: 'BiometricCenter',
      action: 'create',
      args: { data: { name: 'Racing Center' } },
    };

    const collision: any = new Error('Unique constraint failed');
    collision.code = 'P2002';
    collision.meta = { target: ['centerNumber'] };

    const next = jest
      .fn()
      .mockRejectedValueOnce(collision)
      .mockResolvedValueOnce({ id: 'center-3' });

    await expect(
      biometricCenterNumberMiddleware(client as any)(params, next),
    ).resolves.toEqual({ id: 'center-3' });

    expect(next).toHaveBeenCalledTimes(2);
    expect(client.biometricCenter.findMany).toHaveBeenCalledTimes(2);
  });

  it('propagates an unrelated write failure without retrying', async () => {
    const client = buildClient(['001']);
    const params: any = {
      model: 'BiometricCenter',
      action: 'create',
      args: { data: { name: 'Center' } },
    };

    const next = jest.fn().mockRejectedValue(new Error('connection lost'));

    await expect(
      biometricCenterNumberMiddleware(client as any)(params, next),
    ).rejects.toThrow('connection lost');

    expect(next).toHaveBeenCalledTimes(1);
  });
});
