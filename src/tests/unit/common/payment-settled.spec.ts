import { isPaymentSettled } from '@common/utils/payment-settled.util';

/** AGIC applicants paid on AGIC and have no ASFAAR payment at all. */
describe('isPaymentSettled', () => {
  it('counts an application that needs no payment as settled', () => {
    expect(isPaymentSettled({ paymentRequired: false, payment: null })).toBe(
      true,
    );
  });

  it('needs a completed payment otherwise', () => {
    expect(
      isPaymentSettled({
        paymentRequired: true,
        payment: { status: 'COMPLETED' },
      }),
    ).toBe(true);
    expect(
      isPaymentSettled({
        paymentRequired: true,
        payment: { status: 'PENDING' },
      }),
    ).toBe(false);
    expect(isPaymentSettled({ paymentRequired: true, payment: null })).toBe(
      false,
    );
    expect(isPaymentSettled(null)).toBe(false);
  });
});
