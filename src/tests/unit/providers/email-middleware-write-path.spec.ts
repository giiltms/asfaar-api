import {
  embassySubmissionEmailMiddleware,
  setMailServiceForEmbassyMiddleware,
} from '@providers/prisma/middlewares/embassy-submission-email.middleware';
import {
  licenseStatusChangeEmailMiddleware,
  setMailServiceForLicenseMiddleware,
} from '@providers/prisma/middlewares/license-status-change-email.middleware';
import {
  paymentEmailMiddleware,
  setMailServiceForPaymentMiddleware,
} from '@providers/prisma/middlewares/payment-email.middleware';

/**
 * These middlewares all shared one defect: the mutating next() sat inside a try
 * whose catch fell through to a second next() at the end of the function. A
 * write that failed mid-flight was therefore retried, and the caller saw the
 * retry's success - a failed write reported as a successful one.
 *
 * The contract asserted here is the same for each: next() runs exactly once on
 * every path, a failed pre-check read still lets the write through (losing only
 * the notification), and a failed write surfaces to the caller untouched.
 */
const flushAsyncSend = () =>
  new Promise((resolve) => setImmediate(resolve as any));

interface Scenario {
  name: string;
  build: (client: any) => any;
  delegate: string;
  /** A write that should trigger a notification. */
  params: any;
  /** Row state before the write, for a genuine transition. */
  currentRow: Record<string, unknown>;
  /** Row state that means "nothing changed". */
  unchangedRow: Record<string, unknown>;
  /** A write on the same model that this middleware should ignore. */
  ignoredParams: any;
  /** Whether the middleware dispatches a lookup for the notification itself. */
  notifies: boolean;
  /** Injects a mail service, without which the deferred send returns early. */
  injectMail: () => void;
}

const scenarios: Scenario[] = [
  {
    name: 'paymentEmailMiddleware',
    build: (client) => paymentEmailMiddleware(client),
    delegate: 'payment',
    params: {
      model: 'Payment',
      action: 'update',
      args: { where: { id: 'pay-1' }, data: { status: 'COMPLETED' } },
    },
    currentRow: { id: 'pay-1', status: 'PENDING' },
    unchangedRow: { id: 'pay-1', status: 'COMPLETED' },
    ignoredParams: {
      model: 'Payment',
      action: 'update',
      args: { where: { id: 'pay-1' }, data: { status: 'FAILED' } },
    },
    // Payment confirmation is dispatched by the reference number middleware,
    // once a reference number exists to put in the email.
    notifies: false,
    injectMail: () => setMailServiceForPaymentMiddleware({} as any),
  },
  {
    name: 'embassySubmissionEmailMiddleware',
    build: (client) => embassySubmissionEmailMiddleware(client),
    delegate: 'formSubmission',
    params: {
      model: 'FormSubmission',
      action: 'update',
      args: { where: { id: 'sub-1' }, data: { status: 'APPROVED' } },
    },
    currentRow: { id: 'sub-1', status: 'SUBMITTED' },
    unchangedRow: { id: 'sub-1', status: 'APPROVED' },
    ignoredParams: {
      model: 'FormSubmission',
      action: 'update',
      args: { where: { id: 'sub-1' }, data: { status: 'REJECTED' } },
    },
    notifies: true,
    injectMail: () => setMailServiceForEmbassyMiddleware({} as any),
  },
  {
    name: 'licenseStatusChangeEmailMiddleware',
    build: (client) => licenseStatusChangeEmailMiddleware(client),
    delegate: 'travelAgentLicense',
    params: {
      model: 'TravelAgentLicense',
      action: 'update',
      args: { where: { id: 'lic-1' }, data: { status: 'SUSPENDED' } },
    },
    currentRow: { id: 'lic-1', status: 'ACTIVE' },
    unchangedRow: { id: 'lic-1', status: 'SUSPENDED' },
    ignoredParams: {
      model: 'TravelAgentLicense',
      action: 'update',
      args: { where: { id: 'lic-1' }, data: { status: 'EXPIRED' } },
    },
    notifies: true,
    injectMail: () => setMailServiceForLicenseMiddleware({} as any),
  },
];

describe.each(scenarios)(
  '$name write path',
  ({
    build,
    delegate,
    params,
    currentRow,
    unchangedRow,
    ignoredParams,
    notifies,
    injectMail,
  }) => {
    let client: any;
    let next: jest.Mock;

    beforeEach(() => {
      injectMail();
      client = { [delegate]: { findUnique: jest.fn() } };
      next = jest.fn().mockResolvedValue({ id: 'row-1' });
    });

    it('ignores models it does not own', async () => {
      const middleware = build(client);

      await middleware(
        { model: 'Post', action: 'update', args: { data: {} } } as any,
        next,
      );

      expect(next).toHaveBeenCalledTimes(1);
      expect(client[delegate].findUnique).not.toHaveBeenCalled();
    });

    it('ignores status changes it does not notify on', async () => {
      const middleware = build(client);

      await middleware(ignoredParams as any, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(client[delegate].findUnique).not.toHaveBeenCalled();
    });

    it('does not act when the status is already the target status', async () => {
      client[delegate].findUnique.mockResolvedValueOnce(unchangedRow);
      const middleware = build(client);

      await middleware(params as any, next);
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
      expect(client[delegate].findUnique).toHaveBeenCalledTimes(1);
    });

    it('performs the write once on a real transition', async () => {
      client[delegate].findUnique.mockResolvedValue(currentRow);
      const middleware = build(client);

      const result = await middleware(params as any, next);

      expect(result).toEqual({ id: 'row-1' });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('still performs the write exactly once when the pre-check read fails', async () => {
      client[delegate].findUnique.mockRejectedValueOnce(new Error('db blip'));
      const middleware = build(client);

      const result = await middleware(params as any, next);
      await flushAsyncSend();

      expect(result).toEqual({ id: 'row-1' });
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('propagates a failed write instead of silently retrying it', async () => {
      client[delegate].findUnique.mockResolvedValue(currentRow);
      next.mockRejectedValue(new Error('connection lost'));
      const middleware = build(client);

      await expect(middleware(params as any, next)).rejects.toThrow(
        'connection lost',
      );
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
    });

    if (notifies) {
      it('dispatches the notification after the write lands', async () => {
        client[delegate].findUnique.mockResolvedValue(currentRow);
        const middleware = build(client);

        await middleware(params as any, next);
        // Nothing dispatched yet: the send is deferred off the write path.
        expect(client[delegate].findUnique).toHaveBeenCalledTimes(1);

        await flushAsyncSend();

        // The deferred send re-reads the row to build the email.
        expect(client[delegate].findUnique).toHaveBeenCalledTimes(2);
      });
    }
  },
);
