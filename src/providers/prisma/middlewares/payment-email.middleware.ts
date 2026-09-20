import { Logger } from '@nestjs/common';
import { Prisma, PaymentStatus } from '@prisma/client';
import { MailService } from '@modules/mail/services/mail.service';

const logger = new Logger('PaymentEmailMiddleware');

/**
 * The slice of a Prisma client this middleware reads through. It is handed the
 * live PrismaService rather than constructing its own client, so notification
 * lookups share the application's connection pool.
 */
export interface PaymentLookupClient {
  payment: {
    findUnique(args: any): Promise<any>;
  };
}

// We'll inject the mail service externally to avoid circular dependencies
let mailService: MailService | null = null;

export function setMailServiceForPaymentMiddleware(service: MailService) {
  mailService = service;
}

export async function sendPaymentConfirmationEmail(
  client: PaymentLookupClient,
  paymentId: string,
): Promise<void> {
  if (!mailService) {
    logger.warn('MailService not available for payment confirmation email');
    return;
  }

  try {
    // Get payment with all related data
    const payment = await client.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        submission: {
          select: {
            id: true,
            referenceNumber: true,
          },
        },
        serviceFees: {
          select: {
            serviceFee: {
              select: {
                feeType: true,
              },
            },
          },
        },
      },
    });

    if (!payment?.user) {
      logger.warn(
        `Cannot send payment confirmation email: missing user data for payment ${paymentId}`,
      );
      return;
    }

    const user = payment.user;
    const submission = payment.submission;

    // Format user name
    const userName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.email.split('@')[0];

    // Format payment date
    const paymentDate = payment.paidAt
      ? payment.paidAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleDateString();

    // Determine payment type from service fees
    const paymentTypes = payment.serviceFees
      .map((sf) => sf.serviceFee.feeType)
      .filter(Boolean);
    const primaryPaymentType =
      paymentTypes.length > 0 ? paymentTypes[0] : 'UNKNOWN';

    // Prepare email data
    const emailData = {
      userName,
      userEmail: user.email,
      referenceNumber: submission?.referenceNumber || 'N/A',
      paymentReference: payment.reference || payment.id,
      transactionId: payment.processorId || payment.id,
      amount: payment.amount,
      currency: payment.currency,
      paymentDate,
      applicationId: submission?.id || payment.id,
      paymentType: primaryPaymentType,
    };

    await mailService.sendPaymentConfirmation(emailData);

    logger.log(
      `Payment confirmation email sent for payment ${paymentId} to ${user.email}`,
    );
  } catch (error) {
    logger.error(
      `Failed to send payment confirmation email for payment ${paymentId}: ${
        (error as Error).message
      }`,
    );
    // Don't throw - this is a non-critical side effect
  }
}

export function paymentEmailMiddleware(
  client: PaymentLookupClient,
): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    if (params.model !== 'Payment' || params.action !== 'update') {
      return next(params);
    }

    const newStatus: PaymentStatus | string | undefined =
      params.args?.data?.status;

    if (newStatus !== PaymentStatus.COMPLETED && newStatus !== 'COMPLETED') {
      return next(params);
    }

    let current: { id: string; status: PaymentStatus } | null = null;

    try {
      // Check whether the status is actually changing.
      current = await client.payment.findUnique({
        where: params.args?.where || {},
        select: { id: true, status: true },
      });
    } catch (error) {
      // The write must still go ahead.
      logger.error(
        `Could not read payment state before update: ${
          (error as Error).message
        }`,
      );
      return next(params);
    }

    if (!current || current.status === PaymentStatus.COMPLETED) {
      return next(params);
    }

    // Deliberately outside the try above: a failed write must surface to the
    // caller, never be swallowed and retried behind their back.
    const result = await next(params);

    // The confirmation email itself is dispatched by the reference number
    // middleware, once a reference number exists to include in it.
    logger.log(
      `Payment ${current.id} marked as completed. Email will be sent after reference number generation.`,
    );

    return result;
  };
}
