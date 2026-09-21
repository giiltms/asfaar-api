import {
  setMailServiceForTravelAgentUpgradeDecisionMiddleware,
  travelAgentUpgradeDecisionEmailMiddleware,
} from '@providers/prisma/middlewares/travel-agent-upgrade-decision-email.middleware';
import {
  setMailServiceForTravelAgentUpgradeMiddleware,
  travelAgentUpgradePaymentEmailMiddleware,
} from '@providers/prisma/middlewares/travel-agent-upgrade-payment-email.middleware';

/**
 * Unlike every other email middleware, these two fired on whatever status the
 * write happened to carry, without checking it was actually changing - so a
 * repeated write of an already-APPROVED application re-sent the decision email.
 * They now only notify on a real transition, and call next() exactly once.
 */
const flushAsyncSend = () =>
  new Promise((resolve) => setImmediate(resolve as any));

interface Scenario {
  name: string;
  build: (client: any) => any;
  injectMail: () => void;
  triggerStatus: string;
  priorStatus: string;
  ignoredStatus: string;
}

const scenarios: Scenario[] = [
  {
    name: 'travelAgentUpgradeDecisionEmailMiddleware',
    build: (client) => travelAgentUpgradeDecisionEmailMiddleware(client),
    injectMail: () =>
      setMailServiceForTravelAgentUpgradeDecisionMiddleware({
        sendTravelAgentUpgradeDecisionNotification: jest.fn(),
      } as any),
    triggerStatus: 'APPROVED',
    priorStatus: 'PENDING_REVIEW',
    ignoredStatus: 'DRAFT',
  },
  {
    name: 'travelAgentUpgradePaymentEmailMiddleware',
    build: (client) => travelAgentUpgradePaymentEmailMiddleware(client),
    injectMail: () =>
      setMailServiceForTravelAgentUpgradeMiddleware({
        sendTravelAgentUpgradePaymentConfirmation: jest.fn(),
      } as any),
    triggerStatus: 'PENDING_REVIEW',
    priorStatus: 'DRAFT',
    ignoredStatus: 'APPROVED',
  },
];

describe.each(scenarios)(
  '$name',
  ({ build, injectMail, triggerStatus, priorStatus, ignoredStatus }) => {
    let client: any;
    let next: jest.Mock;

    const paramsFor = (status: string, where: any = { id: 'app-1' }) => ({
      model: 'TravelAgentUpgradeApplication',
      action: 'update',
      args: { where, data: { status } },
    });

    beforeEach(() => {
      injectMail();
      client = {
        travelAgentUpgradeApplication: { findUnique: jest.fn() },
      };
      next = jest.fn().mockResolvedValue({ id: 'app-1' });
    });

    it('ignores models it does not own', async () => {
      await build(client)(
        { model: 'Payment', action: 'update', args: { data: {} } } as any,
        next,
      );

      expect(next).toHaveBeenCalledTimes(1);
      expect(
        client.travelAgentUpgradeApplication.findUnique,
      ).not.toHaveBeenCalled();
    });

    it('ignores a status it does not notify on', async () => {
      await build(client)(paramsFor(ignoredStatus) as any, next);
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
      expect(
        client.travelAgentUpgradeApplication.findUnique,
      ).not.toHaveBeenCalled();
    });

    it('notifies on a real transition', async () => {
      client.travelAgentUpgradeApplication.findUnique
        .mockResolvedValueOnce({ id: 'app-1', status: priorStatus })
        .mockResolvedValueOnce(null);

      await build(client)(paramsFor(triggerStatus) as any, next);
      // Nothing dispatched yet - the send is deferred off the write path.
      expect(
        client.travelAgentUpgradeApplication.findUnique,
      ).toHaveBeenCalledTimes(1);

      await flushAsyncSend();

      // The deferred send re-reads the application to build the email.
      expect(
        client.travelAgentUpgradeApplication.findUnique,
      ).toHaveBeenCalledTimes(2);
    });

    it('does not re-notify a write that changes nothing', async () => {
      client.travelAgentUpgradeApplication.findUnique.mockResolvedValueOnce({
        id: 'app-1',
        status: triggerStatus,
      });

      await build(client)(paramsFor(triggerStatus) as any, next);
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
      expect(
        client.travelAgentUpgradeApplication.findUnique,
      ).toHaveBeenCalledTimes(1);
    });

    it('skips a write that does not target one application', async () => {
      await build(client)(paramsFor(triggerStatus, { status: 'DRAFT' }) as any, next);
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
      expect(
        client.travelAgentUpgradeApplication.findUnique,
      ).not.toHaveBeenCalled();
    });

    it('still performs the write exactly once when the pre-check read fails', async () => {
      client.travelAgentUpgradeApplication.findUnique.mockRejectedValueOnce(
        new Error('db blip'),
      );

      await expect(
        build(client)(paramsFor(triggerStatus) as any, next),
      ).resolves.toEqual({ id: 'app-1' });
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('propagates a failed write instead of swallowing it', async () => {
      client.travelAgentUpgradeApplication.findUnique.mockResolvedValueOnce({
        id: 'app-1',
        status: priorStatus,
      });
      next.mockRejectedValue(new Error('connection lost'));

      await expect(
        build(client)(paramsFor(triggerStatus) as any, next),
      ).rejects.toThrow('connection lost');

      expect(next).toHaveBeenCalledTimes(1);
    });
  },
);
