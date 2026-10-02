import { PaymentStatus } from '@prisma/client';

interface SubmissionPayment {
  paymentRequired?: boolean | null;
  payment?: { status: PaymentStatus | string } | null;
}

/**
 * Whether nothing is owed on ASFAAR for this application: its payment is
 * complete, or it needs none - an application imported from AGIC was paid
 * for on AGIC and has no ASFAAR payment at all.
 */
export function isPaymentSettled(
  submission?: SubmissionPayment | null,
): boolean {
  if (!submission) return false;
  if (submission.paymentRequired === false) return true;
  return submission.payment?.status === PaymentStatus.COMPLETED;
}
